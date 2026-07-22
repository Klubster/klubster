-- Rétention et RGPD du journal d'emails (3e audit).
--
-- `emails_journal.adherent_id` n'avait pas de clé étrangère, et `anonymiser_adherent` ne
-- touchait pas cette table : l'adresse email d'un adhérent y survivait à l'exercice de son
-- droit à l'effacement. On corrige les deux.

-- Orphelins éventuels avant de poser la contrainte.
update public.emails_journal
  set adherent_id = null
  where adherent_id is not null
    and not exists (select 1 from public.adherents a where a.id = emails_journal.adherent_id);

alter table public.emails_journal
  drop constraint if exists emails_journal_adherent_fk;
alter table public.emails_journal
  add constraint emails_journal_adherent_fk
  foreign key (adherent_id) references public.adherents(id) on delete set null;

-- L'anonymisation efface désormais aussi la trace email : on garde la ligne de journal
-- (pour ne pas fausser d'éventuelles statistiques d'envoi) mais sans donnée identifiante.
create or replace function public.anonymiser_adherent(p_adherent_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null or not ((v_org = current_org_id() and a_role_asso(array['admin_asso'])) or is_super_admin()) then
    raise exception 'Non autorisé.';
  end if;

  delete from questionnaires_sante where adherent_id = p_adherent_id;
  delete from pieces_adherent where adherent_id = p_adherent_id;
  delete from presences where adherent_id = p_adherent_id;

  -- Journal d'emails : on efface l'adresse et on détache l'adhérent.
  update emails_journal set destinataire = null, adherent_id = null where adherent_id = p_adherent_id;

  update adherents
    set prenom = 'Adhérent', nom = 'anonymisé', email = null, telephone = null,
        date_naissance = null, infos = '{}'::jsonb, user_id = null
    where id = p_adherent_id;

  insert into audit_log (organisation_id, actor_user_id, action, entity_type, entity_id)
  values (v_org, auth.uid(), 'adherent_anonymise', 'adherent', p_adherent_id);
end;
$function$;
