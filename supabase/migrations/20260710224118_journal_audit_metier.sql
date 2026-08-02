-- Journal d'audit métier : « qui a fait quoi, et quand ». Append-only côté client
-- (aucune politique d'écriture directe ; seules les fonctions SECURITY DEFINER écrivent).
-- Lisible par les admins de l'organisation.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  actor_user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_org_date on public.audit_log (organisation_id, created_at desc);

alter table public.audit_log enable row level security;
drop policy if exists audit_read_org on public.audit_log;
create policy audit_read_org on public.audit_log
  for select using (organisation_id = current_org_id() or is_super_admin());

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- Les RPC financières consignent chaque écriture. actor = utilisateur connecté (auth.uid()),
-- null pour les écritures serveur (webhook Stripe via service_role).
create or replace function public.enregistrer_reglement(p_adhesion_id uuid, p_montant_centimes integer, p_mode text, p_note text default null)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_montant int; v_regle int; v_mode text;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  if p_montant_centimes is null or p_montant_centimes <= 0 then raise exception 'Montant invalide.'; end if;
  v_mode := case when p_mode in ('cheque','especes','en_ligne','autre') then p_mode else 'autre' end;

  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
  values (v_org, p_adhesion_id, p_montant_centimes, v_mode, nullif(trim(coalesce(p_note, '')), ''));

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, auth.uid(), 'reglement_ajoute', 'adhesion', p_adhesion_id,
          jsonb_build_object('montant_centimes', p_montant_centimes, 'mode', v_mode));

  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  if v_regle >= v_montant - 5 then update adhesions set statut = 'paye' where id = p_adhesion_id; end if;
  return greatest(v_montant - v_regle, 0);
end;
$function$;

create or replace function public.marquer_cheques_remis(p_ids uuid[])
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_count integer;
begin
  select organisation_id into v_org from profiles where id = auth.uid();
  if v_org is null then
    if not coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false) then raise exception 'non autorise'; end if;
  end if;
  update reglements r set remis_le = now()
  where r.id = any(p_ids) and r.mode = 'cheque' and r.remis_le is null and (v_org is null or r.organisation_id = v_org);
  get diagnostics v_count = row_count;

  if v_count > 0 and v_org is not null then
    insert into audit_log (organisation_id, actor_user_id, action, entity_type, details)
    values (v_org, auth.uid(), 'cheques_remis', 'reglement', jsonb_build_object('nombre', v_count));
  end if;
  return v_count;
end;
$function$;

create or replace function public.marquer_encaisse(p_adhesion_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_montant int; v_regle int; v_reste int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  v_reste := v_montant - v_regle;
  if v_reste > 0 then
    insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
    values (v_org, p_adhesion_id, v_reste, 'autre', 'Soldé (encaissement manuel)');
  end if;
  update adhesions set statut = 'paye' where id = p_adhesion_id;

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, auth.uid(), 'adhesion_soldee', 'adhesion', p_adhesion_id, jsonb_build_object('reste_solde_centimes', greatest(v_reste,0)));
end;
$function$;