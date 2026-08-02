-- Règlements (acomptes chèque/espèces/en ligne) : une adhésion peut être payée en plusieurs fois.
create table if not exists public.reglements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  adhesion_id uuid not null references public.adhesions (id),
  montant_centimes int not null check (montant_centimes > 0),
  mode text not null default 'cheque' check (mode in ('cheque','especes','en_ligne','autre')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists reglements_adhesion_idx on public.reglements (adhesion_id);

alter table public.reglements enable row level security;
drop policy if exists "reglements_same_org" on public.reglements;
create policy "reglements_same_org" on public.reglements
  for all
  using (organisation_id = current_org_id() or is_super_admin())
  with check (organisation_id = current_org_id() or is_super_admin());

-- Enregistrer un règlement (partiel ou total). Passe l'adhésion en 'paye' quand le solde est couvert.
create or replace function public.enregistrer_reglement(
  p_adhesion_id uuid, p_montant_centimes int, p_mode text, p_note text default null
)
returns int -- solde restant en centimes
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid;
  v_montant int;
  v_regle int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or not (v_org = current_org_id() or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;
  if p_montant_centimes is null or p_montant_centimes <= 0 then
    raise exception 'Montant invalide.';
  end if;

  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
  values (v_org, p_adhesion_id,
          p_montant_centimes,
          case when p_mode in ('cheque','especes','en_ligne','autre') then p_mode else 'autre' end,
          nullif(trim(coalesce(p_note, '')), ''));

  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  if v_regle >= v_montant - 5 then -- tolérance arrondi (3 x montant/3)
    update adhesions set statut = 'paye' where id = p_adhesion_id;
  end if;
  return greatest(v_montant - v_regle, 0);
end;
$function$;

-- Version service-role (webhook Stripe) : mêmes effets, sans current_org_id().
create or replace function public.enregistrer_reglement_webhook(
  p_adhesion_id uuid, p_montant_centimes int, p_note text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid;
  v_montant int;
  v_regle int;
begin
  select organisation_id, montant_centimes into v_org, v_montant from adhesions where id = p_adhesion_id;
  if v_org is null or p_montant_centimes is null or p_montant_centimes <= 0 then return; end if;
  insert into reglements (organisation_id, adhesion_id, montant_centimes, mode, note)
  values (v_org, p_adhesion_id, p_montant_centimes, 'en_ligne', nullif(trim(coalesce(p_note, '')), ''));
  select coalesce(sum(montant_centimes), 0) into v_regle from reglements where adhesion_id = p_adhesion_id;
  if v_regle >= v_montant - 5 then
    update adhesions set statut = 'paye' where id = p_adhesion_id;
  end if;
end;
$function$;
revoke execute on function public.enregistrer_reglement_webhook(uuid, int, text) from anon, authenticated;

-- Pièces conditionnées à un cours : on ne crée la pièce attendue que si le cours correspond.
create or replace function public.register_adherent_full(
  p_slug text, p_user_id uuid, p_prenom text, p_nom text, p_email text, p_tel text,
  p_cours_id uuid, p_infos jsonb, p_mode text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- Pièces attendues (depuis le formulaire du club), filtrées par cours si la pièce est conditionnée.
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