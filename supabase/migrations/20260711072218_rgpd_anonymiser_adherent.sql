-- Droit à l'effacement : on anonymise l'adhérent (suppression des données personnelles
-- et de santé, des pièces et des présences) tout en conservant les écritures comptables
-- (adhésions, règlements), nécessaires aux obligations légales de l'association.
-- Réservé au président. Transactionnel. Consigné au journal d'audit.
create or replace function public.anonymiser_adherent(p_adherent_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null or not ((v_org = current_org_id() and a_role_asso(array['admin_asso'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;

  -- Données sensibles et personnelles : supprimées.
  delete from questionnaires_sante where adherent_id = p_adherent_id;
  delete from pieces_adherent where adherent_id = p_adherent_id;
  delete from presences where adherent_id = p_adherent_id;

  -- Fiche anonymisée : plus aucune donnée identifiante, mais la ligne subsiste pour
  -- rattacher les règlements passés à des fins comptables.
  update adherents
    set prenom = 'Adhérent', nom = 'anonymisé', email = null, telephone = null,
        date_naissance = null, infos = '{}'::jsonb, user_id = null
    where id = p_adherent_id;

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id)
  values (v_org, auth.uid(), 'adherent_anonymise', 'adherent', p_adherent_id);
end;
$function$;

revoke all on function public.anonymiser_adherent(uuid) from public, anon;
grant execute on function public.anonymiser_adherent(uuid) to authenticated;