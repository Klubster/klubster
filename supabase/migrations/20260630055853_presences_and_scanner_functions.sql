
create table if not exists public.presences (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  adherent_id uuid not null references public.adherents(id) on delete cascade,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (adherent_id, date)
);
alter table public.presences enable row level security;
drop policy if exists "presences_same_org" on public.presences;
create policy "presences_same_org" on public.presences
  for all using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());

-- Vérifier un adhérent (scanner) : dossier complet ? règlement ok ?
create or replace function public.verifier_adherent(p_adherent_id uuid)
returns table(prenom text, nom text, cours text, regle boolean, pieces_manquantes int, present_aujourdhui boolean)
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null then raise exception 'Adhérent introuvable.'; end if;
  if not (v_org = current_org_id() or is_super_admin()) then raise exception 'Non autorisé.'; end if;
  return query
  select a.prenom, a.nom,
    (select c.nom from adhesions ad join cours c on c.id = ad.cours_id where ad.adherent_id = a.id order by ad.created_at desc limit 1),
    coalesce((select ad.statut = 'paye' from adhesions ad where ad.adherent_id = a.id order by ad.created_at desc limit 1), false),
    (select count(*)::int from pieces_adherent p where p.adherent_id = a.id and p.statut = 'manquante'),
    exists(select 1 from presences pr where pr.adherent_id = a.id and pr.date = current_date)
  from adherents a where a.id = p_adherent_id;
end; $$;
grant execute on function public.verifier_adherent(uuid) to authenticated;

-- Marquer présent (appel)
create or replace function public.marquer_present(p_adherent_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null or not (v_org = current_org_id() or is_super_admin()) then raise exception 'Non autorisé.'; end if;
  insert into presences (organisation_id, adherent_id, date) values (v_org, p_adherent_id, current_date)
  on conflict (adherent_id, date) do nothing;
end; $$;
grant execute on function public.marquer_present(uuid) to authenticated;

-- Marquer un règlement (chèque/espèces) comme encaissé
create or replace function public.marquer_encaisse(p_adhesion_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organisation_id into v_org from adhesions where id = p_adhesion_id;
  if v_org is null or not (v_org = current_org_id() or is_super_admin()) then raise exception 'Non autorisé.'; end if;
  update adhesions set statut = 'paye' where id = p_adhesion_id;
end; $$;
grant execute on function public.marquer_encaisse(uuid) to authenticated;
