-- Templates de design par club (choisis à la création, modifiables plus tard).
alter table public.organisations
  add column if not exists theme_template text not null default 'editorial',
  add column if not exists theme_mode text not null default 'blanc';

alter table public.organisations
  drop constraint if exists organisations_theme_template_check;
alter table public.organisations
  add constraint organisations_theme_template_check
  check (theme_template in ('editorial','classique','grotesque','rond','athletique','brut'));

alter table public.organisations
  drop constraint if exists organisations_theme_mode_check;
alter table public.organisations
  add constraint organisations_theme_mode_check
  check (theme_mode in ('blanc','noir'));

-- Nouvelle version de create_club : le sport disparaît, remplacé par template + mode.
drop function if exists public.create_club(text, text, text, text, text, text, text, text, jsonb);

create or replace function public.create_club(
  p_nom text, p_template text, p_mode text, p_couleur text,
  p_adresse text, p_email text, p_tel text,
  p_accroche text, p_slug_base text, p_cours jsonb
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
  c jsonb;
  v_ord int := 0;
  v_template text;
  v_mode text;
begin
  if v_uid is null then
    raise exception 'Authentification requise pour créer un club.';
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

  -- Rattacher le club au président connecté
  update public.profiles set organisation_id = v_org, role = 'admin_asso' where id = v_uid;

  return v_slug;
end;
$function$;