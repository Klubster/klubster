-- Lot O — import des adhérents : les mêmes règles que l'inscription publique (04/08/2026).
--
-- CE QUI ÉTAIT CASSÉ, reproduit sur klubster-dev avant correction (10 adhérents importés) :
--
--   1. AUCUNE PIÈCE créée. Les 10 dossiers importés étaient donc « complets » pour
--      toujours : jamais dans « dossiers incomplets », jamais relancés, verts au
--      contrôle terrain. Un club reprenant 300 adhérents n'avait aucun dossier à
--      compléter — la promesse « relances automatiques » était morte à l'import.
--   2. CAPACITÉ IGNORÉE : une ligne visant un cours complet (places_max = 1, déjà 1
--      inscrit) créait une 2e adhésion « en_attente ». L'import contournait la liste
--      d'attente, pourtant certifiée côté inscription publique.
--   3. ADHÉRENT SANS ADHÉSION : cours inconnu et pas de cours par défaut → l'adhérent
--      existait hors de toute saison. Invisible des compteurs, non facturable, non
--      relançable, absent du ciblage — et le bilan annonçait quand même « importé ».
--   4. NI DATE DE NAISSANCE NI RESPONSABLE LÉGAL : deux mineurs sans email propre
--      arrivaient injoignables, sans parent, sans « autorisation parentale »
--      (pièce `mineurs_seulement`), et invisibles du ciblage « parents ».
--   5. MONTANT DÉJÀ RÉGLÉ perdu : un club qui reprend son fichier repartait avec une
--      trésorerie à zéro et allait relancer des gens à jour.
--
-- CE QUE FAIT CETTE FONCTION : le même chemin que `register_adherent_full` — capacité
-- verrouillée puis liste d'attente, pièces du cours filtrées par `cours_id` et
-- `mineurs_seulement`, instantané `obligatoire`, tarif lu en base. Elle y ajoute la
-- reprise d'un montant déjà encaissé, sous forme de règlement daté et traçable.
--
-- TRANSACTION : une fonction = une transaction. Une ligne qui échoue annule tout
-- l'import ; rien de partiel, rien d'orphelin.
--
-- RETOUR : un bilan par ligne (jsonb), pour que l'écran puisse dire ce qui s'est
-- passé ligne par ligne au lieu d'un « 2 ignorées » sans explication.
--
-- RETOUR ARRIÈRE : drop function importer_adherents(uuid, jsonb);
--   (l'ancienne `inserer_adherents_adhesions` reste en place, plus appelée.)

create or replace function public.importer_adherents(p_org uuid, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r jsonb;
  v_saison text;
  v_pieces jsonb;
  pc jsonb;
  v_adh uuid;
  v_cours uuid;
  v_tarif int;
  v_places int;
  v_occ int;
  v_statut text;
  v_naissance date;
  v_mineur boolean;
  v_infos jsonb;
  v_regle int;
  v_email text;
  v_index int := 1;
  v_bilan jsonb := '[]'::jsonb;
  v_crees int := 0;
  v_attente int := 0;
  v_sans_cours int := 0;
begin
  -- RÔLE EN BASE, pas seulement dans l'écran.
  --
  -- Reproduit sur klubster-dev avant ce garde-fou : un ENCADRANT et un TRÉSORIER du
  -- club, avec leur seul jeton de session, créaient des adhérents en appelant cette
  -- RPC directement par l'API REST — alors que l'interface réserve l'import au
  -- président et au secrétaire (`adherents_ecriture`). Le contrôle applicatif ne
  -- protège que ceux qui passent par l'écran. Même règle, même helper que
  -- `changer_cours` (lot J) : la matrice de rôles vit en base.
  if not ((coalesce(p_org = current_org_id(), false) and a_role_asso(array['admin_asso','secretaire']))
          or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;

  v_saison := saison_courante(p_org);
  select form_config->'pieces' into v_pieces from organisations where id = p_org;

  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_cours := null; v_tarif := null; v_places := null; v_statut := 'en_attente';
    v_naissance := null; v_regle := 0;

    -- Date de naissance : déjà normalisée en ISO par le client (lib/csv.ts). On refuse
    -- ici tout ce qui n'est pas une date réelle — « 30/02 » n'entre pas en base.
    begin
      v_naissance := nullif(trim(coalesce(r->>'date_naissance','')), '')::date;
    exception when others then
      v_naissance := null;
    end;
    v_mineur := v_naissance is not null and v_naissance > (current_date - interval '18 years');

    -- Le cours vient du client, mais son appartenance au club est revérifiée ici.
    v_cours := nullif(r->>'cours_id','')::uuid;
    if v_cours is not null then
      select tarif_centimes, places_max into v_tarif, v_places
        from cours where id = v_cours and organisation_id = p_org;
      if v_tarif is null then v_cours := null; end if;  -- cours d'un autre club : ignoré
    end if;

    -- Capacité : même geste que l'inscription publique — verrou puis comptage.
    if v_cours is not null and v_places is not null and v_places > 0 then
      perform verrouiller_cours(v_cours);
      select count(*) into v_occ from adhesions
        where cours_id = v_cours and saison = v_saison and statut = any (statuts_occupant_place());
      if v_occ >= v_places then v_statut := 'liste_attente'; end if;
    end if;

    -- Responsable légal : la même clé que le ciblage et les relances.
    v_infos := '{}'::jsonb;
    if coalesce(trim(r->>'responsable_email'), '') <> '' then
      v_infos := jsonb_build_object('Responsable légal — email', lower(trim(r->>'responsable_email')));
    end if;

    v_email := nullif(lower(trim(coalesce(r->>'email',''))), '');

    insert into adherents (organisation_id, prenom, nom, email, telephone, date_naissance, infos)
    values (p_org, left(trim(r->>'prenom'), 80), left(trim(r->>'nom'), 80),
            v_email, nullif(trim(coalesce(r->>'telephone','')), ''), v_naissance, v_infos)
    returning id into v_adh;

    if v_cours is not null then
      insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut)
      values (p_org, v_adh, v_cours, v_saison, v_tarif, v_statut);

      -- Montant déjà encaissé par le club avant Klubster. Enregistré comme un
      -- règlement daté : la trésorerie reprise est lisible, et surtout l'adhérent
      -- à jour n'est pas relancé dès le lendemain de l'import.
      v_regle := least(greatest(0, coalesce((r->>'montant_regle_centimes')::int, 0)), v_tarif);
      if v_regle > 0 then
        -- mode « autre » : ce n'est ni un chèque ni des espèces reçus par Klubster,
        -- c'est une somme déjà encaissée par le club avant la reprise. La note le dit.
        insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
        select p_org, ad.id, v_regle, 'autre', 'Reprise de fichier (import)'
          from adhesions ad where ad.adherent_id = v_adh limit 1;
        if v_regle >= v_tarif then
          update adhesions set statut = 'paye'
           where adherent_id = v_adh and statut = 'en_attente';
        end if;
      end if;

      -- Pièces : filtrées par cours et par `mineurs_seulement`, instantané `obligatoire`.
      if v_pieces is not null then
        for pc in select * from jsonb_array_elements(v_pieces) loop
          if coalesce(pc->>'cours_id', '') = '' or (pc->>'cours_id') = v_cours::text then
            if coalesce((pc->>'mineurs_seulement')::boolean, false) = false or v_mineur then
              insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut, obligatoire)
              values (p_org, v_adh, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))),
                      coalesce(pc->>'label','Pièce'), 'manquante',
                      coalesce((pc->>'obligatoire')::boolean, true));
            end if;
          end if;
        end loop;
      end if;

      if v_statut = 'liste_attente' then v_attente := v_attente + 1; end if;
    else
      v_sans_cours := v_sans_cours + 1;
    end if;

    v_crees := v_crees + 1;
    v_bilan := v_bilan || jsonb_build_object(
      'ligne', coalesce((r->>'ligne')::int, v_index),
      'nom', trim(r->>'prenom') || ' ' || trim(r->>'nom'),
      'statut', case when v_cours is null then 'sans_cours' else v_statut end,
      'mineur', v_mineur,
      'regle_centimes', v_regle
    );
    v_index := v_index + 1;
  end loop;

  return jsonb_build_object(
    'crees', v_crees,
    'liste_attente', v_attente,
    'sans_cours', v_sans_cours,
    'lignes', v_bilan
  );
end;
$$;

revoke execute on function public.importer_adherents(uuid, jsonb) from anon, public;
grant execute on function public.importer_adherents(uuid, jsonb) to authenticated;
