-- `register_adherent_full` insérait la date de naissance uniquement dans le JSON `infos`,
-- laissant la colonne dédiée `adherents.date_naissance` à NULL. Toute segmentation fondée
-- sur l'âge — « parents des mineurs », relances ciblées — était donc vide, alors que la
-- page produit la présente comme automatique (audit du 21/07/2026).
--
-- On remplit désormais la colonne, en lisant la valeur du formulaire sous une clé stable.
-- La signature de la fonction est inchangée : aucun appelant à modifier. Le cast de date
-- est protégé — une valeur mal formée laisse simplement la colonne à NULL plutôt que de
-- faire échouer l'inscription.

create or replace function public.register_adherent_full(
  p_slug text, p_user_id uuid, p_prenom text, p_nom text, p_email text, p_tel text,
  p_cours_id uuid, p_infos jsonb, p_mode text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid; v_tarif int; v_adh uuid; v_adhesion uuid; v_pieces jsonb; pc jsonb; v_saison text;
        v_places int; v_occ int; v_statut text; v_naissance date;
begin
  select id, form_config->'pieces' into v_org, v_pieces from organisations where slug = p_slug and publie = true;
  if v_org is null then raise exception 'Club introuvable.'; end if;
  select tarif_centimes, places_max into v_tarif, v_places from cours where id = p_cours_id and organisation_id = v_org;
  if v_tarif is null then raise exception 'Cours invalide.'; end if;
  if coalesce(trim(p_prenom), '') = '' or coalesce(trim(p_nom), '') = '' then raise exception 'Nom et prénom requis.'; end if;
  v_saison := saison_courante(v_org);

  -- Date de naissance vers la colonne dédiée (cast protégé).
  begin
    v_naissance := nullif(p_infos->>'Date de naissance', '')::date;
  exception when others then
    v_naissance := null;
  end;

  -- Places occupées cette saison = adhésions actives (hors liste d'attente).
  v_statut := 'en_attente';
  if v_places is not null and v_places > 0 then
    select count(*) into v_occ from adhesions
      where cours_id = p_cours_id and saison = v_saison and statut in ('en_attente','en_retard','paye');
    if v_occ >= v_places then v_statut := 'liste_attente'; end if;
  end if;

  insert into adherents (organisation_id, nom, prenom, email, telephone, user_id, infos, date_naissance)
    values (v_org, left(trim(p_nom), 80), left(trim(p_prenom), 80), nullif(trim(p_email), ''), nullif(trim(p_tel), ''), p_user_id, coalesce(p_infos, '{}'::jsonb), v_naissance)
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
