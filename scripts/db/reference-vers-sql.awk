# Transforme `scripts/db/reference/schema-*.txt` en INSERT pour `harnais.reference`.
#
# Le SQL ne lit pas de fichiers ; l'assertion 02 a pourtant besoin du schéma de référence.
# Ce petit filtre fait le passage, à l'exécution, dans le cluster jetable.
#
# ON NE RETIENT QUE LES NOMS — table et colonne — pas les types ni les défauts. Deux
# raisons : les types et contraintes des six tables du bootstrap sont déjà comparés à
# `0017` par l'assertion 01, et une valeur par défaut comme
# `'{"pages": [], "pieces": []}'::jsonb` demanderait un échappement dont le moindre raté
# ferait échouer l'assertion pour une raison sans rapport avec le schéma. Un contrôle qui
# se trompe de motif d'échec finit par être désactivé.
BEGIN {
  print "create table if not exists harnais.reference_tables (nom text primary key);";
  print "create table if not exists harnais.reference_colonnes (tbl text, col text, primary key (tbl, col));";
}
/^#/ || /^[[:space:]]*$/ { next }
$1 == "TABLES" {
  for (i = 2; i <= NF; i++) printf "insert into harnais.reference_tables values ('%s') on conflict do nothing;\n", $i;
  next
}
$1 == "TABLE" { table = $2; next }
table != "" {
  printf "insert into harnais.reference_colonnes values ('%s', '%s') on conflict do nothing;\n", table, $1;
}
