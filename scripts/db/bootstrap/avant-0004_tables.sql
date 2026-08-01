-- KLUBSTER-BOOTSTRAP-HARNAIS — NE JAMAIS DÉPLOYER, NE JAMAIS APPLIQUER SUR UNE BASE EXISTANTE.
--
-- Second volet des prérequis du harnais. Comme `avant-0003_fonctions.sql`, ce fichier
-- n'est pas une migration : il ne fait pas partie de l'historique de production et
-- `supabase db push` ne doit jamais le voir. Lire l'en-tête de l'autre fichier pour le
-- détail du risque qui a justifié leur sortie de `supabase/migrations/`.
--
-- Six tables sont UTILISÉES avant d'être CRÉÉES : `stripe_events` dès `0005`,
-- `pieces_adherent` dès `0004`, `audit_log`, `presences`, `questionnaires_sante` et
-- `reglements` dès `0006`. Toutes naissent dans `0017_snapshot_tables_et_index.sql`,
-- dont le nom dit lui-même qu'il s'agit d'un instantané pris après coup.
--
-- POINT D'INSERTION : AVANT `0004`, d'où le nom du fichier. Il ne peut pas être plus
-- tôt : ces tables portent des clés étrangères vers `organisations` et `adherents`, que
-- `0001_init_multitenant.sql` crée. L'essai avant `0001` a rendu
-- `relation "public.organisations" does not exist`. Un bootstrap n'est donc pas un bloc
-- que l'on pose en tête : c'est une suite de pièces à intercaler à des endroits précis,
-- et le lanceur lit ces endroits dans les noms de fichiers.
--
-- LES DÉFINITIONS SONT EXTRAITES DE `0017`, PAS TRANSCRITES. Une transcription
-- approximative créerait deux vérités pour une seule table, et le harnais validerait
-- alors un schéma qui n'existe nulle part.
-- `tests/db/01-tables-bootstrap-conformes.sql` compare, à la fin de la chaîne, le schéma
-- réel de ces six tables à celui que `0017` déclare — colonnes, types, valeurs par
-- défaut, NOT NULL, contraintes, clés étrangères, index, RLS. `create table if not
-- exists` ne dit RIEN de tout cela : il se tait si la table existe déjà, quelle que soit
-- sa forme. C'est précisément le silence qu'il faut rompre, sans quoi une définition
-- temporaire pourrait masquer durablement une modification ultérieure.

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

