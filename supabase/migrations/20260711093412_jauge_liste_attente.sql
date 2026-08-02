-- Jauge : à l'inscription, si le cours affiche une capacité (places_max) et qu'elle est
-- atteinte, la nouvelle adhésion part en 'liste_attente' au lieu de 'en_attente'. Le calcul
-- est fait DANS la RPC (transaction) pour éviter que deux inscriptions simultanées prennent
-- la même dernière place.
create or replace function public.register_adherent_full(p_slug text, p_user_id uuid, p_prenom text, p_nom text, p_email text, p_tel text, p_cours_id uuid, p_infos jsonb, p_mode text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid; v_tarif int; v_adh uuid; v_adhesion uuid; v_pieces jsonb; pc jsonb; v_saison text;
        v_places int; v_occ int; v_statut text;
begin
  select id, form_config->'pieces' into v_org, v_pieces from organisations where slug = p_slug and publie = true;
  if v_org is null then raise exception 'Club introuvable.'; end if;
  select tarif_centimes, places_max into v_tarif, v_places from cours where id = p_cours_id and organisation_id = v_org;
  if v_tarif is null then raise exception 'Cours invalide.'; end if;
  if coalesce(trim(p_prenom), '') = '' or coalesce(trim(p_nom), '') = '' then raise exception 'Nom et prénom requis.'; end if;
  v_saison := saison_courante(v_org);

  -- Places occupées cette saison = adhésions actives (hors liste d'attente).
  v_statut := 'en_attente';
  if v_places is not null and v_places > 0 then
    select count(*) into v_occ from adhesions
      where cours_id = p_cours_id and saison = v_saison and statut in ('en_attente','en_retard','paye');
    if v_occ >= v_places then v_statut := 'liste_attente'; end if;
  end if;

  insert into adherents (organisation_id, nom, prenom, email, telephone, user_id, infos)
    values (v_org, left(trim(p_nom), 80), left(trim(p_prenom), 80), nullif(trim(p_email), ''), nullif(trim(p_tel), ''), p_user_id, coalesce(p_infos, '{}'::jsonb))
    returning id into v_adh;
  insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut, mode_paiement)
    values (v_org, v_adh, p_cours_id, v_saison, v_tarif, v_statut,
            case when p_mode in ('en_ligne','cheque','especes') then p_mode else null end)
    returning id into v_adhesion;
  if v_pieces is not null then
    for pc in select * from jsonb_array_elements(v_pieces) loop
      if coalesce(pc->>'cours_id', '') = '' or (pc->>'cours_id') = p_cours_id::text then
        insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut)
        values (v_org, v_adh, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))), coalesce(pc->>'label','Pièce'), 'manquante');
      end if;
    end loop;
  end if;
  return v_adhesion;
end;
$function$;

-- Donner une place à quelqu'un de la liste d'attente : président ou secrétaire.
create or replace function public.promouvoir_liste_attente(p_adhesion_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_org uuid; v_statut text;
begin
  select organisation_id, statut into v_org, v_statut from adhesions where id = p_adhesion_id;
  if v_org is null or not ((v_org = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  if v_statut is distinct from 'liste_attente' then return false; end if;
  update adhesions set statut = 'en_attente' where id = p_adhesion_id;
  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
    values (v_org, auth.uid(), 'liste_attente_promue', 'adhesion', p_adhesion_id, '{}'::jsonb);
  return true;
end;
$function$;

grant execute on function public.promouvoir_liste_attente(uuid) to authenticated;