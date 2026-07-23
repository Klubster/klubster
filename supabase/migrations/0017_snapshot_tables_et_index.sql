-- 0017 — SNAPSHOT DES TABLES NON VERSIONNÉES + INDEX MANQUANTS
-- Audit interne 2026-07-23 (P1-3 et P1-4).
--
-- Problème : 6 tables vivaient uniquement en prod (créées à la main avant la
-- discipline de migrations) : reglements, pieces_adherent, questionnaires_sante,
-- presences, audit_log, stripe_events. Les migrations 0005+ les ALTÈRENT sans
-- jamais les créer → un environnement reconstruit depuis ce dossier échouait,
-- ou pire : tournait SANS l'index unique reglements_stripe_ref_uniq, qui est le
-- verrou d'atomicité de l'idempotence des règlements webhook (le check-then-insert
-- d'enregistrer_reglement_webhook n'est atomique QUE grâce à lui).
--
-- DDL extraite du schéma de prod le 2026-07-23 (information_schema + pg_constraint
-- + pg_indexes). Tout est en IF NOT EXISTS : no-op complet sur la prod.
--
-- ⚠️ Reconstruction from scratch : ce fichier arrive en 17e position alors que
-- 0005/0006/0008 référencent déjà ces tables. Pour un environnement neuf,
-- appliquer ce fichier EN PREMIER (supabase migration repair / copie en 0000_),
-- c'est documenté ici plutôt que de renuméroter un historique déjà appliqué.

-- ============================================================
-- 1) TABLES
-- ============================================================

create table if not exists public.reglements (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id),
  adhesion_id      uuid not null references public.adhesions(id),
  montant_centimes integer not null check (montant_centimes > 0),
  mode             text not null default 'cheque'
                     check (mode in ('cheque','especes','en_ligne','autre')),
  note             text,
  created_at       timestamptz not null default now(),
  remis_le         timestamptz,
  stripe_ref       text
);

create table if not exists public.pieces_adherent (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  adherent_id     uuid not null references public.adherents(id) on delete cascade,
  cle             text not null,
  label           text not null,
  statut          text not null default 'manquante'
                    check (statut in ('manquante','fournie','par_email')),
  chemin          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.questionnaires_sante (
  id                 uuid primary key default gen_random_uuid(),
  organisation_id    uuid not null references public.organisations(id) on delete cascade,
  adherent_id        uuid references public.adherents(id) on delete cascade,
  adhesion_id        uuid references public.adhesions(id) on delete set null,
  type               text not null check (type in ('adulte','mineur')),
  date_naissance     date,
  reponses           jsonb not null default '{}'::jsonb,
  resultat           text not null check (resultat in ('atteste_negatif','certificat_requis')),
  signataire_nom     text,
  signataire_qualite text not null default 'adherent'
                       check (signataire_qualite in ('adherent','representant_legal')),
  signature          text,
  created_at         timestamptz not null default now()
);

create table if not exists public.presences (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  adherent_id     uuid not null references public.adherents(id) on delete cascade,
  date            date not null default current_date,
  created_at      timestamptz not null default now(),
  unique (adherent_id, date)
);

create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  actor_user_id   uuid,
  action          text not null,
  entity_type     text,
  entity_id       uuid,
  details         jsonb,
  created_at      timestamptz not null default now()
);

create table if not exists public.stripe_events (
  event_id        text primary key,
  type            text,
  recu_le         timestamptz not null default now(),
  statut          text not null default 'traite',
  tentatives      integer not null default 1,
  derniere_erreur text,
  traite_le       timestamptz,
  verrou_expire   timestamptz
);

-- RLS : activée sur toutes (les policies vivent dans 0006/0008/0012).
alter table public.reglements           enable row level security;
alter table public.pieces_adherent      enable row level security;
alter table public.questionnaires_sante enable row level security;
alter table public.presences            enable row level security;
alter table public.audit_log            enable row level security;
alter table public.stripe_events        enable row level security;

-- ============================================================
-- 2) INDEX EXISTANTS EN PROD, JAMAIS VERSIONNÉS
-- ============================================================

-- LE verrou d'argent : unicité des règlements Stripe (idempotence webhook).
create unique index if not exists reglements_stripe_ref_uniq
  on public.reglements (stripe_ref) where (stripe_ref is not null);

create index if not exists reglements_adhesion_idx
  on public.reglements (adhesion_id);

create index if not exists pieces_adherent_adh_idx
  on public.pieces_adherent (adherent_id);

create index if not exists idx_qs_adherent
  on public.questionnaires_sante (adherent_id);

create index if not exists idx_qs_org
  on public.questionnaires_sante (organisation_id);

create index if not exists audit_log_org_date
  on public.audit_log (organisation_id, created_at desc);

create index if not exists adhesions_stripe_pi_idx
  on public.adhesions (stripe_payment_intent) where (stripe_payment_intent is not null);

-- ============================================================
-- 3) INDEX FK MANQUANTS (P1-3, vérifiés absents en prod)
-- Les policies RLS filtrent sur organisation_id / adherent_id, et la jauge
-- de places de register_adherent_full compte sur cours_id : sans index,
-- seq scan à chaque requête dès que les tables grossissent.
-- ============================================================

create index if not exists adhesions_adherent_idx
  on public.adhesions (adherent_id);

-- Couvre la jauge de places (cours_id + saison + statut) ET la FK.
create index if not exists adhesions_cours_saison_statut_idx
  on public.adhesions (cours_id, saison, statut);

create index if not exists reglements_org_idx
  on public.reglements (organisation_id);

create index if not exists pieces_adherent_org_idx
  on public.pieces_adherent (organisation_id);

create index if not exists presences_org_idx
  on public.presences (organisation_id);

create index if not exists qs_adhesion_idx
  on public.questionnaires_sante (adhesion_id);

analyze public.adhesions, public.reglements, public.pieces_adherent,
        public.presences, public.questionnaires_sante;
