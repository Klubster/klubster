-- Fin de la saison codée en dur (« 2025-2026 »). La saison courante se déduit des dates
-- configurées par le club, sinon d'une rentrée de septembre par défaut. Sans ce calcul,
-- les adhésions de la rentrée suivante restaient étiquetées sur l'ancienne saison.
create or replace function public.saison_courante(p_org uuid)
 returns text language sql stable security definer set search_path to 'public'
as $function$
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

-- Les RPC d'inscription utilisent la saison dérivée, plus le littéral.
create or replace function public.inserer_adherents_adhesions(p_org uuid, p_rows jsonb)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
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

create or replace function public.register_adherent_full(p_slug text, p_user_id uuid, p_prenom text, p_nom text, p_email text, p_tel text, p_cours_id uuid, p_infos jsonb, p_mode text)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_tarif int; v_adh uuid; v_adhesion uuid; v_pieces jsonb; pc jsonb; v_saison text;
begin
  select id, form_config->'pieces' into v_org, v_pieces from organisations where slug = p_slug and publie = true;
  if v_org is null then raise exception 'Club introuvable.'; end if;
  select tarif_centimes into v_tarif from cours where id = p_cours_id and organisation_id = v_org;
  if v_tarif is null then raise exception 'Cours invalide.'; end if;
  if coalesce(trim(p_prenom), '') = '' or coalesce(trim(p_nom), '') = '' then raise exception 'Nom et prénom requis.'; end if;
  v_saison := saison_courante(v_org);

  insert into adherents (organisation_id, nom, prenom, email, telephone, user_id, infos)
    values (v_org, left(trim(p_nom), 80), left(trim(p_prenom), 80), nullif(trim(p_email), ''), nullif(trim(p_tel), ''), p_user_id, coalesce(p_infos, '{}'::jsonb))
    returning id into v_adh;
  insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut, mode_paiement)
    values (v_org, v_adh, p_cours_id, v_saison, v_tarif, 'en_attente',
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