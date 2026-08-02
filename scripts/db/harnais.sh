#!/usr/bin/env bash
#
# Le harnais Postgres jetable de Klubster.
#
# Crée un cluster PostgreSQL neuf dans un dossier temporaire, y applique les cales
# Supabase, puis les migrations dans leur ordre exact — en intercalant les prérequis de
# `scripts/db/bootstrap/` aux points d'insertion que portent leurs noms —, vérifie que
# plus aucun prérequis ne subsiste, exécute les tests, et détruit le cluster. Aucune base
# existante n'est touchée, aucun port fixe n'est réservé, aucun service n'est laissé
# derrière.
#
# ═══ CE QUE LE BOOTSTRAP EST, ET CE QU'IL N'EST PAS ══════════════════════════════
#
# `scripts/db/bootstrap/` contient des objets que les migrations UTILISENT avant de les
# CRÉER. Sans eux, la chaîne s'arrête à `0003`. Ce ne sont PAS des migrations : ils ne
# figurent pas dans l'historique de production, ils ne sont pas connus de
# `supabase_migrations.schema_migrations`, et les appliquer sur une base réelle
# REMPLACERAIT DES FONCTIONS VIVANTES PAR DES CORPS MINIMAUX — `current_org_id()` rendant
# `null`, toutes les RLS aveugles, tous les webhooks Stripe inertes.
#
# C'est pour cela que `garde_bootstrap()` ci-dessous pose SIX conditions avant d'appliquer
# le moindre de ces fichiers, et non une seule. Un garde-fou unique se contourne par
# accident ; six conditions cumulatives, dont deux portent sur l'identité physique du
# serveur, ne se réunissent que sur un cluster qu'on vient de créer soi-même.
#
# POURQUOI UN CLUSTER JETABLE PLUTÔT QU'UNE BASE PARTAGÉE
# Un test de RLS qui hérite d'un état laissé par le test précédent ne prouve rien : il
# peut passer parce qu'une ligne traîne, ou échouer pour la même raison. Repartir d'un
# `initdb` garantit que ce qui est testé, ce sont les migrations — et rien d'autre.
#
# POURQUOI UN SOCKET UNIX ET PAS UN PORT TCP
# Deux exécutions simultanées (une locale, une en CI, ou deux onglets) se marcheraient
# dessus sur un port fixe. Le socket vit dans le dossier temporaire du cluster : deux
# harnais ne peuvent pas se rencontrer. Accessoirement, un serveur joignable uniquement
# par un socket privé ne peut pas être une base Supabase distante — c'est l'un des six
# garde-fous.
#
# Usage :
#   scripts/db/harnais.sh migrations   cales + bootstrap + migrations + assertions
#   scripts/db/harnais.sh test         idem, puis exécute tests/db/*.sql
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

# LE DRAPEAU DU HARNAIS. Il n'est posé QUE par ce script, APRÈS avoir créé son propre
# cluster. Un opérateur qui exporterait `KLB_HARNAIS=1` dans son terminal ne gagnerait
# rien : les cinq autres conditions portent sur la base elle-même.
export KLB_HARNAIS=1
export KLB_CLUSTER_ATTENDU="$CLUSTER"

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
psql_valeur() { "$PGBIN/psql" -tAX -v ON_ERROR_STOP=1 --no-psqlrc -c "$1"; }

refus() {
  echo >&2
  echo "╔═══════════════════════════════════════════════════════════════════════╗" >&2
  echo "║  REFUS D'APPLIQUER LE BOOTSTRAP                                       ║" >&2
  echo "╚═══════════════════════════════════════════════════════════════════════╝" >&2
  echo "  $1" >&2
  echo >&2
  echo "  Les fichiers de scripts/db/bootstrap/ remplacent des fonctions réelles par" >&2
  echo "  des corps minimaux. Sur une base vivante, cela rend current_org_id() null," >&2
  echo "  aveugle toutes les RLS et fait taire les webhooks Stripe. Ils ne s'appliquent" >&2
  echo "  QUE sur un cluster jetable que ce script vient de créer lui-même." >&2
  exit 1
}

