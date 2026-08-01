-- Préalables — sans ce fichier, la base n'est pas reconstructible depuis le dépôt.
--
-- ═══ LE DÉFAUT, MESURÉ ═══════════════════════════════════════════════════════════
--
-- Rejouées sur une base VIDE, les migrations s'arrêtent à `0003` :
--
--     psql:0003_ecriture_organisation_par_role.sql:33:
--     ERROR: function current_org_id() does not exist
--
-- Neuf fonctions sont appelées AVANT d'être définies :
--
--   | fonction                          | définie dans | premier appel |
--   |-----------------------------------|--------------|---------------|
--   | current_org_id                    | 0011         | 0003          |
--   | is_super_admin                    | 0011         | 0003          |
--   | a_role_asso                       | 0011         | 0003          |
--   | marquer_relance                   | 0013         | 0003          |
--   | saison_courante                   | 0013         | 0004          |
--   | enregistrer_questionnaire_sante   | 0013         | 0006          |
--   | enregistrer_reglement_webhook     | 0013         | 0012          |
--   | enregistrer_remboursement_webhook | 0013         | 0012          |
--   | promouvoir_liste_attente          | 0013         | 0012          |
--
-- ═══ POURQUOI C'EST ARRIVÉ ═══════════════════════════════════════════════════════
--
-- **[Hypothèse, non établie.]** Les noms de `0011` et `0013` — « reference_fonctions_auth »,
-- « reference_rpc_et_storage » — et leur contenu (des définitions complètes, en
-- `CREATE OR REPLACE`) sont cohérents avec des SNAPSHOTS pris après coup sur une base
-- déjà construite. Les migrations `0003` à `0010` auraient alors été écrites contre une
-- base vivante où ces fonctions existaient déjà, créées hors migration.
--
-- Je ne peux pas le prouver depuis le dépôt : l'historique Git ne dit pas ce qui a été
-- exécuté dans l'éditeur SQL de Supabase. Ce qui EST établi, c'est le fait — la chaîne
-- ne rejoue pas — et il se reproduit à chaque exécution du harnais.
--
-- ═══ CE QUE CELA COÛTE ═══════════════════════════════════════════════════════════
--
-- `CLAUDE.md` pose la règle : « La base doit rester reconstructible depuis le repo. »
-- Elle ne l'était pas. Conséquences concrètes :
--
--   1. AUCUNE REPRISE APRÈS SINISTRE. Le projet Supabase perdu, le dépôt ne suffit pas
--      à le reconstruire. Pour un produit qui héberge des données de santé et des
--      mineurs, ce n'est pas un détail d'hygiène.
--   2. AUCUN TEST POSSIBLE AVANT PRODUCTION. Une migration ne peut être essayée que sur
--      la base réelle, puisque aucune autre ne peut être amenée dans le même état.
--   3. AUCUN ENVIRONNEMENT DE PRÉPRODUCTION reproductible.
--
-- ═══ LE CORRECTIF ════════════════════════════════════════════════════════════════
--
-- Ce fichier déclare les neuf fonctions avec LEUR SIGNATURE EXACTE et un corps minimal,
-- avant `0001`. `0011` et `0013` les remplacent ensuite par leur vrai corps, en
-- `CREATE OR REPLACE` — c'est précisément pour cela que la signature doit correspondre
-- au caractère près : PostgreSQL refuse de remplacer une fonction dont le type de retour
-- change.
--
-- POURQUOI `0000` ET PAS UN RENUMÉROTAGE. Les migrations s'appliquent dans l'ordre
-- alphabétique du nom de fichier. `0000_` passe avant `0001_` sans toucher à un seul
-- fichier existant. Renuméroter aurait réécrit un historique déjà appliqué en
-- production — c'est-à-dire risqué une divergence entre ce que la prod a exécuté et ce
-- que le dépôt prétend.
--
-- SUR UNE BASE DÉJÀ MIGRÉE, CE FICHIER EST SANS EFFET : les corps réels de `0011` et
-- `0013` y sont déjà, et `CREATE OR REPLACE` les réécrira à l'identique lors du rejeu.
-- Rien n'est supprimé, aucune donnée n'est touchée.
--
-- Retour arrière : supprimer ce fichier. Il n'a d'effet que sur une base vide.

-- ——— Fonctions d'autorisation, corps réel dans 0011 ————————————————————————————

create or replace function public.current_org_id() returns uuid
  language sql stable security definer set search_path to 'public'
as $$ select null::uuid $$;

create or replace function public.is_super_admin() returns boolean
  language sql stable security definer set search_path to 'public'
as $$ select false $$;

create or replace function public.a_role_asso(p_roles text[]) returns boolean
  language sql stable security definer set search_path to 'public'
as $$ select false $$;

-- ——— Fonctions métier, corps réel dans 0013 ————————————————————————————————————

create or replace function public.saison_courante(p_org uuid) returns text
  language sql stable security definer set search_path to 'public'
as $$ select null::text $$;

create or replace function public.marquer_relance(p_ids uuid[]) returns integer
  language sql security definer set search_path to 'public'
as $$ select 0 $$;

create or replace function public.promouvoir_liste_attente(p_adhesion_id uuid) returns boolean
  language sql security definer set search_path to 'public'
as $$ select false $$;

create or replace function public.enregistrer_questionnaire_sante(
  p_adhesion_id uuid, p_type text, p_date_naissance date, p_reponses jsonb,
  p_resultat text, p_signataire_nom text, p_signataire_qualite text, p_signature text
) returns uuid
  language sql security definer set search_path to 'public'
as $$ select null::uuid $$;

create or replace function public.enregistrer_reglement_webhook(
  p_adhesion_id uuid, p_montant_centimes integer,
  p_note text default null, p_ref text default null
) returns void
  language sql security definer set search_path to 'public'
as $$ select $$;

create or replace function public.enregistrer_remboursement_webhook(
  p_adhesion_id uuid, p_montant_centimes integer, p_ref text default null
) returns void
  language sql security definer set search_path to 'public'
as $$ select $$;

-- Les droits définitifs sont posés par `0011` et `0013`. On ferme par précaution dès
-- maintenant : un corps minimal ne doit jamais être appelable par `anon` entre deux
-- migrations.
revoke execute on function public.current_org_id() from anon, public;
revoke execute on function public.is_super_admin() from anon, public;
revoke execute on function public.a_role_asso(text[]) from anon, public;
