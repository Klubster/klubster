-- Trace de la remise en banque d'un chèque. NULL = pas encore remis.
alter table public.reglements add column if not exists remis_le timestamptz;

-- Marque une liste de chèques comme remis (bordereau imprimé). Réservé aux membres
-- de l'organisation : le filtre organisation_id empêche de toucher les chèques d'un autre club.
create or replace function public.marquer_cheques_remis(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_count integer;
begin
  select organisation_id into v_org from profiles where id = auth.uid();
  if v_org is null then
    -- super_admin : autorisé sans organisation rattachée
    if not coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false) then
      raise exception 'non autorise';
    end if;
  end if;

  update reglements r
    set remis_le = now()
  where r.id = any(p_ids)
    and r.mode = 'cheque'
    and r.remis_le is null
    and (v_org is null or r.organisation_id = v_org);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.marquer_cheques_remis(uuid[]) from public, anon;
grant execute on function public.marquer_cheques_remis(uuid[]) to authenticated;