-- 20260826082000 — Inscription publique à PLUSIEURS cours en une fois.
--
-- Demande de CR Dance Studio (26/08/2026) : dans une école de danse, une personne
-- s'inscrit souvent à plusieurs cours. Jusqu'ici le formulaire public n'en acceptait
-- qu'un (register_adherent_full prend un p_cours_id) et se réinscrire créait un
-- DOUBLON de fiche.
--
-- Architecture : on ne duplique PAS register_adherent_full. Le premier cours passe
-- par elle (fiche adhérent, jauge, pièces communes + du cours, mode) ; chaque cours
-- SUPPLÉMENTAIRE ajoute une adhésion au même adhérent, avec les mêmes briques
-- (verrouiller_cours, statuts_occupant_place, saison, pièces propres au cours).
-- Comme à l'inscription simple, un cours complet place EN LISTE D'ATTENTE (c'est
-- l'adhérent qui choisit de s'y mettre — contrairement au geste du bureau
-- inscrire_autre_cours, qui refuse).
--
-- Le questionnaire de santé (un par personne) est rattaché à la PREMIÈRE adhésion,
-- comme dans register_adherent_avec_sante ; tout échec annule l'inscription entière
-- (une seule transaction).
--
-- Appelée EXCLUSIVEMENT par la service_role (Server Action d'inscription publique).
-- RETOUR ARRIÈRE : drop function public.register_adherent_multi_avec_sante(
--   text, uuid, text, text, text, text, uuid[], jsonb, text, text, date, text, text, text, text);

create or replace function public.register_adherent_multi_avec_sante(
  p_slug text, p_user_id uuid, p_prenom text, p_nom text, p_email text, p_tel text,
  p_cours_ids uuid[], p_infos jsonb, p_mode text,
  p_q_type text default null, p_q_date_naissance date default null, p_q_resultat text default null,
  p_q_signataire_nom text default null, p_q_signataire_qualite text default null, p_q_signature text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_premier uuid; v_adhesion1 uuid; v_org uuid; v_adherent uuid; v_saison text;
  v_naissance date; v_mineur boolean; v_pieces jsonb; pc jsonb;
  v_cours uuid; v_tarif int; v_places int; v_nom text; v_occ int; v_statut text;
  v_adh uuid; v_vus uuid[]; v_result jsonb; i int;
begin
  if p_cours_ids is null or array_length(p_cours_ids, 1) is null then
    raise exception 'Aucun cours choisi.';
  end if;

  -- Premier cours : le chemin historique, inchangé (fiche, jauge, pièces, mode).
  v_premier := p_cours_ids[1];
  v_adhesion1 := register_adherent_full(p_slug, p_user_id, p_prenom, p_nom, p_email, p_tel, v_premier, p_infos, p_mode);
  if v_adhesion1 is null then raise exception 'Inscription impossible.'; end if;

  select ad.organisation_id, ad.adherent_id, ad.saison into v_org, v_adherent, v_saison
    from adhesions ad where ad.id = v_adhesion1;
  select a.date_naissance into v_naissance from adherents a where a.id = v_adherent;
  v_mineur := v_naissance is not null and v_naissance > (current_date - interval '18 years');
  select o.form_config->'pieces' into v_pieces from organisations o where o.id = v_org;
  v_vus := array[v_premier];

  select jsonb_build_array(jsonb_build_object(
      'adhesion_id', ad.id, 'cours_id', ad.cours_id, 'cours_nom', c.nom,
      'statut', ad.statut, 'montant_centimes', ad.montant_centimes))
    into v_result
    from adhesions ad join cours c on c.id = ad.cours_id where ad.id = v_adhesion1;

  for i in 2 .. array_length(p_cours_ids, 1) loop
    v_cours := p_cours_ids[i];
    if v_cours = any (v_vus) then continue; end if;
    v_vus := v_vus || v_cours;

    -- Cours du MÊME club uniquement : un id étranger annule tout (transaction).
    select c.tarif_centimes, c.places_max, c.nom into v_tarif, v_places, v_nom
      from cours c where c.id = v_cours and c.organisation_id = v_org;
    if v_tarif is null then raise exception 'Cours invalide.'; end if;

    -- Même règle de jauge que l'inscription simple : complet → liste d'attente.
    v_statut := 'en_attente';
    if v_places is not null and v_places > 0 then
      perform verrouiller_cours(v_cours);
      select count(*) into v_occ from adhesions
        where cours_id = v_cours and saison = v_saison and statut = any (statuts_occupant_place());
      if v_occ >= v_places then v_statut := 'liste_attente'; end if;
    end if;

    insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut, mode_paiement)
    values (v_org, v_adherent, v_cours, v_saison, v_tarif, v_statut,
            case when p_mode in ('en_ligne','cheque','especes','virement') then p_mode else null end)
    returning id into v_adh;

    -- Pièces PROPRES à ce cours (les communes ont été posées avec le premier).
    if v_pieces is not null then
      for pc in select * from jsonb_array_elements(v_pieces) loop
        if (pc->>'cours_id') = v_cours::text
           and (coalesce((pc->>'mineurs_seulement')::boolean, false) = false or v_mineur)
           and not exists (select 1 from pieces_adherent p
                            where p.adherent_id = v_adherent and p.cle = coalesce(pc->>'id', md5(coalesce(pc->>'label','')))) then
          insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut, obligatoire)
          values (v_org, v_adherent, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))),
                  coalesce(pc->>'label','Pièce'), 'manquante', coalesce((pc->>'obligatoire')::boolean, true));
        end if;
      end loop;
    end if;

    v_result := v_result || jsonb_build_object(
      'adhesion_id', v_adh, 'cours_id', v_cours, 'cours_nom', v_nom,
      'statut', v_statut, 'montant_centimes', v_tarif);
  end loop;

  -- Questionnaire fourni → il DOIT s'enregistrer, sinon toute l'inscription est annulée.
  if nullif(trim(coalesce(p_q_signature, '')), '') is not null then
    perform enregistrer_questionnaire_sante(
      v_adhesion1, p_q_type, p_q_date_naissance,
      '{}'::jsonb, -- jamais le détail des réponses (minimisation)
      p_q_resultat, p_q_signataire_nom, p_q_signataire_qualite, p_q_signature
    );
  end if;

  return v_result;
end;
$function$;

revoke execute on function public.register_adherent_multi_avec_sante(text, uuid, text, text, text, text, uuid[], jsonb, text, text, date, text, text, text, text) from anon, authenticated, public;
