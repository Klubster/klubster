-- KLUBSTER-BOOTSTRAP-HARNAIS — NE JAMAIS DÉPLOYER, NE JAMAIS APPLIQUER SUR UNE BASE EXISTANTE.
--
-- ═══ LES COLONNES QUE LE DÉPÔT NE CRÉE NULLE PART ════════════════════════════════
--
-- Contrairement aux deux autres prérequis, celles-ci ne sont créées par AUCUNE
-- migration du dépôt. Ni `create table`, ni `alter table … add column` :
--
--     $ grep -rn "user_id" supabase/migrations/*.sql | grep -iE "add column|alter table"
--     (aucun résultat)
--
-- Elles sont pourtant lues par les politiques RLS qui décident si un adhérent voit son
-- propre dossier (`0006`, `0018`) et par celle qui garde le bucket `pieces` (`0013`).
-- Une base reconstruite depuis le dépôt seul n'aurait ni les colonnes ni ces politiques.
--
-- ═══ D'OÙ VIENNENT CES DÉFINITIONS ═══════════════════════════════════════════════
--
-- Elles ne sont PAS déduites de leurs usages. Elles sont EXTRAITES DU SCHÉMA DE
-- RÉFÉRENCE, lu le 02/08/2026 sur le projet Supabase `basnfuvdjobanejahayt` par le
-- connecteur déjà autorisé — métadonnées de catalogue uniquement (`pg_attribute`,
-- `pg_attrdef`), aucune ligne de donnée, aucune écriture. La copie datée est dans
-- `scripts/db/reference/`, et `scripts/db/assertions/02-ecart-au-schema-de-reference.sql`
-- mesure ce qui manque encore après toute la chaîne.
--
-- Une première version de ce fichier INFÉRAIT les types depuis le code qui les lit. Elle
-- tombait juste pour `adherents.user_id` et `adherents.infos`, mais c'était de la chance :
-- inventer une forme de table quand la vraie est lisible n'est pas une méthode.
--
-- ═══ POURQUOI LE DÉPÔT NE LES A PAS ══════════════════════════════════════════════
--
-- **[Vérifié]** La base de production porte 73 migrations appliquées ; le dépôt en
-- contient 30. Les 47 migrations appliquées entre le 29/06 et le 11/07/2026 — de
-- `vitrine_contenu` à `jauge_liste_attente` — n'ont aucun fichier correspondant. Le
-- dépôt saute de `init_multitenant` (29/06) à `create_club_ne_detache_plus_le_compte`
-- (21/07). C'est là que se trouvent `form_builder_and_member_foundation`,
-- `theme_template_mode`, `abonnement_klubster`, `saison_dates_organisation` — c'est-à-dire
-- exactement les colonnes ci-dessous, et les tables de `avant-0004_tables.sql`.
--
-- Le corps SQL de ces 47 migrations est intégralement conservé dans
-- `supabase_migrations.schema_migrations.statements`. La reconstruction canonique est
-- donc possible PAR EXTRACTION, sans rien réinventer — c'est l'objectif B, dans une PR
-- distincte, parce que le choix entre « restituer les 47 fichiers » et « repartir d'une
-- baseline » appartient à Mathieu.
--
-- Point d'insertion : AVANT `0004`, premier fichier qui nomme `user_id` et `infos`.

-- ——— adherents ————————————————————————————————————————————————————————————————
-- Aucune clé étrangère vers `auth.users` dans le schéma de référence : la version
-- précédente en avait ajouté une « plausible ». Elle n'existe pas. Ne pas la remettre.
alter table public.adherents add column if not exists user_id uuid;
alter table public.adherents add column if not exists infos   jsonb not null default '{}'::jsonb;

-- ——— organisations ————————————————————————————————————————————————————————————
-- Quinze colonnes, toutes nées dans les migrations absentes du dépôt.
alter table public.organisations add column if not exists form_config    jsonb   not null default '{"pages": [], "pieces": []}'::jsonb;
alter table public.organisations add column if not exists actualite      jsonb;
alter table public.organisations add column if not exists theme_template text    not null default 'editorial'::text;
alter table public.organisations add column if not exists theme_mode     text    not null default 'blanc'::text;
alter table public.organisations add column if not exists page_config    jsonb;
alter table public.organisations add column if not exists domaine_custom text;
alter table public.organisations add column if not exists echeances_max  integer not null default 1;

alter table public.organisations add column if not exists abonnement_customer_id     text;
alter table public.organisations add column if not exists abonnement_subscription_id text;
alter table public.organisations add column if not exists abonnement_statut          text not null default 'aucun'::text;
alter table public.organisations add column if not exists abonnement_essai_fin       timestamptz;
alter table public.organisations add column if not exists abonnement_periode_fin     timestamptz;
alter table public.organisations add column if not exists stripe_test                jsonb not null default '{}'::jsonb;

alter table public.organisations add column if not exists saison_debut date;
alter table public.organisations add column if not exists saison_fin   date;

-- ——— adhesions ————————————————————————————————————————————————————————————————
alter table public.adhesions add column if not exists mode_paiement          text;
alter table public.adhesions add column if not exists stripe_payment_intent  text;
alter table public.adhesions add column if not exists litige_le              timestamptz;
alter table public.adhesions add column if not exists derniere_relance       timestamptz;
