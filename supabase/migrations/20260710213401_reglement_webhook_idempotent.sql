-- Idempotence au niveau du règlement : si un événement Stripe est rejoué après un
-- enregistrement réussi mais avant le marquage « traité », il ne doit pas créer un
-- second règlement. On mémorise la référence de l'événement et on ignore les doublons.
alter table public.reglements add column if not exists stripe_ref text;
create unique index if not exists reglements_stripe_ref_uniq
  on public.reglements (stripe_ref) where stripe_ref is not null;

create or replace function public.enregistrer_reglement_webhook(p_adhesion_id uuid, p_montant_centimes integer, p_note text default null, p_ref text default null)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_montant int; v_regle int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or p_montant_centimes is null or p_montant_centimes <= 0 then return; end if;

  -- Déjà enregistré pour cet événement ? On sort sans rien faire.
  if p_ref is not null and exists (select 1 from reglements where stripe_ref = p_ref) then
    return;
  end if;

  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note, stripe_ref)
  values (v_org, p_adhesion_id, p_montant_centimes, 'en_ligne', nullif(trim(coalesce(p_note, '')), ''), p_ref);

  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  -- « payé » seulement si le total réglé couvre le montant dû (tolérance d'arrondi 5c pour le 3-fois).
  if v_regle >= v_montant - 5 then update adhesions set statut = 'paye' where id = p_adhesion_id; end if;
end;
$function$;

revoke all on function public.enregistrer_reglement_webhook(uuid, integer, text, text) from public, anon;
grant execute on function public.enregistrer_reglement_webhook(uuid, integer, text, text) to service_role;