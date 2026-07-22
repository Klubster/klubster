-- Fondations des emails automatiques : préférences par club + journal des envois.
--
-- Le journal sert deux buts : ne jamais envoyer deux fois la même relance à la même
-- personne, et faire respecter le plafond « au plus une relance tous les 7 jours par
-- adhérent » qui garantit qu'on ne harcèle personne. Les envois passent par la tâche
-- planifiée (service_role), qui écrit ici.

-- Préférences d'emails automatiques, par club. Clés absentes = valeurs par défaut du code
-- (voir src/lib/emails-config.ts). On stocke en jsonb pour ajouter des réglages sans
-- migration à chaque fois.
alter table public.organisations
  add column if not exists emails_config jsonb not null default '{}'::jsonb;

-- Journal des emails de cycle de vie (relances, rappels). On n'y trace PAS les
-- transactionnels (confirmation d'inscription…), qui sont toujours légitimes.
create table if not exists public.emails_journal (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  adherent_id uuid,
  destinataire text,
  motif text not null,
  envoye_le timestamptz not null default now()
);

-- Un même motif n'est jamais renvoyé deux fois à la même personne (ex. « pièces à 30 j »).
create unique index if not exists emails_journal_unique_motif
  on public.emails_journal (adherent_id, motif)
  where adherent_id is not null;

-- Pour le plafond « une relance / 7 j » et la lecture par club.
create index if not exists emails_journal_adherent on public.emails_journal (adherent_id, envoye_le);
create index if not exists emails_journal_org on public.emails_journal (organisation_id, envoye_le);

alter table public.emails_journal enable row level security;

-- Le club peut lire son propre journal ; l'écriture se fait en service_role (tâche
-- planifiée), qui contourne la RLS.
drop policy if exists emails_journal_read_org on public.emails_journal;
create policy emails_journal_read_org on public.emails_journal for select
  using (organisation_id = current_org_id() or is_super_admin());
