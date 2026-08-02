
-- 1) Config du formulaire d'inscription par club (pages, champs, pièces)
alter table public.organisations
  add column if not exists form_config jsonb not null default '{"pages":[],"pieces":[]}'::jsonb;

-- 2) Lien adhérent ↔ compte, et réponses personnalisées
alter table public.adherents
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists infos jsonb not null default '{}'::jsonb;
create index if not exists adherents_user_id_idx on public.adherents(user_id);

-- 3) Pièces du dossier d'adhésion
create table if not exists public.pieces_adherent (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  adherent_id uuid not null references public.adherents(id) on delete cascade,
  cle text not null,
  label text not null,
  statut text not null default 'manquante' check (statut in ('manquante','fournie','par_email')),
  chemin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pieces_adherent_adh_idx on public.pieces_adherent(adherent_id);
alter table public.pieces_adherent enable row level security;

-- 4) RLS — accès membre à son propre dossier
drop policy if exists "adherents_self_read" on public.adherents;
create policy "adherents_self_read" on public.adherents
  for select using (user_id = auth.uid());
drop policy if exists "adherents_self_update" on public.adherents;
create policy "adherents_self_update" on public.adherents
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "adhesions_self_read" on public.adhesions;
create policy "adhesions_self_read" on public.adhesions
  for select using (adherent_id in (select id from public.adherents where user_id = auth.uid()));

-- pieces : admin du club (same org) + membre (son dossier) + super-admin
drop policy if exists "pieces_same_org" on public.pieces_adherent;
create policy "pieces_same_org" on public.pieces_adherent
  for all using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());
drop policy if exists "pieces_self" on public.pieces_adherent;
create policy "pieces_self" on public.pieces_adherent
  for all using (adherent_id in (select id from public.adherents where user_id = auth.uid()))
  with check (adherent_id in (select id from public.adherents where user_id = auth.uid()));

-- public read des pièces ? non. lecture publique du form_config via org_read_public (déjà : organisations publiées lisibles).

-- 5) Rôle du profil depuis les métadonnées (défaut adherent), à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, prenom, nom, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'prenom', ''),
    nullif(new.raw_user_meta_data->>'nom', ''),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'adherent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
