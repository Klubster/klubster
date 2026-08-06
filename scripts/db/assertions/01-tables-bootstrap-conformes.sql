-- ASSERTION — les six tables du bootstrap ont bien la forme que `0017` leur donne.
--
-- POURQUOI `CREATE TABLE IF NOT EXISTS` NE PROUVE RIEN.
--
-- Le bootstrap crée six tables que les migrations utilisent avant de les déclarer.
-- `0017_snapshot_tables_et_index.sql` les crée ensuite à son tour, en `if not exists` —
-- et se tait, PARCE QU'ELLES EXISTENT DÉJÀ, quelle que soit leur forme. Une colonne
-- oubliée, un type approximatif, un `check` absent, une valeur par défaut différente :
-- rien de tout cela ne lèverait la moindre erreur. Le harnais validerait alors un schéma
-- qui n'existe nulle part, et les tests suivants porteraient sur une base fictive.
--
-- Ce fichier rompt ce silence. Le lanceur a extrait de `0017` les `create table` réels,
-- les a rejoués dans un schéma `verif` (où ils s'exécutent VRAIMENT, puisque rien n'y
-- existe), et on compare ici colonne par colonne et contrainte par contrainte.
--
-- CE QUE LE BOOTSTRAP PEUT MASQUER, ET CE QU'IL NE PEUT PAS. Les prérequis ne créent
-- que des tables : aucun index, aucune politique RLS, aucun grant. Index, RLS et droits
-- viennent donc tous des migrations réelles, appliqués à une table existante — ils ne
-- peuvent pas être escamotés par un `if not exists`. Le seul point d'escamotage possible
-- est la FORME de la table elle-même, et c'est exactement ce qui est comparé ici.
--
-- Les colonnes ou contraintes présentes dans `public` mais absentes de `verif` ne sont
-- pas des erreurs : une migration postérieure à `0017` a pu en ajouter. Elles sont
-- signalées, pas refusées. L'inverse — présent dans `verif`, absent ou différent dans
-- `public` — est un échec.

do $$
declare
  n_tables integer;
  n_verif  integer;
  ecarts   text;
  extras   text;
