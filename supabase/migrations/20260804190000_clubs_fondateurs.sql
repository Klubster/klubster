-- Lot Q — l'offre « quinze clubs fondateurs, trois mois offerts » devient vraie (04/08/2026).
--
-- CE QUI ÉTAIT ANNONCÉ, ET CE QUI SE PASSAIT VRAIMENT :
--
--   1. « TROIS MOIS OFFERTS » (home, /tarifs, /clubs-fondateurs, CGV art. « les quinze
--      premiers clubs bénéficient de trois mois d'abonnement offerts »).
--      Le code posait `trial_period_days: 30`. Un club fondateur était donc facturé
--      au bout d'UN mois. Les deux mois supplémentaires reposaient sur un code promo
--      que le club devait saisir lui-même dans son cockpit — geste que rien ne lui
--      demande et qu'aucune page n'annonce. Une promesse dont la réalisation dépend
--      d'une action inconnue du client n'est pas une promesse : c'est un prélèvement
--      qui arrive pendant la période annoncée gratuite.
--
--   2. « LES QUINZE PREMIERS CLUBS ». `CLUBS_FONDATEURS = 15` n'existait que dans les
--      textes : aucun compteur, aucune place consommée, aucun seizième refusé. Le
--      chiffre était décoratif.
--
-- CE QUE FAIT CETTE MIGRATION : `organisations.fondateur_rang`, attribué **dans la
-- transaction de création** du club. Le rang 1 à 15 vaut la qualité de fondateur ;
-- au-delà, la colonne reste nulle et le club suit l'offre normale. Le rang est le
-- fait juridique : il dit qui est fondateur, dans quel ordre, et il est vérifiable.
--
-- POURQUOI UN RANG ET PAS UN BOOLÉEN : deux créations simultanées pour la quinzième
-- place doivent départager. Un compteur `count(*)` lu puis écrit laisse passer les
-- deux. Le rang vient d'une SÉQUENCE, atomique par construction : deux appels
-- concurrents obtiennent 15 et 16, jamais 15 et 15.
--
-- La durée de gratuité est dérivée du rang côté application (`JOURS_ESSAI_FONDATEUR`),
-- de sorte qu'une seule fonction décide : `joursEssai(org)`.
--
-- RETOUR ARRIÈRE :
--   drop sequence if exists fondateur_rang_seq;
--   alter table organisations drop column if exists fondateur_rang;
--   (puis restaurer create_club depuis la migration précédente)

create sequence if not exists fondateur_rang_seq start with 1;

alter table organisations
  add column if not exists fondateur_rang int;

comment on column organisations.fondateur_rang is
  'Rang d''arrivée dans l''offre de lancement, attribué atomiquement à la création. 1..15 = club fondateur (trois mois offerts, accompagnement). Au-delà de 15 : offre normale. NULL = créé avant la mise en place du rang.';

create unique index if not exists organisations_fondateur_rang_unique
  on organisations (fondateur_rang) where fondateur_rang is not null;

-- Les clubs déjà présents avant cette migration prennent leur rang par ancienneté :
-- ils ont été là les premiers, l'offre leur revient. La séquence repart après eux.
do $$
declare v_max int;
begin
  if not exists (select 1 from organisations where fondateur_rang is not null) then
    with classes as (
      select id, row_number() over (order by created_at, id) as rang
      from organisations
    )
    update organisations o set fondateur_rang = c.rang
      from classes c where c.id = o.id;
  end if;
  select coalesce(max(fondateur_rang), 0) into v_max from organisations;
  perform setval('fondateur_rang_seq', v_max + 1, false);
end $$;

-- ——— create_club : le rang est posé dans la même transaction que le club ————————
--
-- Fonction RÉÉCRITE EN ENTIER (aucune chirurgie de texte sur pg_proc) : seul l'insert
-- change, le reste est repris à l'identique de la version précédente.

CREATE OR REPLACE FUNCTION public.create_club(p_nom text, p_template text, p_mode text, p_couleur text, p_adresse text, p_email text, p_tel text, p_accroche text, p_slug_base text, p_cours jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_base text;
  v_slug text;
  v_i int := 1;
  v_org uuid;
  v_uid uuid := auth.uid();
  v_org_actuelle uuid;
  v_role text;
  c jsonb;
  v_ord int := 0;
  v_template text;
  v_mode text;
  v_rang int;
begin
  if v_uid is null then
    raise exception 'Authentification requise pour créer un club.';
  end if;

  select organisation_id, role into v_org_actuelle, v_role
  from public.profiles where id = v_uid;

  -- Garde-fou : ce compte pilote déjà une association. La réaffecter lui ferait perdre
  -- l'accès à la première, ses adhérents et sa trésorerie compris.
  if v_org_actuelle is not null then
    raise exception 'Ce compte gère déjà une association. Utilisez une autre adresse email pour en créer une seconde.'
      using errcode = 'P0001';
  end if;

  v_template := case when p_template in ('editorial','classique','grotesque','rond','athletique','brut') then p_template else 'editorial' end;
  v_mode := case when p_mode in ('blanc','noir') then p_mode else 'blanc' end;

  v_base := nullif(regexp_replace(lower(coalesce(p_slug_base, '')), '[^a-z0-9]', '', 'g'), '');
  if v_base is null then v_base := 'club'; end if;
  v_slug := v_base;
  while exists (select 1 from organisations where slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || v_i::text;
  end loop;

  -- LE RANG : une séquence, donc atomique. Deux créations simultanées pour la
  -- quinzième place obtiennent 15 et 16 — jamais deux fois 15.
  v_rang := nextval('fondateur_rang_seq');

  insert into organisations (slug, nom, theme_template, theme_mode, couleur_primaire, adresse, email_contact, telephone, accroche, publie, fondateur_rang)
  values (
    v_slug,
    left(coalesce(nullif(trim(p_nom), ''), 'Mon club'), 120),
    v_template,
    v_mode,
    coalesce(nullif(p_couleur, ''), '#111111'),
    nullif(p_adresse, ''), nullif(p_email, ''), nullif(p_tel, ''),
    nullif(p_accroche, ''), true,
    v_rang
  )
  returning id into v_org;

  for c in select * from jsonb_array_elements(coalesce(p_cours, '[]'::jsonb)) loop
    v_ord := v_ord + 1;
    insert into cours (organisation_id, nom, public_cible, age_min, age_max, tarif_centimes, creneaux, ordre)
    values (
      v_org, coalesce(c->>'nom', 'Cours'), c->>'public_cible',
      nullif(c->>'age_min', '')::int, nullif(c->>'age_max', '')::int,
      coalesce((c->>'tarif_centimes')::int, 0),
      coalesce(c->'creneaux', '[]'::jsonb), v_ord
    );
  end loop;

  -- Rattacher le club au président connecté. Le rôle n'est posé que s'il n'en a pas
  -- déjà un supérieur : un super-admin reste super-admin.
  update public.profiles
  set organisation_id = v_org,
      role = case when role = 'super_admin' then role else 'admin_asso' end
  where id = v_uid;

  return v_slug;
end;
$function$;

revoke execute on function public.create_club(text, text, text, text, text, text, text, text, text, jsonb) from anon, public;
grant execute on function public.create_club(text, text, text, text, text, text, text, text, text, jsonb) to authenticated;

-- Garde-fou de relecture : la fonction déployée contient bien l'attribution du rang.
do $$
begin
  if position('nextval(''fondateur_rang_seq'')' in
      pg_get_functiondef('public.create_club(text, text, text, text, text, text, text, text, text, jsonb)'::regprocedure)) = 0 then
    raise exception 'create_club ne pose pas le rang fondateur — migration incomplète.';
  end if;
end $$;
