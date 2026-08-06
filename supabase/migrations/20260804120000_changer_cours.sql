-- 20260804120000 — Changement de cours, sans détruire l'historique.
--
-- Jusqu'ici le produit REFUSAIT de supprimer un cours peuplé en énonçant le fait,
-- sans offrir le geste qui manque : déplacer un adhérent. Le voici, borné à ce qui
-- est sûr pour un pilote :
--
--   - CAPACITÉ D'ABORD : le cours d'arrivée est verrouillé puis compté (les mêmes
--     briques que l'inscription, lot #16). Complet → refus EXPLICITE. Jamais de
--     bascule silencieuse en liste d'attente : entrer dans une file est un choix de
--     l'adhérent, pas un effet de bord d'un geste du bureau.
--   - TARIF HONNÊTE : sans aucun règlement, le montant dû devient le tarif du
--     nouveau cours. Dès qu'un règlement existe, le montant est CONSERVÉ et l'écart
--     est rendu au club (« à régulariser ») — on ne recalcule pas une dette sous
--     un paiement.
--   - HISTORIQUE INTACT : les présences (rattachées à leur cours depuis le lot #18)
--     et les pièces déjà demandées restent telles quelles. Les pièces PROPRES au
--     nouveau cours qui manquent au dossier sont ajoutées (obligatoire selon la
--     config, mineurs selon la date de naissance — l'instantané du 04/08).
--   - AUDIT : chaque changement est journalisé (ancien cours, nouveau, écart).
--
-- DÉPENDANCE : après la PR #16 (`verrouiller_cours`, `statuts_occupant_place`) et
-- la PR #20 (`pieces_adherent.obligatoire`).
-- RETOUR ARRIÈRE : `drop function public.changer_cours(uuid, uuid);`

create or replace function public.changer_cours(p_adhesion_id uuid, p_nouveau_cours_id uuid)
returns table(ecart_centimes integer, montant_ajuste boolean, nouveau_cours text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid; v_adherent uuid; v_ancien uuid; v_saison text; v_statut text; v_montant int;
  v_saison_courante text; v_tarif_nouveau int; v_places int; v_occ int; v_regle int;
  v_nom_nouveau text; v_naissance date; v_mineur boolean; v_pieces jsonb; pc jsonb;
  v_ecart int; v_ajuste boolean;
begin
  select ad.organisation_id, ad.adherent_id, ad.cours_id, ad.saison, ad.statut, ad.montant_centimes
    into v_org, v_adherent, v_ancien, v_saison, v_statut, v_montant
    from adhesions ad where ad.id = p_adhesion_id;
  if v_org is null then raise exception 'Adhésion introuvable.'; end if;
  if not ((v_org = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;

  v_saison_courante := saison_courante(v_org);
  if v_saison is distinct from v_saison_courante then
    raise exception 'Seule une adhésion de la saison courante peut changer de cours.';
  end if;
  if v_statut not in ('en_attente', 'paye', 'en_retard') then
    raise exception 'Cette adhésion n''est pas active (%) : rien à déplacer.', v_statut;
  end if;

  select c.tarif_centimes, c.places_max, c.nom into v_tarif_nouveau, v_places, v_nom_nouveau
    from cours c where c.id = p_nouveau_cours_id and c.organisation_id = v_org;
  if v_tarif_nouveau is null then raise exception 'Cours d''arrivée introuvable.'; end if;
  if p_nouveau_cours_id = v_ancien then raise exception 'L''adhérent est déjà dans ce cours.'; end if;

  -- Capacité : verrou AVANT comptage, refus explicite si complet.
  if v_places is not null and v_places > 0 then
    perform verrouiller_cours(p_nouveau_cours_id);
    select count(*) into v_occ from adhesions
      where cours_id = p_nouveau_cours_id and saison = v_saison_courante
        and statut = any (statuts_occupant_place());
    if v_occ >= v_places then
      raise exception 'Aucune place dans « % » : le cours est complet.', v_nom_nouveau;
    end if;
  end if;

  -- Tarif : ajusté seulement si rien n'a encore été réglé.
  select coalesce(sum(r.montant_centimes), 0) into v_regle from reglements r where r.adhesion_id = p_adhesion_id;
  if v_regle = 0 then
    v_ajuste := true; v_ecart := 0;
    update adhesions set cours_id = p_nouveau_cours_id, montant_centimes = v_tarif_nouveau
      where id = p_adhesion_id;
  else
    v_ajuste := false; v_ecart := v_tarif_nouveau - v_montant;
    update adhesions set cours_id = p_nouveau_cours_id where id = p_adhesion_id;
  end if;

  -- Pièces propres au nouveau cours, absentes du dossier : ajoutées avec les mêmes
  -- règles que l'inscription (obligatoire de la config, mineurs selon la naissance).
  select a.date_naissance, o.form_config->'pieces' into v_naissance, v_pieces
    from adherents a join organisations o on o.id = a.organisation_id where a.id = v_adherent;
  v_mineur := v_naissance is not null and v_naissance > (current_date - interval '18 years');
  if v_pieces is not null then
    for pc in select * from jsonb_array_elements(v_pieces) loop
      if (pc->>'cours_id') = p_nouveau_cours_id::text
         and (coalesce((pc->>'mineurs_seulement')::boolean, false) = false or v_mineur)
         and not exists (select 1 from pieces_adherent p
                          where p.adherent_id = v_adherent and p.cle = coalesce(pc->>'id', md5(coalesce(pc->>'label','')))) then
        insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut, obligatoire)
        values (v_org, v_adherent, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))),
                coalesce(pc->>'label','Pièce'), 'manquante', coalesce((pc->>'obligatoire')::boolean, true));
      end if;
    end loop;
  end if;

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, auth.uid(), 'changement_cours', 'adhesion', p_adhesion_id,
          jsonb_build_object('ancien_cours', v_ancien, 'nouveau_cours', p_nouveau_cours_id,
                             'ecart_centimes', v_ecart, 'montant_ajuste', v_ajuste));

  return query select v_ecart, v_ajuste, v_nom_nouveau;
end;
$function$;

revoke execute on function public.changer_cours(uuid, uuid) from anon, public;
grant execute on function public.changer_cours(uuid, uuid) to authenticated;