begin
  -- ——— 0. L'assertion mord-elle ? —————————————————————————————————————————————
  select count(*) into n_tables from harnais.empreinte where genre = 'table';
  select count(*) into n_verif
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'verif' and c.relkind = 'r';

  if n_tables = 0 then
    raise exception 'aucune table de bootstrap enregistrée — cette assertion ne prouverait rien.';
  end if;
  if n_verif <> n_tables then
    raise exception 'extraction incomplète : % table(s) de bootstrap, % rejouée(s) depuis 0017. La comparaison serait partielle.',
      n_tables, n_verif;
  end if;
  raise notice '% table(s) de bootstrap comparée(s) à leur définition dans 0017.', n_tables;

  -- ——— 1. Colonnes : nom, type, NOT NULL, valeur par défaut ————————————————————
  with colonnes as (
    select n.nspname as schema, c.relname as tbl, a.attname as col,
           format_type(a.atttypid, a.atttypmod) as typ,
           a.attnotnull as obligatoire,
           coalesce(pg_get_expr(d.adbin, d.adrelid), '') as defaut
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
     where c.relkind = 'r'
       and (n.nspname = 'verif'
            or (n.nspname = 'public' and c.oid in (select oid from harnais.empreinte where genre = 'table')))
  ),
  attendu as (select * from colonnes where schema = 'verif'),
  reel    as (select * from colonnes where schema = 'public')
  select string_agg(
           format('%s.%s : %s', a.tbl, a.col,
             case
               when r.col is null then 'ABSENTE de public'
               when a.typ is distinct from r.typ then format('type %s attendu, %s trouvé', a.typ, r.typ)
               when a.obligatoire is distinct from r.obligatoire then
                 format('NOT NULL %s attendu, %s trouvé', a.obligatoire, r.obligatoire)
               else format('défaut « %s » attendu, « %s » trouvé', a.defaut, r.defaut)
             end),
           E'\n    ' order by a.tbl, a.col)
    into ecarts
    from attendu a
    left join reel r on r.tbl = a.tbl and r.col = a.col
   where r.col is null
      or a.typ         is distinct from r.typ
      or a.obligatoire is distinct from r.obligatoire
      or a.defaut      is distinct from r.defaut;

  if ecarts is not null then
    raise exception E'Le bootstrap masque une définition de 0017 :\n    %', ecarts;
  end if;

  -- Les ajouts postérieurs sont légitimes, mais on veut les voir passer.
  with colonnes as (
    select n.nspname as schema, c.relname as tbl, a.attname as col
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
     where c.relkind = 'r'
       and (n.nspname = 'verif'
            or (n.nspname = 'public' and c.oid in (select oid from harnais.empreinte where genre = 'table')))
  )
  select string_agg(format('%s.%s', r.tbl, r.col), E'\n    ' order by r.tbl, r.col) into extras
    from colonnes r
   where r.schema = 'public'
     and not exists (select 1 from colonnes a where a.schema = 'verif' and a.tbl = r.tbl and a.col = r.col);
  if extras is not null then
    raise notice E'[OBSERVÉ] colonnes ajoutées après 0017 :\n    %', extras;
  end if;

  -- ——— 2. Contraintes : check, unique, clés primaires et étrangères ————————————
  -- `pg_get_constraintdef` rend la définition normalisée : deux écritures différentes
  -- d'un même `check` donnent le même texte. C'est ce qui rend la comparaison utile
  -- plutôt que tatillonne.
  with contraintes as (
    select n.nspname as schema, c.relname as tbl, con.conname as nom,
           pg_get_constraintdef(con.oid) as def
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'r'
       and (n.nspname = 'verif'
            or (n.nspname = 'public' and c.oid in (select oid from harnais.empreinte where genre = 'table')))
  ),
  attendu as (select * from contraintes where schema = 'verif'),
  reel    as (select * from contraintes where schema = 'public'),
  -- ——— Évolutions LÉGITIMES postérieures à 0017 ——————————————————————————————
  -- Des migrations datées droppent explicitement certaines contraintes de 0017 pour
  -- les remplacer. Les exiger encore serait comparer au passé. Chaque exception est
  -- nommée, datée, et COMPENSÉE plus bas par la vérification que sa remplaçante
  -- existe bien — l'assertion est donc renforcée, pas affaiblie.
  remplacees(tbl, motif) as (values
    -- 20260803180000_controle_terrain : UNIQUE (adherent_id, date) →
    -- UNIQUE NULLS NOT DISTINCT (adherent_id, cours_id, date)
    ('presences',  'UNIQUE (adherent_id, date)'),
    -- 20260803230000_paiements_coherence : montant > 0 → montant <> 0 (remboursements),
    -- et mode élargi à 'remboursement'
    ('reglements', '(montant_centimes > 0)'),
    ('reglements', '''cheque''::text, ''especes''::text, ''en_ligne''::text, ''autre''::text')
  )
  select string_agg(format('%s : %s', a.tbl, a.def), E'\n    ' order by a.tbl, a.def) into ecarts
    from attendu a
   where not exists (select 1 from reel r where r.tbl = a.tbl and r.def = a.def)
     and not exists (select 1 from remplacees x where x.tbl = a.tbl and a.def like '%' || x.motif || '%');

  if ecarts is not null then
    raise exception E'Contrainte(s) de 0017 absente(s) de la table créée par le bootstrap :\n    %', ecarts;
  end if;

  -- ——— Les remplaçantes existent réellement ————————————————————————————————————
  if not exists (
    select 1 from pg_constraint con join pg_class c on c.oid = con.conrelid
     where c.relname = 'presences'
       and pg_get_constraintdef(con.oid) ilike '%nulls not distinct (adherent_id, cours_id, date)%'
  ) then
    raise exception 'presences : la contrainte UNIQUE remplaçante (adherent_id, cours_id, date) est absente';
  end if;
  if not exists (
    select 1 from pg_constraint con join pg_class c on c.oid = con.conrelid
     where c.relname = 'reglements' and pg_get_constraintdef(con.oid) like '%montant_centimes <> 0%'
  ) then
    raise exception 'reglements : la contrainte remplaçante montant_centimes <> 0 est absente';
  end if;
  if not exists (
    select 1 from pg_constraint con join pg_class c on c.oid = con.conrelid
     where c.relname = 'reglements' and pg_get_constraintdef(con.oid) like '%remboursement%'
  ) then
    raise exception 'reglements : le mode « remboursement » est absent de la contrainte de mode';
  end if;
end $$;
