-- 0013 — SNAPSHOT DE RÉFÉRENCE (4e audit, 22/07/2026) : RPC métier + Storage.
--
-- L'audit ne pouvait pas certifier la sécurité des RPC absentes des migrations : « une
-- fonction PostgreSQL reçoit un droit d'exécution PUBLIC tant qu'un REVOKE explicite
-- n'est pas appliqué ». Ce fichier fige, tel qu'en production après 0012 :
--   - la définition complète de chaque RPC métier non versionnée jusqu'ici ;
--   - ses droits d'exécution EXPLICITES (revoke all puis grant du strict nécessaire) ;
--   - les politiques du schéma storage et la visibilité des buckets.
-- Avec 0001→0012, la base est désormais reconstructible et auditable de bout en bout.
--
-- Doctrine des droits :
--   service_role uniquement : fonctions appelées par les Server Actions/webhook via la
--     clé service (register_adherent*, enregistrer_questionnaire_sante, webhook Stripe,
--     purge, palier). Aucune raison d'être appelables par un navigateur.
--   authenticated : fonctions de cockpit/espace — chacune revérifie EN INTERNE le rôle
--     et l'organisation (« Non autorisé. ») : la Server Action n'est jamais la seule garde.

-- ————————————————————————————————————————————————————————————————
-- Fonctions réservées à la service_role
-- ————————————————————————————————————————————————————————————————

