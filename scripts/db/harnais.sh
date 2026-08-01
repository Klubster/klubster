#!/usr/bin/env bash
#
# Le harnais Postgres jetable de Klubster.
#
# Crée un cluster PostgreSQL neuf dans un dossier temporaire, y applique les cales
# Supabase puis TOUTES les migrations dans l'ordre, exécute les tests, et détruit le
# cluster. Aucune base existante n'est touchée, aucun port fixe n'est réservé, aucun
# service n'est laissé derrière.
#
# POURQUOI UN CLUSTER JETABLE PLUTÔT QU'UNE BASE PARTAGÉE
# Un test de RLS qui hérite d'un état laissé par le test précédent ne prouve rien : il
# peut passer parce qu'une ligne traîne, ou échouer pour la même raison. Repartir d'un
# `initdb` garantit que ce qui est testé, ce sont les migrations — et rien d'autre.
#
# POURQUOI UN SOCKET UNIX ET PAS UN PORT TCP
# Deux exécutions simultanées (une locale, une en CI, ou deux onglets) se marcheraient
# dessus sur un port fixe. Le socket vit dans le dossier temporaire du cluster : deux
# harnais ne peuvent pas se rencontrer.
#
# Usage :
#   scripts/db/harnais.sh migrations   applique cales + migrations, garde le cluster
#   scripts/db/harnais.sh test         applique tout puis exécute tests/db/*.sql
#   scripts/db/harnais.sh psql         ouvre une session sur un cluster préparé
#
set -euo pipefail

# LA LOCALE, ET POURQUOI ELLE EST ICI.
# Sur macOS, le terminal exporte souvent `LANG`/`LC_*` vers une locale que la libc du
# postmaster ne sait pas résoudre. PostgreSQL 16 échoue alors au démarrage avec
# « le postmaster est devenu multithreadé lors du démarrage » — un message qui ne dit pas
# du tout qu'il s'agit d'une locale. `C` est disponible partout et suffit : le harnais ne
# teste ni tri linguistique ni formats localisés.
export LC_ALL=C
export LANG=C

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RACINE"

# ——— Trouver PostgreSQL ————————————————————————————————————————————————————————
# `initdb` et `pg_ctl` ne sont pas dans le PATH d'une installation Homebrew versionnée.
for prefixe in \
  "${PGBIN:-}" \
  /usr/local/opt/postgresql@16/bin \
  /opt/homebrew/opt/postgresql@16/bin \
  /usr/local/opt/postgresql@15/bin \
  /opt/homebrew/opt/postgresql@15/bin \
  /usr/lib/postgresql/16/bin \
  /usr/lib/postgresql/15/bin
do
  if [ -n "$prefixe" ] && [ -x "$prefixe/initdb" ]; then PGBIN="$prefixe"; break; fi
done
if [ -z "${PGBIN:-}" ] && command -v initdb > /dev/null 2>&1; then
  PGBIN="$(dirname "$(command -v initdb)")"
fi
if [ -z "${PGBIN:-}" ]; then
  echo "ÉCHEC — PostgreSQL introuvable." >&2
  echo "  macOS  : brew install postgresql@16" >&2
  echo "  Debian : apt-get install postgresql-16" >&2
  echo "  Ou posez PGBIN sur le dossier contenant initdb." >&2
  exit 1
fi
echo "postgres : $("$PGBIN/postgres" --version)"

# ——— Un cluster neuf, détruit à la sortie ——————————————————————————————————————
CLUSTER="$(mktemp -d "${TMPDIR:-/tmp}/klubster-db-XXXXXX")"
export PGHOST="$CLUSTER"
export PGDATABASE=klubster_test
export PGUSER="${USER:-postgres}"

nettoyer() {
  local code=$?
  if [ -d "$CLUSTER/data" ]; then
    "$PGBIN/pg_ctl" -D "$CLUSTER/data" -s -m immediate stop > /dev/null 2>&1 || true
  fi
  # `KLB_GARDER_CLUSTER=1` pour inspecter après un échec — sinon rien ne survit.
  if [ "${KLB_GARDER_CLUSTER:-0}" = "1" ]; then
    echo "cluster conservé : $CLUSTER"
  else
    rm -rf "$CLUSTER"
  fi
  exit $code
}
trap nettoyer EXIT INT TERM

echo "cluster  : $CLUSTER"
"$PGBIN/initdb" -D "$CLUSTER/data" -U "$PGUSER" --auth=trust --no-sync -E UTF8 > "$CLUSTER/initdb.log" 2>&1 \
  || { echo "ÉCHEC initdb :"; tail -20 "$CLUSTER/initdb.log"; exit 1; }

"$PGBIN/pg_ctl" -D "$CLUSTER/data" -l "$CLUSTER/postgres.log" \
  -o "-k '$CLUSTER' -h '' -c fsync=off -c full_page_writes=off -c synchronous_commit=off" \
  -w start > /dev/null 2>&1 \
  || { echo "ÉCHEC démarrage :"; tail -20 "$CLUSTER/postgres.log"; exit 1; }

"$PGBIN/createdb" "$PGDATABASE"

psql_strict() { "$PGBIN/psql" -v ON_ERROR_STOP=1 --quiet --no-psqlrc "$@"; }

# ——— Cales, puis migrations dans l'ordre ———————————————————————————————————————
echo "cales    : scripts/db/00-cales-supabase.sql"
psql_strict -f scripts/db/00-cales-supabase.sql > /dev/null

echo "migrations :"
compte=0
for f in $(ls supabase/migrations/*.sql | sort); do
  printf '  %-58s' "$(basename "$f")"
  if psql_strict -f "$f" > "$CLUSTER/last.log" 2>&1; then
    echo "ok"
    compte=$((compte + 1))
  else
    echo "ÉCHEC"
    echo "── erreur ──────────────────────────────────────────────"
    tail -25 "$CLUSTER/last.log"
    exit 1
  fi
done
echo "  $compte migrations appliquées"

case "${1:-test}" in
  migrations)
    echo "OK — chaîne de migrations complète."
    ;;
  psql)
    "$PGBIN/psql"
    ;;
  test)
    echo "tests :"
    echec=0
    for t in $(ls tests/db/*.sql 2>/dev/null | sort); do
      printf '  %-58s' "$(basename "$t")"
      if psql_strict -f "$t" > "$CLUSTER/test.log" 2>&1; then
        echo "ok"
      else
        echo "ÉCHEC"
        echo "── erreur ──────────────────────────────────────────────"
        grep -vE "^(NOTICE|DETAIL|CONTEXT|HINT)" "$CLUSTER/test.log" | tail -25
        echec=1
      fi
    done
    [ "$echec" = "0" ] || { echo "AU MOINS UN TEST A ÉCHOUÉ"; exit 1; }
    echo "TOUS LES TESTS PASSENT."
    ;;
  *)
    echo "usage : $0 [migrations|test|psql]" >&2
    exit 2
    ;;
esac
