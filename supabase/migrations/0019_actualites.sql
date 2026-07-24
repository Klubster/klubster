-- 0019 — Actualités multiples datées (« La vie du club »).
--
-- Jusqu'ici un club n'avait qu'UNE actualité (organisations.actualite, jsonb) écrasée à
-- chaque publication. Cette table donne un fil daté : la vitrine affiche les trois plus
-- récentes, le bandeau « À la une » reprend la dernière, et chaque actu a sa page de
-- détail. L'ancien champ n'est plus géré par le cockpit — le bandeau le lit encore en
-- repli pour les clubs existants qui n'ont rien publié dans la table.

create table public.actualites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  titre text not null,
  texte text not null,
  image_url text,
  publie_le date not null default current_date,
  created_at timestamptz not null default now()
);

-- La vitrine lit « les N plus récentes du club » : l'index colle à cette requête.
create index actualites_org_publie_le on public.actualites (organisation_id, publie_le desc);

alter table public.actualites enable row level security;

-- Lecture publique : contenu de vitrine, au même titre que les cours d'un club publié.
create policy actualites_read_public on public.actualites for select
  using (true);

-- Écriture réservée aux membres du club — même doctrine que 0006 (`current_org_id()`,
-- super_admin inclus). La Server Action vérifie EN PLUS la permission « site » :
-- la policy n'est jamais la seule garde, et inversement.
create policy actualites_insert_org on public.actualites for insert to authenticated
  with check (organisation_id = public.current_org_id() or public.is_super_admin());
create policy actualites_update_org on public.actualites for update to authenticated
  using (organisation_id = public.current_org_id() or public.is_super_admin())
  with check (organisation_id = public.current_org_id() or public.is_super_admin());
create policy actualites_delete_org on public.actualites for delete to authenticated
  using (organisation_id = public.current_org_id() or public.is_super_admin());

-- Droits EXPLICITES (doctrine 0013/0015) : ne jamais s'en remettre aux défauts.
-- `anon` lit (vitrine), `authenticated` lit et écrit (le périmètre exact est tenu
-- par les policies ci-dessus), la service_role garde son accès complet.
revoke all on table public.actualites from anon, authenticated, public;
grant select on table public.actualites to anon, authenticated;
grant insert, update, delete on table public.actualites to authenticated;
