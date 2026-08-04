-- 20260804090000 — Pièces réservées aux mineurs.
--
-- La page publique /fonctionnalites promet : « Une pièce peut n'être exigée que pour
-- une activité, ou que pour les mineurs ». La portée par activité existait
-- (`cours_id`) ; la portée « mineurs » n'existait nulle part — promesse absente du
-- produit. Elle arrive ici : `form_config.pieces[].mineurs_seulement`.
--
-- LA MINORITÉ EST DÉCIDÉE PAR LE SERVEUR, à partir de la date de naissance déjà
-- extraite (`v_naissance`) — jamais d'un champ posté par le navigateur. Une date
-- absente ou invalide = adulte : on ne crée pas de pièce parentale par défaut à
-- quelqu'un dont on ignore l'âge.
--
-- DÉPENDANCE : à fusionner APRÈS la PR #16 (liste d'attente). Le corps ci-dessous
-- reprend la définition complète installée par 20260803160000 (verrou de capacité,
-- `statuts_occupant_place()`), plus le filtre mineurs — ces deux fonctions doivent
-- exister. Signature, retour, `security definer`, `search_path`, droits : inchangés.
--
-- RETOUR ARRIÈRE : rejouer la définition de 20260803160000.

create or replace function public.register_adherent_full(
  p_slug text, p_user_id uuid, p_prenom text, p_nom text, p_email text, p_tel text,
  p_cours_id uuid, p_infos jsonb, p_mode text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid; v_tarif int; v_adh uuid; v_adhesion uuid; v_pieces jsonb; pc jsonb; v_saison text;
        v_places int; v_occ int; v_statut text; v_naissance date; v_mineur boolean;
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
  -- Mineur = moins de 18 ans révolus au jour de l'inscription. Sans date : adulte.
  v_mineur := v_naissance is not null and v_naissance > (current_date - interval '18 years');

  -- Places occupées cette saison. Le verrou est pris AVANT de compter : la décision
  -- « place libre ou liste d'attente » est atomique jusqu'à la fin de la transaction.
  v_statut := 'en_attente';
  if v_places is not null and v_places > 0 then
    perform verrouiller_cours(p_cours_id);
    select count(*) into v_occ from adhesions
      where cours_id = p_cours_id and saison = v_saison and statut = any (statuts_occupant_place());
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
      -- portée par cours : tous, ou le cours choisi
      if coalesce(pc->>'cours_id', '') = '' or (pc->>'cours_id') = p_cours_id::text then
        -- portée par âge : une pièce « mineurs uniquement » n'est pas exigée d'un adulte
        if coalesce((pc->>'mineurs_seulement')::boolean, false) = false or v_mineur then
          insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut)
          values (v_org, v_adh, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))), coalesce(pc->>'label','Pièce'), 'manquante');
        end if;
      end if;
    end loop;
  end if;
  return v_adhesion;
end;
$function$;

revoke execute on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) from anon, public;
grant execute on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) to authenticated, service_role;
