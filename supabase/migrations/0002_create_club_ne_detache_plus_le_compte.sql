-- 0002 — create_club ne détache plus le compte de son club précédent
--
-- Appliquée en production le 21/07/2026.
--
-- Contexte : create_club rattachait le club créé au compte appelant en écrasant, sans
-- condition, son organisation_id ET son rôle :
--
--     update public.profiles set organisation_id = v_org, role = 'admin_asso' where id = v_uid;
--
-- Un président qui repassait par le wizard perdait donc l'accès à son club précédent —
-- ses adhérents, sa trésorerie, ses dossiers — silencieusement, sans avertissement ni
-- trace. Un super-admin y perdait en prime son rôle. Le défaut a été constaté quand un
-- brouillon resté dans le stockage local d'un navigateur a republié un club sous une
-- session existante : le compte a basculé sur le club parasite en une seule requête.
--
-- Le modèle produit est « un compte, une association ». On refuse donc explicitement la
-- création d'un second club plutôt que de réaffecter en silence, et on ne dégrade jamais
-- un rôle déjà en place.
--
-- NOTE : ce fichier inaugure le versionnement du schéma réel. Les politiques RLS et les
-- autres fonctions vivent encore uniquement dans le projet Supabase — dette identifiée
-- lors de l'audit du 21/07/2026, à résorber par export.

create or replace function public.create_club(
  p_nom text, p_template text, p_mode text, p_couleur text, p_adresse text,
  p_email text, p_tel text, p_accroche text, p_slug_base text, p_cours jsonb
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  insert into organisations (slug, nom, theme_template, theme_mode, couleur_primaire, adresse, email_contact, telephone, accroche, publie)
  values (
    v_slug,
    left(coalesce(nullif(trim(p_nom), ''), 'Mon club'), 120),
    v_template,
    v_mode,
    coalesce(nullif(p_couleur, ''), '#111111'),
    nullif(p_adresse, ''), nullif(p_email, ''), nullif(p_tel, ''),
    nullif(p_accroche, ''), true
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
