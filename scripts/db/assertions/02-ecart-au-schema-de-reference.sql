-- ASSERTION — ce que la base reconstruite n'a pas, et que la vraie a.
--
-- Les assertions `00` et `01` regardent vers l'intérieur : elles vérifient que le harnais
-- ne se ment pas à lui-même. Celle-ci regarde vers l'extérieur, et pose la seule question
-- qui compte vraiment pour une reprise après sinistre : SI ON REPARTAIT DE CE DÉPÔT,
-- OBTIENDRAIT-ON LA BASE DE KLUBSTER ?
--
-- Le point de comparaison est `scripts/db/reference/schema-20260802.txt`, un extrait daté
-- du catalogue de production. Il est partiel et il vieillit — c'est assumé et écrit dans
-- son en-tête. Un fichier de référence qu'on croit vivant est plus dangereux qu'un fichier
-- dont on connaît l'âge.
--
-- CE QU'ELLE COMPARE : les NOMS de tables et de colonnes. Les types, contraintes et
-- valeurs par défaut des six tables du bootstrap sont déjà couverts par l'assertion 01.
--
-- CE QU'ELLE NE COMPARE PAS, et qu'il ne faut pas croire couvert : les fonctions, les
-- politiques RLS, les droits, les index, les triggers, les buckets de stockage. Une
-- comparaison complète suppose un dump de référence complet, donc l'objectif B.

do $$
declare
  manquantes text;
  surplus    text;
  n_ref      integer;
begin
  select count(*) into n_ref from harnais.reference_tables;
  if n_ref = 0 then
    raise exception 'le schéma de référence n''a pas été chargé — cette assertion ne prouverait rien.';
  end if;

  -- ——— Tables ————————————————————————————————————————————————————————————————
  select string_agg(r.nom, ', ' order by r.nom) into manquantes
    from harnais.reference_tables r
   where to_regclass('public.' || r.nom) is null;
  if manquantes is not null then
    raise exception E'Table(s) de la base réelle que le dépôt ne reconstruit pas :\n    %', manquantes;
  end if;

  -- L'inverse mérite d'être vu sans faire échouer : une table créée par une migration
  -- postérieure au 02/08 est parfaitement légitime, c'est la référence qui a vieilli.
  select string_agg(c.relname, ', ' order by c.relname) into surplus
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not exists (select 1 from harnais.reference_tables r where r.nom = c.relname);
  if surplus is not null then
    raise notice E'[OBSERVÉ] table(s) absente(s) de la référence du 02/08 — référence à rafraîchir ?\n    %', surplus;
  end if;

  -- ——— Colonnes des tables décrites en détail ————————————————————————————————
  select string_agg(r.tbl || '.' || r.col, E'\n    ' order by r.tbl, r.col) into manquantes
    from harnais.reference_colonnes r
   where not exists (
     select 1 from pg_attribute a
       join pg_class c on c.oid = a.attrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = r.tbl
        and a.attname = r.col and a.attnum > 0 and not a.attisdropped);
  if manquantes is not null then
    raise exception E'Colonne(s) de la base réelle que le dépôt ne reconstruit pas :\n    %', manquantes;
  end if;

  raise notice 'Écart au schéma de référence : aucune table ni colonne manquante (% tables comparées).', n_ref;
end $$;
