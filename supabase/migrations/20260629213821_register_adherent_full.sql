
alter table public.adhesions
  add column if not exists mode_paiement text;

-- Inscription complète : adhérent (lié au compte) + adhésion + réponses + pièces du formulaire du club.
create or replace function public.register_adherent_full(
  p_slug text,
  p_user_id uuid,
  p_prenom text,
  p_nom text,
  p_email text,
  p_tel text,
  p_cours_id uuid,
  p_infos jsonb,
  p_mode text
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
  v_pieces jsonb;
  pc jsonb;
begin
  select id, form_config->'pieces' into v_org, v_pieces from organisations where slug = p_slug and publie = true;
  if v_org is null then raise exception 'Club introuvable.'; end if;

  select tarif_centimes into v_tarif from cours where id = p_cours_id and organisation_id = v_org;
  if v_tarif is null then raise exception 'Cours invalide.'; end if;
  if coalesce(trim(p_prenom), '') = '' or coalesce(trim(p_nom), '') = '' then
    raise exception 'Nom et prénom requis.';
  end if;

  insert into adherents (organisation_id, nom, prenom, email, telephone, user_id, infos)
    values (v_org, left(trim(p_nom), 80), left(trim(p_prenom), 80),
            nullif(trim(p_email), ''), nullif(trim(p_tel), ''), p_user_id,
            coalesce(p_infos, '{}'::jsonb))
    returning id into v_adh;

  insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut, mode_paiement)
    values (v_org, v_adh, p_cours_id, '2025-2026', v_tarif, 'en_attente',
            case when p_mode in ('en_ligne','cheque','especes') then p_mode else null end)
    returning id into v_adhesion;

  -- Pièces attendues (depuis le formulaire du club)
  if v_pieces is not null then
    for pc in select * from jsonb_array_elements(v_pieces) loop
      insert into pieces_adherent (organisation_id, adherent_id, cle, label, statut)
      values (v_org, v_adh, coalesce(pc->>'id', md5(coalesce(pc->>'label',''))), coalesce(pc->>'label','Pièce'), 'manquante');
    end loop;
  end if;

  return v_adhesion;
end;
$$;

revoke all on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) from public;
grant execute on function public.register_adherent_full(text,uuid,text,text,text,text,uuid,jsonb,text) to anon, authenticated;
