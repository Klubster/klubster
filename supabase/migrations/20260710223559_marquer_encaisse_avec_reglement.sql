-- « Encaisser le solde » ne doit jamais passer une adhésion à « payé » sans trace :
-- on enregistre un règlement du montant restant (mode 'autre'), puis on solde. La
-- comptabilité reste vérifiable : total des règlements = montant dû.
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
end;
$function$;