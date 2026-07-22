-- SNAPSHOT DE RÉFÉRENCE — politiques RLS et droits d'exécution, tels qu'en production
-- le 21/07/2026.
--
-- Les migrations 0001–0005 décrivent l'évolution ; ce fichier est l'état complet, écrit
-- de façon idempotente pour reconstruire à l'identique une base neuve (staging, CI). Il
-- répond à la remarque de l'audit externe : « les vraies RLS/RPC ne sont pas versionnées ».
--
-- Principe d'isolation : chaque table métier est cloisonnée par organisation via
-- `organisation_id = current_org_id() or is_super_admin()`. Les adhérents accèdent en
-- plus à LEURS propres lignes via `auth.uid()`. Les données de santé (art. 9) ne sont
-- lisibles que par le président et le secrétaire du club, ou par l'adhérent lui-même.

begin;

-- RLS active sur toutes les tables métier.
alter table public.organisations       enable row level security;
alter table public.profiles            enable row level security;
alter table public.adherents           enable row level security;
alter table public.adhesions           enable row level security;
alter table public.cours               enable row level security;
alter table public.reglements          enable row level security;
alter table public.pieces_adherent     enable row level security;
alter table public.questionnaires_sante enable row level security;
alter table public.presences           enable row level security;
alter table public.audit_log           enable row level security;

-- ORGANISATIONS ------------------------------------------------------------------------
-- Lecture : club publié (vitrine publique), ou son propre club, ou super-admin.
drop policy if exists org_read_public on public.organisations;
create policy org_read_public on public.organisations for select
  using (publie = true or id = current_org_id() or is_super_admin());
-- Écriture : rôles qui écrivent réellement (président, trésorier, secrétaire) ; les
-- colonnes sensibles restent protégées par le trigger de la migration 0003.
drop policy if exists org_admin_write on public.organisations;
create policy org_admin_write on public.organisations for all
  using ((id = current_org_id() and a_role_asso(array['admin_asso','tresorier','secretaire'])) or is_super_admin())
  with check ((id = current_org_id() and a_role_asso(array['admin_asso','tresorier','secretaire'])) or is_super_admin());

-- PROFILES -----------------------------------------------------------------------------
drop policy if exists profiles_self_or_org on public.profiles;
create policy profiles_self_or_org on public.profiles for select
  using (id = auth.uid() or organisation_id = current_org_id() or is_super_admin());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ADHERENTS ----------------------------------------------------------------------------
drop policy if exists adherents_same_org on public.adherents;
create policy adherents_same_org on public.adherents for all
  using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());
drop policy if exists adherents_self_read on public.adherents;
create policy adherents_self_read on public.adherents for select using (user_id = auth.uid());
drop policy if exists adherents_self_update on public.adherents;
create policy adherents_self_update on public.adherents for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ADHESIONS ----------------------------------------------------------------------------
drop policy if exists adhesions_same_org on public.adhesions;
create policy adhesions_same_org on public.adhesions for all
  using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());
drop policy if exists adhesions_self_read on public.adhesions;
create policy adhesions_self_read on public.adhesions for select
  using (adherent_id in (select id from adherents where user_id = auth.uid()));

-- COURS --------------------------------------------------------------------------------
drop policy if exists cours_same_org on public.cours;
create policy cours_same_org on public.cours for all
  using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());
drop policy if exists cours_read_public on public.cours;
create policy cours_read_public on public.cours for select
  using (exists (select 1 from organisations o where o.id = cours.organisation_id and o.publie = true));

-- REGLEMENTS (trésorerie) --------------------------------------------------------------
drop policy if exists reglements_same_org on public.reglements;
create policy reglements_same_org on public.reglements for all
  using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());

-- PIECES ADHERENT ----------------------------------------------------------------------
drop policy if exists pieces_same_org on public.pieces_adherent;
create policy pieces_same_org on public.pieces_adherent for all
  using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());
drop policy if exists pieces_self_read on public.pieces_adherent;
create policy pieces_self_read on public.pieces_adherent for select
  using (adherent_id in (select id from adherents where user_id = auth.uid()));
-- L'adhérent dépose ses pièces mais ne peut pas les marquer « reçue » (validation club).
drop policy if exists pieces_self_upload on public.pieces_adherent;
create policy pieces_self_upload on public.pieces_adherent for update
  using (adherent_id in (select id from adherents where user_id = auth.uid()))
  with check (adherent_id in (select id from adherents where user_id = auth.uid()) and statut <> 'recue');

-- QUESTIONNAIRES DE SANTÉ (donnée sensible, art. 9) ------------------------------------
-- Lecture réservée au président et au secrétaire — jamais au trésorier ni à l'encadrant —
-- ou à l'adhérent lui-même.
drop policy if exists qs_read_org on public.questionnaires_sante;
create policy qs_read_org on public.questionnaires_sante for select
  using (organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire']));
drop policy if exists qs_read_self on public.questionnaires_sante;
create policy qs_read_self on public.questionnaires_sante for select
  using (exists (select 1 from adherents a where a.id = questionnaires_sante.adherent_id and a.user_id = auth.uid()));

-- PRESENCES ----------------------------------------------------------------------------
drop policy if exists presences_same_org on public.presences;
create policy presences_same_org on public.presences for all
  using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());

-- AUDIT LOG (lecture seule, par club) --------------------------------------------------
drop policy if exists audit_read_org on public.audit_log;
create policy audit_read_org on public.audit_log for select
  using (organisation_id = current_org_id() or is_super_admin());

-- DROITS D'EXÉCUTION DES RPC SENSIBLES -------------------------------------------------
-- Postgres accorde EXECUTE à PUBLIC par défaut sur toute fonction : on referme
-- explicitement celles qui écrivent, en ne laissant que le rôle qui en a besoin.
-- (current_org_id / is_super_admin restent ouverts : ils sont appelés DANS les policies.)
revoke execute on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) from anon, public;
revoke execute on function public.enregistrer_questionnaire_sante(uuid,text,date,jsonb,text,text,text,text) from anon, public;
revoke execute on function public.marquer_relance(uuid[]) from anon, public;
revoke execute on function public.claim_stripe_event(text,text,int) from anon, authenticated, public;

commit;
