-- Tables déclarées tardivement — second volet de la reconstructibilité.
--
-- Six tables sont UTILISÉES avant d'être CRÉÉES : `stripe_events` dès `0005`,
-- `pieces_adherent` dès `0004`, `audit_log`, `presences`, `questionnaires_sante` et
-- `reglements` dès `0006`. Toutes naissent dans `0017_snapshot_tables_et_index.sql`,
-- dont le nom dit lui-même qu'il s'agit d'un instantané pris après coup.
--
-- POURQUOI `0001a` ET NON `0000`. Ces tables portent des clés étrangères vers
-- `organisations` et `adherents`, créées par `0001_init_multitenant.sql`. Les déclarer
-- avant lui est impossible — l'essai a rendu `relation "public.organisations" does not
-- exist`. Elles doivent donc s'intercaler APRÈS `0001` et AVANT `0004`, premier fichier
-- qui s'en sert.
--
-- L'ordre d'application est l'ordre alphabétique du nom de fichier, et
-- `0001_init… < 0001a_tables… < 0002…` : le tiret bas (0x5F) précède le « a » (0x61).
-- Aucun fichier existant n'est renommé — renuméroter réécrirait un historique déjà
-- appliqué en production.
--
-- Les définitions sont RECOPIÉES TELLES QUELLES de `0017`, par extraction automatique et
-- non à la main : une transcription approximative créerait deux vérités pour une seule
-- table. Elles portent déjà `if not exists` — `0017` les rejouera sans effet, et sur une
-- base existante ce fichier entier est inerte.
--
-- Retour arrière : supprimer ce fichier. Il n'a d'effet que sur une base vide.

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

