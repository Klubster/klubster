
create or replace function public.create_club(
  p_nom text,
  p_sport text,
  p_couleur text,
  p_adresse text,
  p_email text,
  p_tel text,
  p_accroche text,
  p_slug_base text,
  p_cours jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_i int := 1;
  v_org uuid;
  c jsonb;
  v_ord int := 0;
begin
  v_base := nullif(regexp_replace(lower(coalesce(p_slug_base, '')), '[^a-z0-9]', '', 'g'), '');
  if v_base is null then v_base := 'club'; end if;
  v_slug := v_base;
  while exists (select 1 from organisations where slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || v_i::text;
  end loop;

  insert into organisations (slug, nom, sport, couleur_primaire, adresse, email_contact, telephone, accroche, publie)
  values (
    v_slug,
    left(coalesce(nullif(trim(p_nom), ''), 'Mon club'), 120),
    nullif(p_sport, ''),
    coalesce(nullif(p_couleur, ''), '#111111'),
    nullif(p_adresse, ''),
    nullif(p_email, ''),
    nullif(p_tel, ''),
    nullif(p_accroche, ''),
    true
  )
  returning id into v_org;

  for c in select * from jsonb_array_elements(coalesce(p_cours, '[]'::jsonb)) loop
    v_ord := v_ord + 1;
    insert into cours (organisation_id, nom, public_cible, age_min, age_max, tarif_centimes, creneaux, ordre)
    values (
      v_org,
      coalesce(c->>'nom', 'Cours'),
      c->>'public_cible',
      nullif(c->>'age_min', '')::int,
      nullif(c->>'age_max', '')::int,
      coalesce((c->>'tarif_centimes')::int, 0),
      coalesce(c->'creneaux', '[]'::jsonb),
      v_ord
    );
  end loop;

  return v_slug;
end;
$$;

revoke all on function public.create_club(text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_club(text,text,text,text,text,text,text,text,jsonb) to anon, authenticated;
