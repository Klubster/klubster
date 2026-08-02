-- Un remboursement Stripe doit rouvrir le solde de l'adhérent, sans effacer l'historique :
-- on inscrit un règlement NÉGATIF (mode 'remboursement'), on recalcule, et si le total
-- réglé ne couvre plus le montant dû, l'adhésion repasse « en attente ». Idempotent par
-- référence d'événement (un remboursement rejoué ne se dédouble pas).
create or replace function public.enregistrer_remboursement_webhook(p_adhesion_id uuid, p_montant_centimes integer, p_ref text default null)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_montant int; v_regle int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or p_montant_centimes is null or p_montant_centimes <= 0 then return; end if;
  if p_ref is not null and exists (select 1 from reglements where stripe_ref = p_ref) then return; end if;

  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note, stripe_ref)
  values (v_org, p_adhesion_id, -p_montant_centimes, 'remboursement', 'Remboursement (Stripe)', p_ref);

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, null, 'remboursement', 'adhesion', p_adhesion_id, jsonb_build_object('montant_centimes', p_montant_centimes));

  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  if v_regle < v_montant - 5 then
    update adhesions set statut = 'en_attente' where id = p_adhesion_id and statut = 'paye';
  end if;
end;
$function$;

revoke all on function public.enregistrer_remboursement_webhook(uuid, integer, text) from public, anon;
grant execute on function public.enregistrer_remboursement_webhook(uuid, integer, text) to service_role;