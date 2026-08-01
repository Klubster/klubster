-- Instantané pris JUSTE AVANT un fichier de bootstrap.
--
-- Le harnais doit pouvoir prouver, à la fin de la chaîne, que plus aucun corps minimal
-- ne subsiste. Pour cela il lui faut savoir CE QUE LE BOOTSTRAP A CRÉÉ — et le savoir
-- sans qu'on le lui écrive à la main, sinon la liste dérive dès qu'un prérequis est
-- ajouté et l'assertion se met à valider le vide en silence.
--
-- La méthode est donc : photographier les objets du schéma `public` avant, appliquer le
-- prérequis, et retenir la différence. `scripts/db/empreinte-apres.sql` fait le second
-- temps.
--
-- DEUX CATÉGORIES DE PRÉREQUIS, ET ELLES N'ONT PAS LE MÊME STATUT.
--
--   REPRIS  — l'objet est bien défini quelque part dans le dépôt, mais trop tard :
--             `current_org_id()` naît en `0011`, six tables en `0017`. Le bootstrap
--             n'avance que la date. La migration réelle le remplace ensuite, et
--             l'assertion `00` ÉCHOUE s'il n'a pas été remplacé.
--
--   ABSENT  — l'objet n'est défini NULLE PART dans le dépôt. `adherents.user_id` est lu
--             par sept migrations et créé par aucune ; quinze colonnes d'`organisations`
--             sont dans le même cas. Leur forme n'existe que dans la base de production,
--             d'où elle a été extraite. Rien ne viendra les remplacer : c'est un écart
--             qui ne se referme pas tant que l'historique canonique n'est pas repris —
--             objectif B, hors de cette PR.
--
-- La catégorie vient du NOM DU FICHIER de bootstrap (`…-manquantes.sql` ⇒ absent), pas
-- d'un jugement porté au cas par cas.
--
-- Tout vit dans un schéma `harnais`, jamais dans `public` : il est exclu des
-- comparaisons de schéma (`pg_dump --exclude-schema=harnais`) et disparaît avec le
-- cluster.

create schema if not exists harnais;

create table if not exists harnais.empreinte (
  cle                  text primary key,
  oid                  oid,
  genre                text not null check (genre in ('function', 'table', 'column')),
  objet                text not null,
  definition_bootstrap text not null default '',
  fichier              text not null,
  categorie            text not null check (categorie in ('repris', 'absent'))
);

drop table if exists harnais.instantane_objets;
create table harnais.instantane_objets as
  select p.oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
  union all
  select c.oid
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r';

-- Les colonnes se suivent séparément : une colonne n'a pas d'oid propre, elle s'identifie
-- par (table, numéro). Sans cet instantané-ci, un prérequis qui ajoute une colonne à une
-- table existante passerait totalement inaperçu de l'empreinte.
drop table if exists harnais.instantane_colonnes;
create table harnais.instantane_colonnes as
  select a.attrelid, a.attnum
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and a.attnum > 0 and not a.attisdropped;
