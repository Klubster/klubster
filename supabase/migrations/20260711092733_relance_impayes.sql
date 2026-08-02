-- Date de dernière relance : évite de harceler, affiche « relancé il y a X jours ».
alter table adhesions add column if not exists derniere_relance timestamptz;

-- Horodate la relance, réservé président/trésorier, borné à l'organisation de l'appelant.
create or replace function public.marquer_relance(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_org uuid; v_count int;
begin
  v_org := current_org_id();
  if not ((v_org is not null and a_role_asso(array['admin_asso','tresorier'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  update adhesions set derniere_relance = now()
  where id = any(p_ids)
    and (is_super_admin() or organisation_id = v_org);
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

grant execute on function public.marquer_relance(uuid[]) to authenticated;