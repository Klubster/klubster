-- 20260826080000 — Mode de paiement « virement » (demande CR Dance Studio, 26/08/2026).
--
-- Des clubs encaissent aussi par virement SEPA. Jusqu'ici la base ne connaissait que
-- cheque/especes/en_ligne/autre (+ remboursement) : le bureau devait tracer un virement
-- en « autre », et le total par mode du cockpit le noyait dans les aides diverses.
--
-- RETOUR ARRIÈRE : rejouer la contrainte de 20260803230000 et la définition 0013
-- d'enregistrer_reglement.

alter table public.reglements drop constraint if exists reglements_mode_check;
alter table public.reglements add constraint reglements_mode_check
  check (mode in ('cheque', 'especes', 'en_ligne', 'virement', 'autre', 'remboursement'));

-- Même corps que 0013 ; seule la liste blanche des modes change (+ 'virement').
CREATE OR REPLACE FUNCTION public.enregistrer_reglement(p_adhesion_id uuid, p_montant_centimes integer, p_mode text, p_note text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_montant int; v_regle int; v_mode text;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or not ((v_org = current_org_id() and a_role_asso(array['admin_asso','tresorier'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  if p_montant_centimes is null or p_montant_centimes <= 0 then raise exception 'Montant invalide.'; end if;
  v_mode := case when p_mode in ('cheque','especes','en_ligne','virement','autre') then p_mode else 'autre' end;
  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
  values (v_org, p_adhesion_id, p_montant_centimes, v_mode, nullif(trim(coalesce(p_note, '')), ''));
  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, auth.uid(), 'reglement_ajoute', 'adhesion', p_adhesion_id, jsonb_build_object('montant_centimes', p_montant_centimes, 'mode', v_mode));
  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  if v_regle >= v_montant - 5 then update adhesions set statut = 'paye' where id = p_adhesion_id; end if;
  return greatest(v_montant - v_regle, 0);
end;
$function$;
revoke execute on function public.enregistrer_reglement(uuid, integer, text, text) from anon, public;
grant execute on function public.enregistrer_reglement(uuid, integer, text, text) to authenticated;
