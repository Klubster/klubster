-- 0018 — DURCISSEMENT RLS + DIVERS
-- Audit interne 2026-07-23 (P2-1, P2-2, P2-5, + unicité domaine_custom).
--
-- 1) Initplan : les 8 policies signalées par l'advisor auth_rls_initplan
--    ré-évaluaient auth.uid() (et current_org_id()/is_super_admin()) POUR
--    CHAQUE LIGNE. Envelopper dans (select …) fait de l'appel un InitPlan
--    évalué une fois par requête (référentiel Supabase : 100×+ sur les
--    grosses tables). Définitions reprises à l'identique depuis pg_policies
--    en prod, seule l'enveloppe change.
-- 2) search_path figé sur les 2 fonctions trigger de 0012 qui l'omettaient.
-- 3) Buckets publics : les policies SELECT larges permettaient de LISTER
--    tous les fichiers (tous clubs confondus). Elles sont inutiles :
--    un bucket public sert ses fichiers par URL sans policy SELECT, et le
--    seul .list() du code passe par service_role (bucket pieces). Supprimées.
-- 4) organisations.domaine_custom n'avait AUCUNE contrainte d'unicité :
--    le chemin « update en erreur = deja_pris » de connecterDomaine ne
--    pouvait jamais se déclencher. Index unique partiel ajouté.

-- ============================================================
-- 1) POLICIES : auth.uid() → (select auth.uid())
-- ============================================================

drop policy if exists adherents_self_read on public.adherents;
create policy adherents_self_read on public.adherents
  for select using (user_id = (select auth.uid()));

drop policy if exists adherents_self_update on public.adherents;
create policy adherents_self_update on public.adherents
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists adhesions_self_read on public.adhesions;
create policy adhesions_self_read on public.adhesions
  for select using (
    adherent_id in (
      select a.id from public.adherents a
      where a.user_id = (select auth.uid())
    )
  );

drop policy if exists pieces_self_read on public.pieces_adherent;
create policy pieces_self_read on public.pieces_adherent
  for select using (
    adherent_id in (
      select a.id from public.adherents a
      where a.user_id = (select auth.uid())
    )
  );

drop policy if exists pieces_self_upload on public.pieces_adherent;
create policy pieces_self_upload on public.pieces_adherent
  for update using (
    adherent_id in (
      select a.id from public.adherents a
      where a.user_id = (select auth.uid())
    )
  )
  with check (
    adherent_id in (
      select a.id from public.adherents a
      where a.user_id = (select auth.uid())
    )
    and statut <> 'recue'
  );

drop policy if exists profiles_self_or_org on public.profiles;
create policy profiles_self_or_org on public.profiles
  for select using (
    id = (select auth.uid())
    or organisation_id = (select public.current_org_id())
    or (select public.is_super_admin())
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists qs_read_self on public.questionnaires_sante;
create policy qs_read_self on public.questionnaires_sante
  for select using (
    exists (
      select 1 from public.adherents a
      where a.id = questionnaires_sante.adherent_id
        and a.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 2) search_path des fonctions trigger de 0012
-- ============================================================

alter function public.proteger_colonnes_piece()    set search_path = 'public';
alter function public.proteger_colonnes_adherent() set search_path = 'public';

-- ============================================================
-- 3) Buckets publics : suppression des policies de LISTING
-- (le service par URL publique ne passe pas par la RLS)
-- ============================================================

drop policy if exists actualites_public_read on storage.objects;
drop policy if exists logos_public_read      on storage.objects;
drop policy if exists sections_public_read   on storage.objects;

-- ============================================================
-- 4) Unicité du domaine custom
-- ============================================================

create unique index if not exists organisations_domaine_custom_uniq
  on public.organisations (lower(domaine_custom))
  where (domaine_custom is not null);
