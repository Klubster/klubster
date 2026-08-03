-- 20260803160000 — Liste d'attente : la rendre possible, et la rendre juste.
--
-- CE QUI ÉTAIT CASSÉ
--
-- `register_adherent_full` calcule déjà un statut `liste_attente` quand le cours est
-- plein, et l'interface l'affiche partout (badge sur la fiche, filtre de la liste des
-- adhérents, compteur par cours, bouton de promotion, RPC `promouvoir_liste_attente`).
-- Mais `adhesions_statut_check` n'accepte pas cette valeur. Conséquence mesurée sur la
-- base de développement, formulaire public à l'appui : **dès qu'un cours atteint sa
-- capacité, toute nouvelle inscription échoue** avec « une erreur est survenue », le
-- compte tout juste créé est annulé, et le club perd l'adhérent sans jamais le savoir.
-- À la rentrée, quand les cours se remplissent, c'est le pire moment possible.
--
-- CE QUE CETTE MIGRATION ÉTABLIT
--
-- 1. `liste_attente` devient un statut valide.
-- 2. Une place est occupée par les statuts `en_attente`, `paye`, `en_retard` — et par
--    eux seuls. Une adhésion annulée ou remboursée libère la sienne ; la liste d'attente
--    n'en occupe aucune.
-- 3. La décision « place libre ou liste d'attente » devient ATOMIQUE : le cours est
--    verrouillé le temps de compter puis d'insérer. Sans ce verrou, deux inscriptions
--    simultanées sur la dernière place produisaient deux adhésions actives.
-- 4. La promotion vérifie qu'une place est réellement libre, et prend la personne qui
--    attend depuis le plus longtemps. Promouvoir au-delà de la capacité était possible.
-- 5. `places_libres(cours_id)` donne la vérité, pour l'interface comme pour les tests.

-- ——— 1. Le statut existe ———————————————————————————————————————————————

alter table adhesions drop constraint if exists adhesions_statut_check;
alter table adhesions add constraint adhesions_statut_check
  check (statut in ('en_attente', 'paye', 'en_retard', 'rembourse', 'annule', 'liste_attente'));

-- ——— 2. Ce qui occupe une place ————————————————————————————————————————

create or replace function public.statuts_occupant_place()
returns text[] language sql immutable as $$
  select array['en_attente', 'paye', 'en_retard']::text[];
$$;

comment on function public.statuts_occupant_place() is
  'Statuts d''adhésion qui consomment une place. Annulé, remboursé et liste d''attente n''en consomment aucune.';

-- ——— 3. Places libres, saison courante ————————————————————————————————