CREATE OR REPLACE FUNCTION public.enregistrer_questionnaire_sante(p_adhesion_id uuid, p_type text, p_date_naissance date, p_reponses jsonb, p_resultat text, p_signataire_nom text, p_signataire_qualite text, p_signature text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_adherent uuid; v_id uuid;
begin
  select organisation_id, adherent_id into v_org, v_adherent from public.adhesions where id = p_adhesion_id;
  if v_org is null then raise exception 'adhesion introuvable'; end if;

  insert into public.questionnaires_sante(organisation_id, adherent_id, adhesion_id, type, date_naissance, reponses, resultat, signataire_nom, signataire_qualite, signature)
  values (v_org, v_adherent, p_adhesion_id, p_type, p_date_naissance,
          '{}'::jsonb,  -- jamais le détail des réponses, même si l'appelant en fournit
          p_resultat, p_signataire_nom, coalesce(nullif(p_signataire_qualite,''),'adherent'), p_signature)
  returning id into v_id;

  if p_resultat = 'certificat_requis' and v_adherent is not null then
    insert into public.pieces_adherent(organisation_id, adherent_id, cle, label, statut)
    select v_org, v_adherent, 'certificat_medical', 'Certificat médical', 'manquante'
    where not exists (select 1 from public.pieces_adherent pa where pa.adherent_id = v_adherent and pa.cle = 'certificat_medical');
  end if;

  return v_id;
end;
$function$;
revoke execute on function public.enregistrer_questionnaire_sante(uuid, text, date, jsonb, text, text, text, text) from anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.enregistrer_reglement_webhook(p_adhesion_id uuid, p_montant_centimes integer, p_note text DEFAULT NULL::text, p_ref text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_montant int; v_regle int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or p_montant_centimes is null or p_montant_centimes <= 0 then return; end if;

  -- Déjà enregistré pour cet événement ? On sort sans rien faire.
  if p_ref is not null and exists (select 1 from reglements where stripe_ref = p_ref) then
    return;
  end if;

  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note, stripe_ref)
  values (v_org, p_adhesion_id, p_montant_centimes, 'en_ligne', nullif(trim(coalesce(p_note, '')), ''), p_ref);

  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  -- « payé » seulement si le total réglé couvre le montant dû (tolérance d'arrondi 5c pour le 3-fois).
  if v_regle >= v_montant - 5 then update adhesions set statut = 'paye' where id = p_adhesion_id; end if;
end;
$function$;
-- SANS contrôle interne (conçue pour le webhook) : JAMAIS exécutable par un navigateur (0012).
revoke execute on function public.enregistrer_reglement_webhook(uuid, integer, text, text) from anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.enregistrer_remboursement_webhook(p_adhesion_id uuid, p_montant_centimes integer, p_ref text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_montant int; v_regle int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or p_montant_centimes is null or p_montant_centimes <= 0 then return; end if;
  if p_ref is not null and exists (select 1 from reglements where stripe_ref = p_ref) then return; end if;

  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note, stripe_ref)
  values (v_org, p_adhesion_id, -p_montant_centimes, 'remboursement', 'Remboursement (Stripe)', p_ref);

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, null, 'remboursement', 'adhesion', p_adhesion_id, jsonb_build_object('montant_centimes', p_montant_centimes));

  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  if v_regle < v_montant - 5 then
    update adhesions set statut = 'en_attente' where id = p_adhesion_id and statut = 'paye';
  end if;
end;
$function$;
revoke execute on function public.enregistrer_remboursement_webhook(uuid, integer, text) from anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.register_adherent(p_slug text, p_prenom text, p_nom text, p_email text, p_tel text, p_cours_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_tarif int;
  v_adh uuid;
  v_adhesion uuid;
begin
  select id into v_org from organisations where slug = p_slug and publie = true;
  if v_org is null then raise exception 'Club introuvable.'; end if;

  select tarif_centimes into v_tarif from cours where id = p_cours_id and organisation_id = v_org;
  if v_tarif is null then raise exception 'Cours invalide.'; end if;

  if coalesce(trim(p_prenom), '') = '' or coalesce(trim(p_nom), '') = '' then
    raise exception 'Nom et prénom requis.';
  end if;

  insert into adherents (organisation_id, nom, prenom, email, telephone)
    values (v_org, left(trim(p_nom), 80), left(trim(p_prenom), 80), nullif(trim(p_email), ''), nullif(trim(p_tel), ''))
    returning id into v_adh;

  insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut)
    values (v_org, v_adh, p_cours_id, '2025-2026', v_tarif, 'en_attente')
    returning id into v_adhesion;

  return v_adhesion;
end;
$function$;
-- Version héritée (saison figée « 2025-2026 »), conservée pour référence : verrouillée.
revoke execute on function public.register_adherent(text, text, text, text, text, uuid) from anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, prenom, nom, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'prenom', ''),
    nullif(new.raw_user_meta_data->>'nom', ''),
    'adherent'  -- jamais tiré des métadonnées client
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.palier_abonnement(p_org uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when (select count(*) from adherents a where a.organisation_id = p_org) <= 300 then 'starter'
    when (select count(*) from adherents a where a.organisation_id = p_org) <= 500 then 'club'
    else 'club_plus'
  end;
$function$;
revoke execute on function public.palier_abonnement(uuid) from anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.purger_questionnaires_sante()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_season_start date;
  v_deleted integer;
begin
  v_season_start := case
    when extract(month from current_date) >= 9
      then make_date(extract(year from current_date)::int, 9, 1)
    else make_date((extract(year from current_date)::int) - 1, 9, 1)
  end;

  delete from public.questionnaires_sante where created_at < v_season_start;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;
revoke execute on function public.purger_questionnaires_sante() from anon, authenticated, public;

-- ————————————————————————————————————————————————————————————————
-- Fonctions de cockpit/espace (authenticated, contrôle de rôle INTERNE)
-- ————————————————————————————————————————————————————————————————

CREATE OR REPLACE FUNCTION public.cockpit_stats(p_slug text)
 RETURNS TABLE(equipage integer, en_attente integer, en_retard integer, paye integer, tresorerie_centimes bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid;
begin
  select id into v_org from organisations where slug = p_slug;
  if v_org is null then raise exception 'Association introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;

  return query
  select
    (select count(*)::int from adherents a where a.organisation_id = v_org),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.statut = 'en_attente'),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.statut = 'en_retard'),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.statut = 'paye'),
    (select coalesce(sum(ad.montant_centimes), 0)::bigint from adhesions ad where ad.organisation_id = v_org and ad.statut = 'paye');
