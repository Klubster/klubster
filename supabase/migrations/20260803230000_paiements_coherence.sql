-- 20260803230000 — Paiements : la base cesse de contredire le code, et une seule
-- vérité financière.
--
-- TROIS PANNES RÉELLES, REPRODUITES SUR LA BASE DE DÉVELOPPEMENT :
--
-- 1. TOUT REMBOURSEMENT EN LIGNE ÉCHOUAIT. `enregistrer_remboursement_webhook`
--    insère un règlement NÉGATIF en mode 'remboursement' — deux valeurs que les
--    contraintes de `reglements` interdisaient (`montant_centimes > 0`, mode sans
--    'remboursement'). Le webhook `charge.refunded` levait donc une erreur SQL,
--    répondait 500, Stripe rejouait en boucle, et l'argent rendu n'était JAMAIS
--    écrit en base : l'adhésion restait « payée » après remboursement.
--
-- 2. LE COCKPIT COMPTAIT TOUTES LES SAISONS, ET APPELAIT « ENCAISSÉ » DE L'ARGENT
--    JAMAIS REÇU. `cockpit_stats` comptait les statuts sans borne de saison, et sa
--    « trésorerie » sommait le MONTANT DÛ des adhésions payées — pas les règlements.
--    Le libellé « X € encaissés cette saison » était doublement faux.
--
-- 3. `marquer_cheques_remis` appelée par un profil sans organisation (super-admin)
--    levait TOUT filtre : n'importe quel identifiant fourni était marqué remis,
--    quel que soit le club.
--
-- RETOUR ARRIÈRE : rejouer les définitions de 0013 (`cockpit_stats`,
-- `enregistrer_remboursement_webhook`, `marquer_cheques_remis`) et les deux
-- contraintes de 0017 sur `reglements`.

-- ——— 1. Les contraintes acceptent ce que le produit fait ————————————————
--
-- Un règlement peut être négatif : c'est un remboursement, et il porte le mode
-- 'remboursement'. Zéro reste interdit — une ligne à 0 ne veut rien dire.

alter table public.reglements drop constraint if exists reglements_montant_centimes_check;
alter table public.reglements add constraint reglements_montant_centimes_check
  check (montant_centimes <> 0);

alter table public.reglements drop constraint if exists reglements_mode_check;
alter table public.reglements add constraint reglements_mode_check
  check (mode in ('cheque', 'especes', 'en_ligne', 'autre', 'remboursement'));

-- ——— 2. Le remboursement aboutit, et le statut suit ————————————————————
--
-- Même corps que 0013, plus la sortie d'état complète : remboursé en totalité
-- (au seuil de tolérance de 5 centimes près) → statut 'rembourse' ; remboursé en
-- partie → l'adhésion redevient 'en_attente' du solde. C'était le seul chemin
-- qui ramenait une adhésion de 'paye' vers autre chose — il ne fonctionnait pas.

create or replace function public.enregistrer_remboursement_webhook(
  p_adhesion_id uuid, p_montant_centimes integer, p_ref text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
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
  if v_regle <= 5 then
    -- tout (ou presque tout) a été rendu : l'adhésion est remboursée
    update adhesions set statut = 'rembourse' where id = p_adhesion_id and statut in ('paye', 'en_attente', 'en_retard');
  elsif v_regle < v_montant - 5 then
    -- remboursement partiel : le solde redevient dû
    update adhesions set statut = 'en_attente' where id = p_adhesion_id and statut = 'paye';
  end if;
end;
$function$;

revoke execute on function public.enregistrer_remboursement_webhook(uuid, integer, text) from anon, authenticated, public;

-- ——— 3. Le cockpit dit la vérité de LA saison ————————————————————————————
--
-- Compteurs bornés à la saison courante du club, et « trésorerie » = somme NETTE
-- des règlements rattachés aux adhésions de la saison — de l'argent effectivement
-- reçu, remboursements déduits.

-- Signature et forme de retour inchangées (equipage compris) : seuls le périmètre
-- (saison courante) et la définition de la trésorerie changent.
create or replace function public.cockpit_stats(p_slug text)
returns table(equipage integer, en_attente integer, en_retard integer, paye integer, tresorerie_centimes bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_org uuid; v_saison text;
begin
  select id into v_org from organisations where slug = p_slug;
  if v_org is null then raise exception 'Association introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  v_saison := saison_courante(v_org);

  return query
  select
    (select count(*)::int from adherents a where a.organisation_id = v_org),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.saison = v_saison and ad.statut = 'en_attente'),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.saison = v_saison and ad.statut = 'en_retard'),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.saison = v_saison and ad.statut = 'paye'),
    -- l'argent réellement reçu cette saison, remboursements déduits
    (select coalesce(sum(r.montant_centimes), 0)::bigint
       from reglements r join adhesions a2 on a2.id = r.adhesion_id
      where a2.organisation_id = v_org and a2.saison = v_saison);
end;
$function$;

revoke execute on function public.cockpit_stats(text) from anon, public;
grant execute on function public.cockpit_stats(text) to authenticated;

-- ——— 4. La remise de chèques reste dans son club ————————————————————————

-- Signature et type de retour (integer : nombre de chèques marqués) inchangés.
create or replace function public.marquer_cheques_remis(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_org uuid; v_n integer;
begin
  select organisation_id into v_org from profiles where id = auth.uid();
  -- Un profil sans organisation n'a un droit global QUE s'il est super-admin.
  if v_org is null and not coalesce(is_super_admin(), false) then
    raise exception 'Non autorisé.';
  end if;
  update reglements r set remis_le = now()
  where r.id = any(p_ids) and r.mode = 'cheque' and r.remis_le is null
    and (v_org is null or r.organisation_id = v_org);
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

revoke execute on function public.marquer_cheques_remis(uuid[]) from anon, public;
grant execute on function public.marquer_cheques_remis(uuid[]) to authenticated;
