-- Second temps de l'empreinte : ce que le prérequis vient de créer.
--
-- Appelé avec `-v fichier=<nom>` et `-v categorie=<extrait|infere>`. Tout objet de
-- `public` absent de l'instantané a été créé par ce fichier de bootstrap.
--
-- Pour une fonction on retient sa définition exacte : `create or replace` conserve l'oid,
-- ce qui permettra à l'assertion `00` de comparer la définition finale à la définition
-- minimale et d'échouer si elles sont identiques.

insert into harnais.empreinte (cle, oid, genre, objet, definition_bootstrap, fichier, categorie)
select 'f:' || p.oid::text, p.oid, 'function', p.oid::regprocedure::text,
       pg_get_functiondef(p.oid), :'fichier', :'categorie'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.oid not in (select oid from harnais.instantane_objets)
on conflict (cle) do nothing;

insert into harnais.empreinte (cle, oid, genre, objet, fichier, categorie)
select 't:' || c.oid::text, c.oid, 'table', c.relname, :'fichier', :'categorie'
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
   and c.oid not in (select oid from harnais.instantane_objets)
on conflict (cle) do nothing;

-- Les colonnes ajoutées à une table qui existait déjà. On exclut celles des tables que ce
-- même fichier vient de créer : elles sont déjà couvertes par la ligne « table », et les
-- compter deux fois gonflerait l'inventaire sans rien apprendre.
insert into harnais.empreinte (cle, oid, genre, objet, definition_bootstrap, fichier, categorie)
select 'c:' || a.attrelid::text || ':' || a.attnum::text, a.attrelid, 'column',
       c.relname || '.' || a.attname,
       format_type(a.atttypid, a.atttypmod), :'fichier', :'categorie'
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
   and a.attnum > 0 and not a.attisdropped
   and (a.attrelid, a.attnum) not in (select attrelid, attnum from harnais.instantane_colonnes)
   and a.attrelid in (select oid from harnais.instantane_objets)
on conflict (cle) do nothing;
