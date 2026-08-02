
create or replace function public.register_adherent(
  p_slug text, p_prenom text, p_nom text, p_email text, p_tel text, p_cours_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.register_adherent(text,text,text,text,text,uuid) from public;
grant execute on function public.register_adherent(text,text,text,text,text,uuid) to anon, authenticated;
