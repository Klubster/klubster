-- 20260826081000 — Inscrire un adhérent à un AUTRE cours, depuis sa fiche.
--
-- Demande de CR Dance Studio (26/08/2026) : dans une école de danse, une même
-- personne suit souvent plusieurs cours. La base le permettait depuis toujours
-- (une adhésion par cours), mais aucun geste ne créait la seconde adhésion :
-- le formulaire public n'inscrit qu'à un cours, et la fiche ne savait que
-- « changer » de cours, jamais en ajouter un.
--
-- Mêmes règles que `changer_cours` (20260804120000) :
--   - CAPACITÉ D'ABORD : verrou puis comptage ; cours complet → refus EXPLICITE
--     (entrer en liste d'attente est un choix de l'adhérent, pas un effet de bord
--     d'un geste du bureau).
--   - PAS DE DOUBLON : une adhésion active (ou en liste d'attente) sur ce cours
--     cette saison → refus nommé.
--   - TARIF DE LA BASE : le montant dû est le tarif du cours, jamais une valeur
--     fournie par le client.
--   - PIÈCES : les pièces PROPRES au nouveau cours qui manquent au dossier sont
--     ajoutées (obligatoire selon la config, mineurs selon la date de naissance).
--   - AUDIT : chaque ajout est journalisé.
--
-- RETOUR ARRIÈRE : drop function public.inscrire_autre_cours(uuid, uuid, text);

create or replace function public.inscrire_autre_cours(p_adherent_id uuid, p_cours_id uuid, p_mode text default null)
returns table(adhesion_id uuid, nom_cours text, tarif_centimes integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid; v_saison text; v_tarif int; v_places int; v_occ int; v_nom text;
  v_naissance date; v_mineur boolean; v_pieces jsonb; pc jsonb; v_mode text; v_adhesion uuid;
begin
  select a.organisation_id, a.date_naissance into v_org, v_naissance
    from adherents a where a.id = p_adherent_id;
  if v_org is null then raise exception 'Adhérent introuvable.'; end if;
  if not ((v_org = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;

  select c.tarif_centimes, c.places_max, c.nom into v_tarif, v_places, v_nom
    from cours c where c.id = p_cours_id and c.organisation_id = v_org;
  if v_tarif is null then raise exception 'Cours introuvable.'; end if;

  v_saison := saison_courante(v_org);

  -- Pas de doublon : une adhésion vivante sur ce cours cette saison suffit.
  if exists (select 1 from adhesions ad
              where ad.adherent_id = p_adherent_id and ad.cours_id = p_cours_id
                and ad.saison = v_saison
                and ad.statut in ('en_attente','paye','en_retard','liste_attente')) then
    raise exception 'Déjà inscrit(e) à « % » cette saison.', v_nom;
  end if;

  -- Capacité : verrou AVANT comptage, refus explicite si complet.
  if v_places is not null and v_places > 0 then
    perform verrouiller_cours(p_cours_id);
    select count(*) into v_occ from adhesions
      where cours_id = p_cours_id and saison = v_saison
        and statut = any (statuts_occupant_place());
    if v_occ >= v_places then
      raise exception 'Aucune place dans « % » : le cours est complet.', v_nom;
    end if;
  end if;

  v_mode := case when p_mode in ('cheque','especes','virement','en_ligne') then p_mode else null end;

  insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut, mode_paiement)
  values (v_org, p_adherent_id, p_cours_id, v_saison, v_tarif, 'en_attente', v_mode)
  returning id into v_adhesion;

  -- Pièces propres au nouveau cours, absentes du dossier : mêmes règles que
  -- l'inscription et le changement de cours.
  select o.form_config->'pieces' into v_pieces from organisations o where o.id = v_org;
  v_mineur := v_naissance is not null and v_naissance > (current_date - interval '18 years');
  if v_pieces is not null then
    for pc in select * from jsonb_array_elements(v_pieces) loop
      if (pc->>'cours_id') = p_cours_id::text
         and (coalesce((pc->>'mineurs_seulement')::boolean, false) = false or v_mineur)
         and not exists (select 1 from pieces_adherent p
                          where p.adherent_id = p_adherent_id and p.cle = coalesce(pc->>'id', md5(coalesce(pc->>'label','')))) then
        insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut, obligatoire)
        values (v_org, p_adherent_id, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))),
                coalesce(pc->>'label','Pièce'), 'manquante', coalesce((pc->>'obligatoire')::boolean, true));
      end if;
    end loop;
  end if;

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, auth.uid(), 'adhesion_ajoutee', 'adhesion', v_adhesion,
          jsonb_build_object('adherent_id', p_adherent_id, 'cours_id', p_cours_id, 'tarif_centimes', v_tarif));

  return query select v_adhesion, v_nom, v_tarif;
end;
$function$;

revoke execute on function public.inscrire_autre_cours(uuid, uuid, text) from anon, public;
grant execute on function public.inscrire_autre_cours(uuid, uuid, text) to authenticated;