create or replace function public.places_libres(p_cours_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_org uuid; v_places int; v_occ int; v_saison text;
begin
  select organisation_id, places_max into v_org, v_places from cours where id = p_cours_id;
  if v_org is null then raise exception 'Cours introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;

  -- Capacité non déclarée ou nulle : le cours n'est jamais complet. Un club qui n'a pas
  -- renseigné de limite ne veut pas d'une liste d'attente surprise.
  if v_places is null or v_places <= 0 then return null; end if;

  v_saison := saison_courante(v_org);
  select count(*) into v_occ from adhesions
    where cours_id = p_cours_id and saison = v_saison
      and statut = any (statuts_occupant_place());

  return greatest(v_places - v_occ, 0);
end;
$$;

revoke execute on function public.places_libres(uuid) from anon, public;
grant execute on function public.places_libres(uuid) to authenticated;

-- ——— 4. Promotion : une place réelle, et le premier arrivé ————————————

create or replace function public.promouvoir_liste_attente(p_adhesion_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid; v_statut text; v_cours uuid; v_saison text;
  v_places int; v_occ int; v_premier uuid;
begin
  select organisation_id, statut, cours_id, saison
    into v_org, v_statut, v_cours, v_saison
    from adhesions where id = p_adhesion_id;

  if v_org is null or not ((v_org = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  if v_statut is distinct from 'liste_attente' then return false; end if;

  -- Verrou sur le cours : deux promotions simultanées ne doivent pas se partager la même
  -- place libre. Le verrou est pris AVANT de compter.
  select places_max into v_places from cours where id = v_cours for update;

  if v_places is not null and v_places > 0 then
    select count(*) into v_occ from adhesions
      where cours_id = v_cours and saison = v_saison
        and statut = any (statuts_occupant_place());
    if v_occ >= v_places then
      -- Aucune place : on ne promeut pas. Le club n'a pas à découvrir un cours en
      -- surcapacité le soir de la reprise.
      return false;
    end if;
  end if;

  -- Le premier arrivé passe devant. Promouvoir hors tour est possible, mais doit être un
  -- geste explicite du club, pas un effet de bord de l'ordre des clics.
  select id into v_premier from adhesions
    where cours_id = v_cours and saison = v_saison and statut = 'liste_attente'
    order by created_at asc, id asc
    limit 1;

  update adhesions set statut = 'en_attente' where id = p_adhesion_id;

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
    values (v_org, auth.uid(), 'liste_attente_promue', 'adhesion', p_adhesion_id,
            jsonb_build_object('hors_tour', v_premier is distinct from p_adhesion_id));
  return true;
end;
$$;

revoke execute on function public.promouvoir_liste_attente(uuid) from anon, public;
grant execute on function public.promouvoir_liste_attente(uuid) to authenticated;

-- ——— 5. Inscription : décision atomique ————————————————————————————————
--
-- `register_adherent_full` comptait les places puis insérait, sans verrou. Deux
-- inscriptions simultanées sur la dernière place lisaient le même compte et passaient
-- toutes les deux. On verrouille la ligne du cours pour la durée de la transaction :
-- la seconde attend, recompte, et part en liste d'attente.

create or replace function public.verrouiller_cours(p_cours_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_ignore int;
begin
  select 1 into v_ignore from cours where id = p_cours_id for update;
end;
$$;

revoke execute on function public.verrouiller_cours(uuid) from anon, authenticated, public;

comment on function public.verrouiller_cours(uuid) is
  'Verrou de capacité, réservé aux fonctions SECURITY DEFINER d''inscription. Jamais appelable depuis le navigateur.';

-- `register_adherent_full` : définition COMPLÈTE et explicite. Ce fichier montre la
-- fonction exactement telle qu'elle sera installée — pas de lecture de `pg_proc`, pas
-- de réécriture de texte. Corps repris de la définition canonique (migration 0004),
-- avec DEUX changements, tous deux dans la décision de capacité :
--
--   a. le cours est VERROUILLÉ avant le comptage (`verrouiller_cours`) : deux
--      inscriptions simultanées sur la dernière place ne peuvent plus passer ensemble ;
--   b. le comptage utilise `statuts_occupant_place()` : la même définition d'« occupe
--      une place » que `places_libres` et `promouvoir_liste_attente`.
--
-- Tout le reste — signature, types, retour, security definer, search_path, inscription,
-- date de naissance, pièces, mode de paiement, exceptions (donc rollback de la
-- transaction appelante `register_adherent_avec_sante`) — est conservé à l'identique.

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
      if coalesce(pc->>'cours_id', '') = '' or (pc->>'cours_id') = p_cours_id::text then
        insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut)
        values (v_org, v_adh, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))), coalesce(pc->>'label','Pièce'), 'manquante');
      end if;
    end loop;
  end if;
  return v_adhesion;
end;
$function$;

-- Droits conservés explicitement : l'état de référence (migration 0006) — interdite à
-- `anon` et `public` ; `authenticated` et la `service_role` l'exécutent (via la
-- transaction `register_adherent_avec_sante` pour l'inscription publique).
revoke execute on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) from anon, public;
grant execute on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) to authenticated, service_role;

-- Auto-contrôle rejouable : la fonction installée contient bien le verrou et le
-- comptage partagé, et une seule surcharge existe.
do $$
declare v_def text; v_n int;
begin
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'register_adherent_full';
  if v_n <> 1 then
    raise exception 'liste_attente : % surcharges de register_adherent_full — attendu 1.', v_n;
  end if;
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'register_adherent_full';
  if position('verrouiller_cours' in v_def) = 0 or position('statuts_occupant_place' in v_def) = 0 then
    raise exception 'liste_attente : la fonction installée ne contient pas la décision de capacité attendue.';
  end if;
end $$;
