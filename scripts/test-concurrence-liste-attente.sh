#!/usr/bin/env bash
# Deux inscriptions simultanées sur la DERNIÈRE place d'un cours.
#
# Avant la migration 20260803160000_liste_attente, `register_adherent_full` comptait les places puis insérait,
# sans verrou : les deux transactions lisaient le même total, et le cours se retrouvait
# avec une place de plus que sa capacité. Ce script rejoue exactement ce cas.
#
# Usage : DEV_OPS_URL="postgres://…" ./scripts/test-concurrence-liste-attente.sh
# À lancer UNIQUEMENT sur la base de développement.
set -euo pipefail

URL="${DEV_OPS_URL:?DEV_OPS_URL manquant}"
SLUG="${SLUG:-cercleescrimetest}"

echo "→ préparation : un cours à 1 place, aucune adhésion active"
psql "$URL" -q <<SQL
update cours set places_max = 1
  where organisation_id = (select id from organisations where slug = '$SLUG');
update adhesions set statut = 'annule'
  where organisation_id = (select id from organisations where slug = '$SLUG');
SQL

COURS=$(psql "$URL" -tAc "select c.id from cours c join organisations o on o.id=c.organisation_id where o.slug='$SLUG' limit 1")

lancer() {
  local suffixe=$1
  psql "$URL" -q -tAc "select register_adherent_full(
      '$SLUG', NULL, 'Concurrent$suffixe', 'Test', 'concurrent$suffixe@dev.example.org',
      NULL, '$COURS'::uuid, '{}'::jsonb, 'especes')" > /dev/null 2>&1 \
    || echo "  inscription $suffixe : refusee"
}

echo "→ deux inscriptions lancées en parallèle sur la même place"
lancer A & lancer B & wait

echo "→ résultat"
psql "$URL" -tAc "
select ad.statut, count(*)
from adhesions ad
where ad.cours_id = '$COURS'::uuid and ad.statut <> 'annule'
group by ad.statut order by 1;"

ACTIVES=$(psql "$URL" -tAc "
select count(*) from adhesions
where cours_id = '$COURS'::uuid and statut = any (statuts_occupant_place());")

echo
if [ "$ACTIVES" -le 1 ]; then
  echo "OK — $ACTIVES place occupée pour une capacité de 1."
else
  echo "ECHEC — $ACTIVES places occupées pour une capacité de 1 : double attribution."
  exit 1
fi

# ——— Preuve que le comptage est protégé ———
#
# La course brute ne suffit pas à faire mordre ce test, et il faut le dire : l'INSERT dans
# `adhesions` prend de lui-même un verrou `FOR KEY SHARE` sur la ligne du cours (clé
# étrangère), ce qui sérialise déjà les insertions. Mais ce verrou-là n'arrive qu'APRÈS le
# comptage : deux transactions peuvent compter « 0 occupé » avant que l'une insère. C'est
# cette fenêtre que ferme `verrouiller_cours`, pris AVANT le comptage.
#
# On vérifie donc que l'appel est présent et qu'il précède bien le comptage. Retirer la
# ligne de la fonction fait échouer ce test — vérifié.

echo
echo "→ le verrou est pris avant le comptage des places"
ORDRE=$(psql "$URL" -tAc "
  select case
    when position('verrouiller_cours' in prosrc) = 0 then 'absent'
    when position('verrouiller_cours' in prosrc) < position('select count(*) into v_occ' in prosrc) then 'avant'
    else 'apres'
  end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'register_adherent_full';")

echo "  verrouiller_cours : $ORDRE le comptage"
if [ "$ORDRE" = "avant" ]; then
  echo "OK — la fenêtre de double attribution est fermée."
else
  echo "ECHEC — le comptage des places n'est pas protégé ($ORDRE)."
  exit 1
fi
