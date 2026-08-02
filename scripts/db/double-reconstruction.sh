#!/usr/bin/env bash
#
# Reconstruit la base DEUX FOIS depuis zéro et compare les deux schémas.
#
# POURQUOI DEUX FOIS, ET PAS UNE.
#
# Une chaîne qui passe une fois prouve seulement qu'elle passe une fois. Elle peut
# dépendre de l'horloge (`current_date` dans un défaut de colonne, une saison calculée),
# d'un `gen_random_uuid()` inséré dans une donnée de référence, ou de l'ordre non garanti
# d'un `select` sans `order by`. Dans tous ces cas la « reconstruction » produit un
# schéma différent à chaque exécution — et une reprise après sinistre rendrait une base
# qui n'est pas celle qu'on croit.
#
# Deux reconstructions identiques ne prouvent pas le déterminisme absolu ; elles
# éliminent les causes qui se voient en une journée. C'est le niveau de preuve annoncé,
# pas davantage.
#
# Usage : scripts/db/double-reconstruction.sh
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RACINE"

TRAVAIL="$(mktemp -d "${TMPDIR:-/tmp}/klubster-recon-XXXXXX")"
trap 'rm -rf "$TRAVAIL"' EXIT INT TERM

echo "═══ Reconstruction 1 ═══"
KLB_DUMP="$TRAVAIL/schema-1.sql" ./scripts/db/harnais.sh migrations

echo
echo "═══ Reconstruction 2 ═══"
KLB_DUMP="$TRAVAIL/schema-2.sql" ./scripts/db/harnais.sh migrations

echo
echo "═══ Comparaison ═══"
if diff -u "$TRAVAIL/schema-1.sql" "$TRAVAIL/schema-2.sql" > "$TRAVAIL/ecart.diff"; then
  echo "IDENTIQUES — $(wc -l < "$TRAVAIL/schema-1.sql" | tr -d ' ') lignes de schéma."
else
  echo "LES DEUX RECONSTRUCTIONS DIFFÈRENT :"
  head -60 "$TRAVAIL/ecart.diff"
  exit 1
fi