# ——— Les six garde-fous ————————————————————————————————————————————————————————
garde_bootstrap() {
  # 1. Le drapeau explicite du harnais.
  [ "${KLB_HARNAIS:-0}" = "1" ] || refus "KLB_HARNAIS n'est pas posé."

  # 2. Le serveur répond sur un socket Unix, pas sur une adresse réseau. Une base
  #    Supabase distante est nécessairement en TCP : cette seule condition l'exclut.
  local adresse
  adresse="$(psql_valeur "select coalesce(host(inet_server_addr()), 'socket')")"
  [ "$adresse" = "socket" ] || refus "le serveur répond en TCP sur $adresse, pas sur un socket local."

  # 3. Le répertoire de données est bien CELUI que ce script vient de créer. Un cluster
  #    local préexistant, écouté par hasard sur le même chemin, ne passe pas.
  local datadir
  datadir="$(psql_valeur "show data_directory")"
  [ "$datadir" = "$KLB_CLUSTER_ATTENDU/data" ] \
    || refus "data_directory = $datadir, attendu $KLB_CLUSTER_ATTENDU/data."

  # 4. Aucune table métier réelle. La liste est délibérément large : si l'une de ces
  #    tables existe, la base a déjà vécu.
  local metier
  metier="$(psql_valeur "
    select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname in ('organisations','adherents','adhesions','reglements',
                        'membres_asso','cours','pieces_adherent','questionnaires_sante',
                        'presences','emails_journal','actualites','sections','messages')")"
  [ -z "$metier" ] || refus "des tables métier existent déjà : $metier."

  # 5. Le schéma public est vide de toute relation — pas seulement des tables connues.
  local relations
  relations="$(psql_valeur "
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v','m','p','f')")"
  [ "$relations" = "0" ] || refus "le schéma public contient déjà $relations relation(s)."

  # 6. L'historique des migrations Supabase est vide ou absent. C'est la condition qui
  #    manquait à la première version : c'est cette table qui décide, chez Supabase, si
  #    une migration est « manquante » et doit être exécutée.
  # En deux temps, et pas en un `case` : PostgreSQL analyse la requête entière avant de
  # l'exécuter, donc une branche `else` qui nomme une table absente échoue à l'analyse,
  # `to_regclass` ou pas. Le harnais s'est arrêté là une première fois.
  local existe applique
  existe="$(psql_valeur "select to_regclass('supabase_migrations.schema_migrations') is not null")"
  if [ "$existe" = "t" ]; then
    applique="$(psql_valeur "select count(*) from supabase_migrations.schema_migrations")"
    [ "$applique" = "0" ] || refus "supabase_migrations.schema_migrations contient $applique ligne(s)."
  fi
}

# ——— Cales ————————————————————————————————————————————————————————————————————
echo "cales    : scripts/db/00-cales-supabase.sql"
psql_strict -f scripts/db/00-cales-supabase.sql > /dev/null

# ——— Bootstrap : vérifier les points d'insertion AVANT de commencer ————————————
# Un fichier `avant-NNNN_*.sql` dont la migration `NNNN` n'existe plus serait
# silencieusement ignoré, et la chaîne échouerait vingt lignes plus loin sur un message
# sans rapport. On le dit tout de suite.
for b in scripts/db/bootstrap/avant-*.sql; do
  [ -e "$b" ] || continue
  cible="$(basename "$b" | sed -E 's/^avant-([0-9]+)_.*/\1/')"
  compgen -G "supabase/migrations/${cible}_*.sql" > /dev/null \
    || { echo "ÉCHEC — $(basename "$b") vise la migration $cible, qui n'existe pas." >&2; exit 1; }
done

garde_bootstrap
echo "bootstrap : $(ls scripts/db/bootstrap/avant-*.sql 2>/dev/null | wc -l | tr -d ' ') fichier(s), garde-fous verts"

# ——— Migrations, bootstrap intercalé aux points déclarés ———————————————————————
echo "migrations :"
compte=0
for f in $(ls supabase/migrations/*.sql | sort); do
  numero="$(basename "$f" | sed -E 's/^([0-9]+)_.*/\1/')"
  for b in scripts/db/bootstrap/avant-"$numero"_*.sql; do
    [ -e "$b" ] || continue
    printf '  %-58s' "↳ bootstrap $(basename "$b")"
    # L'EMPREINTE ENCADRE CHAQUE PRÉREQUIS. Photographier le schéma avant, appliquer,
    # puis retenir la différence : c'est ainsi que les assertions savent QUOI surveiller
    # sans qu'on leur écrive une liste à la main — une liste qui dériverait au premier
    # prérequis ajouté, et se mettrait à valider le vide en silence.
    # La catégorie vient du NOM du fichier, jamais d'un jugement porté ici : un objet
    # « inféré » n'est remplacé par aucune migration, et l'assertion 00 ne doit pas
    # exiger qu'il le soit. Voir l'en-tête de `empreinte-avant.sql`.
    case "$(basename "$b")" in *manquantes*) cat_b=absent ;; *) cat_b=repris ;; esac
    if psql_strict -f scripts/db/empreinte-avant.sql > "$CLUSTER/last.log" 2>&1 \
       && psql_strict -f "$b" >> "$CLUSTER/last.log" 2>&1 \
       && psql_strict -v fichier="$(basename "$b")" -v categorie="$cat_b" \
            -f scripts/db/empreinte-apres.sql >> "$CLUSTER/last.log" 2>&1; then
      echo "ok"
    else
      echo "ÉCHEC"; tail -25 "$CLUSTER/last.log"; exit 1
    fi
  done
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

