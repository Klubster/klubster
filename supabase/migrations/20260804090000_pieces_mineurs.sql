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

-- ═══ RÈGLE PRODUIT (arbitrage Mathieu, 04/08/2026) ═══════════════════════════════
-- « Une pièce facultative non fournie ne rend JAMAIS le dossier incomplet. »
--
-- Le caractère obligatoire est un INSTANTANÉ pris à la création du dossier : la
-- configuration du formulaire peut changer ensuite sans modifier silencieusement
-- les dossiers existants. Une application rétroactive sera un geste explicite du
-- club, dans un futur lot.

alter table public.pieces_adherent add column if not exists obligatoire boolean not null default true;

-- Rétroalimentation des lignes existantes : uniquement quand la correspondance est
-- CERTAINE (même organisation, même identifiant de pièce dans form_config, et la
-- config dit explicitement facultative). Tout le reste garde `true` par prudence —
-- y compris le certificat médical créé après le questionnaire de santé, absent de
-- form_config, donc obligatoire. Idempotent : rejouer ne change rien.
update public.pieces_adherent p
set obligatoire = false
from public.organisations o, jsonb_array_elements(o.form_config->'pieces') pc
where o.id = p.organisation_id
  and pc->>'id' = p.cle
  and (pc->>'obligatoire')::boolean = false
  and p.obligatoire = true;

-- L'inscription pose l'instantané. Redéfinition complète (la même que ci-dessus,
-- avec la colonne en plus) : le fichier montre la fonction réellement installée.
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

  begin
    v_naissance := nullif(p_infos->>'Date de naissance', '')::date;
  exception when others then
    v_naissance := null;
  end;
  v_mineur := v_naissance is not null and v_naissance > (current_date - interval '18 years');

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
      if coalesce(pc->>'cours_id', '') = '' or (pc->>'cours_id') = p_cours_id::text then
        if coalesce((pc->>'mineurs_seulement')::boolean, false) = false or v_mineur then
          insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut, obligatoire)
          values (v_org, v_adh, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))), coalesce(pc->>'label','Pièce'), 'manquante',
                  coalesce((pc->>'obligatoire')::boolean, true));
        end if;
      end if;
    end loop;
  end if;
  return v_adhesion;
end;
$function$;

revoke execute on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) from anon, public;
grant execute on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) to authenticated, service_role;

