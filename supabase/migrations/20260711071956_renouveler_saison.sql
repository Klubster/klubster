-- Renouvellement de saison : pour chaque adhérent qui avait une adhésion mais n'en a pas
-- encore pour la saison courante, on en crée une (même cours, tarif repris de la base,
-- statut « en attente »). Les cours persistent (non liés à la saison), l'historique est
-- conservé. Transactionnel : tout ou rien. Réservé au président et au secrétariat.
create or replace function public.renouveler_saison(p_org uuid)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_saison text; v_count int := 0; r record; v_montant int;
begin
  if not ((p_org = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  v_saison := saison_courante(p_org);

  for r in
    -- Dernière adhésion connue de chaque adhérent qui n'a rien pour la saison courante.
    select distinct on (a.id) a.id as adherent_id, ad.cours_id
    from adherents a
    join adhesions ad on ad.adherent_id = a.id
    where a.organisation_id = p_org
      and not exists (select 1 from adhesions x where x.adherent_id = a.id and x.saison = v_saison)
    order by a.id, ad.created_at desc
  loop
    if r.cours_id is null then continue; end if;
    select tarif_centimes into v_montant from cours where id = r.cours_id and organisation_id = p_org;
    if v_montant is null then continue; end if; -- cours supprimé : on saute
    insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut)
    values (p_org, r.adherent_id, r.cours_id, v_saison, v_montant, 'en_attente');
    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    insert into audit_log (organisation_id, actor_user_id, action, entity_type, details)
    values (p_org, auth.uid(), 'saison_renouvelee', 'organisation', jsonb_build_object('saison', v_saison, 'adhesions_creees', v_count));
  end if;
  return v_count;
end;
$function$;

revoke all on function public.renouveler_saison(uuid) from public, anon;
grant execute on function public.renouveler_saison(uuid) to authenticated;