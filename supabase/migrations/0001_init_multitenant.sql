-- Klubster — schéma multi-tenant initial (RÉFÉRENCE).
-- ⚠️ Déjà appliqué sur le projet Supabase "klubster" : NE PAS rejouer tel quel.
-- La base de prod fait foi. Les vraies politiques d'écriture s'appuient sur deux fonctions
-- d'aide déjà en place : current_org_id() (org de l'utilisateur connecté) et is_super_admin().
-- Politiques live : org_read_public / org_admin_write, cours_read_public / cours_same_org,
-- adherents_same_org, adhesions_same_org, profiles_self_or_org / profiles_self_update.
-- Ce fichier documente une version simplifiée du schéma pour la reprise du projet.
-- Isolation par organisation_id + RLS. Lecture publique des associations PUBLIÉES.

-- ============ Tables ============

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nom text not null,
  sport text,
  logo_url text,
  couleur_primaire text default '#189460',
  adresse text,
  email_contact text,
  telephone text,
  stripe_account_id text,
  abonnement_plan text default 'starter'
    check (abonnement_plan in ('starter','club','club_plus')),
  publie boolean not null default false,
  accroche text,
  presentation text,
  infos_pratiques text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id),
  organisation_id uuid references public.organisations (id),
  email text,
  nom text,
  prenom text,
  role text not null default 'adherent'
    check (role in ('super_admin','admin_asso','encadrant','adherent')),
  created_at timestamptz not null default now()
);

create table if not exists public.cours (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  nom text not null,
  description text,
  public_cible text,
  age_min int,
  age_max int,
  tarif_centimes int not null default 0,
  places_max int,
  creneaux jsonb default '[]'::jsonb,    -- [{jour, debut, fin, note?}]
  ordre int default 0
);

create table if not exists public.adherents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  nom text not null,
  prenom text not null,
  email text,
  telephone text,
  date_naissance date,
  created_at timestamptz not null default now()
);

create table if not exists public.adhesions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  adherent_id uuid not null references public.adherents (id),
  cours_id uuid references public.cours (id),
  saison text,
  montant_centimes int not null default 0,
  statut text not null default 'en_attente'
    check (statut in ('en_attente','paye','en_retard','rembourse','annule')),
  created_at timestamptz not null default now()
);

-- ============ RLS ============

alter table public.organisations enable row level security;
alter table public.cours enable row level security;
alter table public.adherents enable row level security;
alter table public.adhesions enable row level security;
alter table public.profiles enable row level security;

-- Lecture publique des associations publiées (pour la vitrine).
drop policy if exists "org_public_read" on public.organisations;
create policy "org_public_read" on public.organisations
  for select using (publie = true);

-- Lecture publique des cours d'une association publiée.
drop policy if exists "cours_public_read" on public.cours;
create policy "cours_public_read" on public.cours
  for select using (
    exists (
      select 1 from public.organisations o
      where o.id = cours.organisation_id and o.publie = true
    )
  );

-- NB : adherents / adhesions / profiles n'ont PAS de politique de lecture publique.
-- Les accès authentifiés (admin asso, encadrant, adhérent, super-admin) seront ajoutés
-- au jalon « Auth & rôles » via auth.uid() et le profil/role de l'utilisateur.