# ——— Assertions : le harnais ne doit pas tester ses propres cales ——————————————
# Elles tournent dans TOUS les modes. Une chaîne verte qui laisserait `current_org_id()`
# rendre `null` donnerait ensuite des tests de RLS verts pour la pire des raisons : plus
# rien n'est visible de personne.
# LE SCHÉMA `verif` : les `create table` de `0017`, rejoués là où ils s'exécutent
# vraiment. Dans `public`, `0017` se tait — les tables existent déjà, posées par le
# bootstrap. Dans un schéma vide, il crée. On peut alors comparer les deux formes.
# L'extraction est faite ici, à l'exécution, et jamais recopiée dans un fichier
# versionné : deux vérités pour une seule table, c'est précisément ce qu'on cherche à
# éviter. Seul le nom du schéma est réécrit ; les `references public.…` restent
# intactes et pointent vers les vraies tables parentes.
awk '
  /^create table if not exists public\./ { dans = 1; sub(/public\./, "verif."); print; next }
  dans { print }
  dans && /^\);/ { dans = 0 }
' supabase/migrations/0017_*.sql > "$CLUSTER/verif-tables.sql"
psql_strict -c "create schema if not exists verif" > /dev/null
psql_strict -f "$CLUSTER/verif-tables.sql" > /dev/null

# Le schéma de référence, chargé dans le cluster pour que l'assertion 02 puisse le lire.
for ref in scripts/db/reference/schema-*.txt; do
  [ -e "$ref" ] || continue
  awk -f scripts/db/reference-vers-sql.awk "$ref" > "$CLUSTER/reference.sql"
  psql_strict -c "create schema if not exists harnais" > /dev/null
  psql_strict -f "$CLUSTER/reference.sql" > /dev/null
done

echo "assertions :"
for a in $(ls scripts/db/assertions/*.sql 2>/dev/null | sort); do
  printf '  %-58s' "$(basename "$a")"
  if psql_strict -f "$a" > "$CLUSTER/assert.log" 2>&1; then
    echo "ok"
  else
    echo "ÉCHEC"
    echo "── erreur ──────────────────────────────────────────────"
    grep -vE "^(NOTICE|DETAIL|CONTEXT|HINT)" "$CLUSTER/assert.log" | tail -30
    exit 1
  fi
done

# ——— Empreinte du schéma, pour comparer deux reconstructions ————————————————————
# `KLB_DUMP=<chemin>` écrit le schéma obtenu. Deux exécutions doivent produire le même
# fichier : si elles diffèrent, une migration dépend de quelque chose qui varie —
# l'horloge, un ordre non déterministe, une valeur aléatoire — et la « reconstruction »
# n'en est pas une. Les schémas de travail du harnais sont exclus : ils n'appartiennent
# pas au produit.
if [ -n "${KLB_DUMP:-}" ]; then
  # `--no-owner` seulement : les GRANT restent dans le dump, et c'est voulu — le
  # cloisonnement de Klubster repose autant sur les droits par colonne que sur les RLS.
  # Une reconstruction qui perdrait un `revoke` doit se voir dans la comparaison.
  #
  # Les lignes `\restrict` / `\unrestrict` sont écartées : pg_dump y met un jeton tiré au
  # hasard À CHAQUE EXÉCUTION. Sans ce filtre, deux reconstructions rigoureusement
  # identiques diffèrent sur deux lignes, et la comparaison devient du bruit qu'on
  # apprend à ignorer — c'est-à-dire une comparaison morte.
  "$PGBIN/pg_dump" --schema-only --no-owner \
    --exclude-schema=harnais --exclude-schema=verif \
    | grep -vE '^\\(un)?restrict ' > "$KLB_DUMP"
  echo "schéma  : $KLB_DUMP ($(wc -l < "$KLB_DUMP" | tr -d ' ') lignes)"
fi

case "${1:-test}" in
  migrations)
    echo "OK — chaîne de migrations complète, aucun prérequis résiduel."
    ;;
  psql)
    "$PGBIN/psql"
    ;;
  matrice)
    # La matrice a besoin des fixtures : elle mesure ce que chaque rôle voit d'un état
    # connu. Tout est annulé en fin de fichier, cluster détruit ensuite de toute façon.
    psql_strict -f tests/db/00-fixtures.sql > /dev/null 2>&1
    "$PGBIN/psql" -X --no-psqlrc -v ON_ERROR_STOP=1 -f scripts/db/matrice-rls.sql
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