end;
$function$;
revoke execute on function public.cockpit_stats(text) from anon, public;
grant execute on function public.cockpit_stats(text) to authenticated;

CREATE OR REPLACE FUNCTION public.enregistrer_reglement(p_adhesion_id uuid, p_montant_centimes integer, p_mode text, p_note text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_montant int; v_regle int; v_mode text;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or not ((v_org = current_org_id() and a_role_asso(array['admin_asso','tresorier'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  if p_montant_centimes is null or p_montant_centimes <= 0 then raise exception 'Montant invalide.'; end if;
  v_mode := case when p_mode in ('cheque','especes','en_ligne','autre') then p_mode else 'autre' end;
  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
  values (v_org, p_adhesion_id, p_montant_centimes, v_mode, nullif(trim(coalesce(p_note, '')), ''));
  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, auth.uid(), 'reglement_ajoute', 'adhesion', p_adhesion_id, jsonb_build_object('montant_centimes', p_montant_centimes, 'mode', v_mode));
  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  if v_regle >= v_montant - 5 then update adhesions set statut = 'paye' where id = p_adhesion_id; end if;
  return greatest(v_montant - v_regle, 0);
end;
$function$;
revoke execute on function public.enregistrer_reglement(uuid, integer, text, text) from anon, public;
grant execute on function public.enregistrer_reglement(uuid, integer, text, text) to authenticated;

CREATE OR REPLACE FUNCTION public.equipe_ajouter(p_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_id uuid; v_org_cible uuid;
begin
  v_org := current_org_id();
  if not a_role_asso(array['admin_asso']) then raise exception 'Réservé au président.'; end if;
  select id, organisation_id into v_id, v_org_cible from profiles where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then return 'introuvable'; end if;
  if v_org_cible is not null and v_org_cible <> v_org then return 'deja_membre_ailleurs'; end if;
  update profiles set organisation_id = v_org, role = coalesce(nullif(role,'adherent'),'lecture') where id = v_id;
  return 'ok';
end;
$function$;
revoke execute on function public.equipe_ajouter(text) from anon, public;
grant execute on function public.equipe_ajouter(text) to authenticated;

CREATE OR REPLACE FUNCTION public.equipe_definir_role(p_target uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid;
begin
  v_org := current_org_id();
  if not a_role_asso(array['admin_asso']) then raise exception 'Réservé au président.'; end if;
  if p_target = auth.uid() then raise exception 'Vous ne pouvez pas changer votre propre rôle.'; end if;
  -- Liste blanche SANS super_admin : aucune élévation possible par cette voie.
  if p_role not in ('admin_asso','tresorier','secretaire','encadrant','lecture') then raise exception 'Rôle invalide.'; end if;
  update profiles set role = p_role where id = p_target and organisation_id = v_org;
end;
$function$;
revoke execute on function public.equipe_definir_role(uuid, text) from anon, public;
grant execute on function public.equipe_definir_role(uuid, text) to authenticated;

CREATE OR REPLACE FUNCTION public.equipe_retirer(p_target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not a_role_asso(array['admin_asso']) then raise exception 'Réservé au président.'; end if;
  if p_target = auth.uid() then raise exception 'Vous ne pouvez pas vous retirer vous-même.'; end if;
  update profiles set organisation_id = null, role = 'adherent' where id = p_target and organisation_id = current_org_id();
end;
$function$;
revoke execute on function public.equipe_retirer(uuid) from anon, public;
grant execute on function public.equipe_retirer(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.inserer_adherents_adhesions(p_org uuid, p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb; v_adh uuid; v_count int := 0; v_cours uuid; v_montant int; v_saison text;
begin
  if not (coalesce(p_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  v_saison := saison_courante(p_org);

  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    insert into adherents (organisation_id, prenom, nom, email, telephone)
    values (p_org, left(trim(r->>'prenom'), 80), left(trim(r->>'nom'), 80),
            nullif(trim(coalesce(r->>'email','')), ''), nullif(trim(coalesce(r->>'telephone','')), ''))
    returning id into v_adh;
    v_count := v_count + 1;
    v_cours := nullif(r->>'cours_id','')::uuid;
    if v_cours is not null then
      select tarif_centimes into v_montant from cours where id = v_cours and organisation_id = p_org;
      if v_montant is not null then
        insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut)
        values (p_org, v_adh, v_cours, v_saison, v_montant, 'en_attente');
      end if;
    end if;
  end loop;
  return v_count;
end;
$function$;
revoke execute on function public.inserer_adherents_adhesions(uuid, jsonb) from anon, public;
grant execute on function public.inserer_adherents_adhesions(uuid, jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.marquer_cheques_remis(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_count integer;
begin
  select organisation_id into v_org from profiles where id = auth.uid();
  if not (a_role_asso(array['admin_asso','tresorier'])) then raise exception 'non autorise'; end if;
  update reglements r set remis_le = now()
  where r.id = any(p_ids) and r.mode = 'cheque' and r.remis_le is null and (v_org is null or r.organisation_id = v_org);
  get diagnostics v_count = row_count;
  if v_count > 0 and v_org is not null then
    insert into audit_log (organisation_id, actor_user_id, action, entity_type, details)
    values (v_org, auth.uid(), 'cheques_remis', 'reglement', jsonb_build_object('nombre', v_count));
  end if;
  return v_count;
end;
$function$;
revoke execute on function public.marquer_cheques_remis(uuid[]) from anon, public;
grant execute on function public.marquer_cheques_remis(uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.marquer_encaisse(p_adhesion_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_montant int; v_regle int; v_reste int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or not ((v_org = current_org_id() and a_role_asso(array['admin_asso','tresorier'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  v_reste := v_montant - v_regle;
  if v_reste > 0 then
    insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
    values (v_org, p_adhesion_id, v_reste, 'autre', 'Soldé (encaissement manuel)');
  end if;
  update adhesions set statut = 'paye' where id = p_adhesion_id;
  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id, details)
  values (v_org, auth.uid(), 'adhesion_soldee', 'adhesion', p_adhesion_id, jsonb_build_object('reste_solde_centimes', greatest(v_reste,0)));
end;
$function$;
revoke execute on function public.marquer_encaisse(uuid) from anon, public;
grant execute on function public.marquer_encaisse(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.marquer_present(p_adherent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null or not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  insert into presences (organisation_id, adherent_id, date) values (v_org, p_adherent_id, current_date)
  on conflict (adherent_id, date) do nothing;
end; $function$;
revoke execute on function public.marquer_present(uuid) from anon, public;
grant execute on function public.marquer_present(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.marquer_relance(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_count int;
begin
  v_org := current_org_id();
  if not ((v_org is not null and a_role_asso(array['admin_asso','tresorier'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  update adhesions set derniere_relance = now()
  where id = any(p_ids)
    and (is_super_admin() or organisation_id = v_org);
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
revoke execute on function public.marquer_relance(uuid[]) from anon, public;
grant execute on function public.marquer_relance(uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.promouvoir_liste_attente(p_adhesion_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
revoke execute on function public.promouvoir_liste_attente(uuid) from anon, public;
grant execute on function public.promouvoir_liste_attente(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.renouveler_saison(p_org uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_saison text; v_count int := 0; r record; v_montant int;
begin
  if not ((p_org = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  v_saison := saison_courante(p_org);

  for r in
    -- Dernière adhésion connue de chaque adhérent qui n'a rien pour la saison courante.
    select distinct on (a.id) a.id as adherent_id, ad.cours_id
    from adherents a
    join adhesions ad on ad.adherent_id = a.id
    where a.organisation_id = p_org
      and not exists (select 1 from adhesions x where x.adherent_id = a.id and x.saison = v_saison)
    order by a.id, ad.created_at desc
  loop
    if r.cours_id is null then continue; end if;
    select tarif_centimes into v_montant from cours where id = r.cours_id and organisation_id = p_org;
    if v_montant is null then continue; end if; -- cours supprimé : on saute
    insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut)
    values (p_org, r.adherent_id, r.cours_id, v_saison, v_montant, 'en_attente');
    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    insert into audit_log (organisation_id, actor_user_id, action, entity_type, details)
    values (p_org, auth.uid(), 'saison_renouvelee', 'organisation', jsonb_build_object('saison', v_saison, 'adhesions_creees', v_count));
  end if;
  return v_count;
end;
$function$;
revoke execute on function public.renouveler_saison(uuid) from anon, public;
grant execute on function public.renouveler_saison(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.verifier_adherent(p_adherent_id uuid)
 RETURNS TABLE(prenom text, nom text, cours text, regle boolean, pieces_manquantes integer, present_aujourdhui boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null then raise exception 'Adhérent introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  return query
  select a.prenom, a.nom,
    (select c.nom from adhesions ad join cours c on c.id = ad.cours_id where ad.adherent_id = a.id order by ad.created_at desc limit 1),
    coalesce((select ad.statut = 'paye' from adhesions ad where ad.adherent_id = a.id order by ad.created_at desc limit 1), false),
    (select count(*)::int from pieces_adherent p where p.adherent_id = a.id and p.statut = 'manquante'),
    exists(select 1 from presences pr where pr.adherent_id = a.id and pr.date = current_date)
  from adherents a where a.id = p_adherent_id;
end; $function$;
revoke execute on function public.verifier_adherent(uuid) from anon, public;
grant execute on function public.verifier_adherent(uuid) to authenticated;

-- `saison_courante` reste exécutable largement : simple lecture du libellé de saison,
-- utilisée par d'autres fonctions et sans donnée personnelle.
CREATE OR REPLACE FUNCTION public.saison_courante(p_org uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when o.saison_debut is not null and o.saison_fin is not null then
      case when extract(year from o.saison_fin) = extract(year from o.saison_debut)
        then extract(year from o.saison_debut)::int::text
        else extract(year from o.saison_debut)::int::text || '-' || extract(year from o.saison_fin)::int::text
      end
    when extract(month from current_date) >= 9
      then extract(year from current_date)::int::text || '-' || (extract(year from current_date)::int + 1)::text
    else (extract(year from current_date)::int - 1)::text || '-' || extract(year from current_date)::int::text
  end
  from organisations o where o.id = p_org;
$function$;

-- ————————————————————————————————————————————————————————————————
-- STORAGE — buckets et politiques (état de production)
-- ————————————————————————————————————————————————————————————————
-- Buckets : pieces (PRIVÉ) ; actualites, logos, sections (publics — images de vitrine).
--
-- Politiques sur storage.objects :
--   pieces_member_rw   (ALL, authenticated)  : dossier {org}/{adherent} du compte connecté
--                                              uniquement (foldername[2] = SON adherent_id).
--   pieces_admin_read  (SELECT, authenticated): lecture du préfixe {org} par les membres de
--                                              l'organisation (voir note minimisation).
--   actualites_public_read (SELECT, public)  : bucket public en lecture.
--   actualites_admin_insert/update/delete    : écriture limitée au préfixe {org} de l'auteur.
--   logos_* et sections_* : mêmes règles que actualites.
--
-- Les politiques existent déjà en production ; ce bloc est déclaratif et rejouable.
do $$
begin
  -- Idempotent : on ne recrée que si absentes (reconstruction d'une base neuve).
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'pieces_member_rw') then
    create policy pieces_member_rw on storage.objects for all to authenticated
      using (bucket_id = 'pieces' and (storage.foldername(name))[2] in (select a.id::text from public.adherents a where a.user_id = auth.uid()))
      with check (bucket_id = 'pieces' and (storage.foldername(name))[2] in (select a.id::text from public.adherents a where a.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'pieces_admin_read') then
    create policy pieces_admin_read on storage.objects for select to authenticated
      using (bucket_id = 'pieces' and ((storage.foldername(name))[1] = (public.current_org_id())::text or public.is_super_admin()));
  end if;
end $$;
