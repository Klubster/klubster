
create table if not exists public.questionnaires_sante (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  adherent_id uuid references public.adherents(id) on delete cascade,
  adhesion_id uuid references public.adhesions(id) on delete set null,
  type text not null check (type in ('adulte','mineur')),
  date_naissance date,
  reponses jsonb not null default '{}'::jsonb,
  resultat text not null check (resultat in ('atteste_negatif','certificat_requis')),
  signataire_nom text,
  signataire_qualite text not null default 'adherent' check (signataire_qualite in ('adherent','representant_legal')),
  signature text,
  created_at timestamptz not null default now()
);

alter table public.questionnaires_sante enable row level security;

drop policy if exists "qs_read_org" on public.questionnaires_sante;
create policy "qs_read_org" on public.questionnaires_sante
  for select using ( organisation_id = public.current_org_id() or public.is_super_admin() );

drop policy if exists "qs_read_self" on public.questionnaires_sante;
create policy "qs_read_self" on public.questionnaires_sante
  for select using (
    exists (select 1 from public.adherents a
            where a.id = questionnaires_sante.adherent_id and a.user_id = auth.uid())
  );

create index if not exists idx_qs_adherent on public.questionnaires_sante(adherent_id);
create index if not exists idx_qs_org on public.questionnaires_sante(organisation_id);

create or replace function public.enregistrer_questionnaire_sante(
  p_adhesion_id uuid,
  p_type text,
  p_date_naissance date,
  p_reponses jsonb,
  p_resultat text,
  p_signataire_nom text,
  p_signataire_qualite text,
  p_signature text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_adherent uuid;
  v_id uuid;
begin
  select organisation_id, adherent_id into v_org, v_adherent
  from public.adhesions where id = p_adhesion_id;
  if v_org is null then
    raise exception 'adhesion introuvable';
  end if;

  insert into public.questionnaires_sante(
    organisation_id, adherent_id, adhesion_id, type, date_naissance,
    reponses, resultat, signataire_nom, signataire_qualite, signature)
  values (
    v_org, v_adherent, p_adhesion_id, p_type, p_date_naissance,
    coalesce(p_reponses, '{}'::jsonb), p_resultat, p_signataire_nom,
    coalesce(nullif(p_signataire_qualite,''),'adherent'), p_signature)
  returning id into v_id;

  if p_resultat = 'certificat_requis' and v_adherent is not null then
    insert into public.pieces_adherent(organisation_id, adherent_id, cle, label, statut)
    select v_org, v_adherent, 'certificat_medical', 'Certificat médical', 'manquante'
    where not exists (
      select 1 from public.pieces_adherent pa
      where pa.adherent_id = v_adherent and pa.cle = 'certificat_medical'
    );
  end if;

  return v_id;
end;
$$;

grant execute on function public.enregistrer_questionnaire_sante(uuid,text,date,jsonb,text,text,text,text) to anon, authenticated;