-- Contrôle terrain : le compte de « pièces manquantes » suit la règle — obligatoires
-- seules. Les deux fonctions appartiennent aux PR #10 et #18 : on ne les redéfinit
-- QUE si elles existent déjà (fusion dans n'importe quel ordre), avec leur corps
-- complet et littéral, à un seul changement près : `and p.obligatoire`.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'verifier_adherent') then
    create or replace function public.verifier_adherent(p_adherent_id uuid)
     returns table(prenom text, nom text, cours text, regle boolean, pieces_manquantes integer, present_aujourdhui boolean)
     language plpgsql security definer set search_path to 'public'
    as $fn$
    declare v_org uuid;
    begin
      select organisation_id into v_org from adherents where id = p_adherent_id;
      if v_org is null then raise exception 'Adhérent introuvable.'; end if;
      if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
        raise exception 'Non autorisé.';
      end if;
      return query
      select a.prenom, a.nom,
        (select c.nom from cours c where c.id = ref.cours_id),
        coalesce(ref.statut = 'paye', false),
        (select count(*)::int from pieces_adherent p
          where p.adherent_id = a.id and p.statut = 'manquante' and p.obligatoire),
        exists(select 1 from presences pr where pr.adherent_id = a.id and pr.date = current_date)
      from adherents a
      left join lateral (
        select ad.cours_id, ad.statut from adhesions ad where ad.adherent_id = a.id
        order by (ad.saison is distinct from saison_courante(a.organisation_id)),
                 (ad.statut not in ('en_attente', 'paye', 'en_retard')),
                 ad.created_at desc, ad.id desc
        limit 1
      ) ref on true
      where a.id = p_adherent_id;
    end; $fn$;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'controler_adherent'
               and pg_get_function_arguments(p.oid) = 'p_adherent_id uuid, p_cours_id uuid') then
    create or replace function public.controler_adherent(p_adherent_id uuid, p_cours_id uuid)
    returns table(prenom text, nom text, cours text, statut text, pieces_manquantes integer,
                  questionnaire_ok boolean, present_aujourdhui boolean, autres_cours text[])
    language plpgsql security definer set search_path to 'public'
    as $fn$
    declare v_org uuid; v_org_cours uuid; v_saison text;
    begin
      select organisation_id into v_org from adherents a where a.id = p_adherent_id;
      if v_org is null then raise exception 'Adhérent introuvable.'; end if;
      select organisation_id into v_org_cours from cours c where c.id = p_cours_id;
      if v_org_cours is null then raise exception 'Cours introuvable.'; end if;
      if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
        raise exception 'Non autorisé.';
      end if;
      if v_org_cours is distinct from v_org then raise exception 'Non autorisé.'; end if;
      if not (coalesce(is_super_admin(), false) or a_role_asso(array['admin_asso','encadrant'])) then
        raise exception 'Non autorisé.';
      end if;
      v_saison := saison_courante(v_org);
      return query
      select a.prenom, a.nom,
        (select c.nom from cours c where c.id = p_cours_id),
        case
          when ref.statut is null then
            case
              when exists (select 1 from adhesions ad where ad.adherent_id = a.id
                            and ad.cours_id = p_cours_id and ad.saison is distinct from v_saison)
                then 'saison_precedente'
              when exists (select 1 from adhesions ad where ad.adherent_id = a.id
                            and ad.saison = v_saison and ad.statut in ('paye', 'en_attente', 'en_retard'))
                then 'non_inscrit_ce_cours'
              else 'aucune_adhesion'
            end
          when ref.statut = 'liste_attente' then 'liste_attente'
          when ref.statut = 'annule' then 'annule'
          when ref.statut = 'rembourse' then 'rembourse'
          when ref.statut = 'en_retard' then 'en_retard'
          when ref.statut = 'en_attente' then 'paiement_attendu'
          when not exists (select 1 from questionnaires_sante q
                            where q.adherent_id = a.id and q.adhesion_id = ref.id)
            then 'questionnaire_manquant'
          -- la règle : seules les pièces OBLIGATOIRES manquantes rendent le dossier incomplet
          when (select count(*) from pieces_adherent p
                 where p.adherent_id = a.id and p.statut = 'manquante' and p.obligatoire) > 0
            then 'dossier_incomplet'
          else 'a_jour'
        end,
        (select count(*)::int from pieces_adherent p
          where p.adherent_id = a.id and p.statut = 'manquante' and p.obligatoire),
        exists (select 1 from questionnaires_sante q
                 where q.adherent_id = a.id and q.adhesion_id = ref.id),
        exists (select 1 from presences pr
                 where pr.adherent_id = a.id and pr.cours_id = p_cours_id and pr.date = current_date),
        coalesce((
          select array_agg(distinct c2.nom order by c2.nom)
          from adhesions ad2 join cours c2 on c2.id = ad2.cours_id
          where ad2.adherent_id = a.id and ad2.cours_id is distinct from p_cours_id
            and ad2.saison = v_saison and ad2.statut in ('paye', 'en_attente', 'en_retard')
        ), '{}')
      from adherents a
      left join lateral (
        select ad.id, ad.statut from adhesions ad
        where ad.adherent_id = a.id and ad.cours_id = p_cours_id and ad.saison = v_saison
        order by (ad.statut not in ('en_attente', 'paye', 'en_retard')), ad.created_at desc, ad.id desc
        limit 1
      ) ref on true
      where a.id = p_adherent_id;
    end; $fn$;
  end if;
end $$;
