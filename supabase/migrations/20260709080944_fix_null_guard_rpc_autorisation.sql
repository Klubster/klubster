-- P0 / V2 : la garde `not (v_org = current_org_id() or is_super_admin())` s'evalue a NULL
-- quand current_org_id() est NULL (anon, ou tout adherent sans organisation dans profiles).
-- En PL/pgSQL, `if NULL then raise` n'execute pas la branche : la garde etait contournee.
-- Correction : coalesce(...) pour ramener NULL a false. Corps des fonctions inchanges.

create or replace function public.enregistrer_reglement(p_adhesion_id uuid, p_montant_centimes integer, p_mode text, p_note text default null::text)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_org uuid;
  v_montant int;
  v_regle int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  if p_montant_centimes is null or p_montant_centimes <= 0 then
    raise exception 'Montant invalide.';
  end if;

  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
  values (v_org, p_adhesion_id,
          p_montant_centimes,
          case when p_mode in ('cheque','especes','en_ligne','autre') then p_mode else 'autre' end,
          nullif(trim(coalesce(p_note, '')), ''));

  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  if v_regle >= v_montant - 5 then -- tolérance arrondi (3 x montant/3)
    update adhesions set statut = 'paye' where id = p_adhesion_id;
  end if;
  return greatest(v_montant - v_regle, 0);
end;
$function$;

create or replace function public.marquer_encaisse(p_adhesion_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid;
begin
  select organisation_id into v_org from adhesions where id = p_adhesion_id;
  if v_org is null or not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  update adhesions set statut = 'paye' where id = p_adhesion_id;
end; $function$;

create or replace function public.marquer_present(p_adherent_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null or not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  insert into presences (organisation_id, adherent_id, date) values (v_org, p_adherent_id, current_date)
  on conflict (adherent_id, date) do nothing;
end; $function$;

create or replace function public.verifier_adherent(p_adherent_id uuid)
 returns table(prenom text, nom text, cours text, regle boolean, pieces_manquantes integer, present_aujourdhui boolean)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null then raise exception 'Adhérent introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  return query
  select a.prenom, a.nom,
    (select c.nom from adhesions ad join cours c on c.id = ad.cours_id where ad.adherent_id = a.id order by ad.created_at desc limit 1),
    coalesce((select ad.statut = 'paye' from adhesions ad where ad.adherent_id = a.id order by ad.created_at desc limit 1), false),
    (select count(*)::int from pieces_adherent p where p.adherent_id = a.id and p.statut = 'manquante'),
    exists(select 1 from presences pr where pr.adherent_id = a.id and pr.date = current_date)
  from adherents a where a.id = p_adherent_id;
end; $function$;