-- Gestion de l'équipe, réservée au président. profiles n'étant plus modifiable
-- directement (sécurité), tout passe par ces RPC.

-- Changer le rôle d'un membre de son organisation.
create or replace function public.equipe_definir_role(p_target uuid, p_role text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid;
begin
  v_org := current_org_id();
  if not a_role_asso(array['admin_asso']) then raise exception 'Réservé au président.'; end if;
  if p_target = auth.uid() then raise exception 'Vous ne pouvez pas changer votre propre rôle.'; end if;
  if p_role not in ('admin_asso','tresorier','secretaire','encadrant','lecture') then raise exception 'Rôle invalide.'; end if;
  update profiles set role = p_role where id = p_target and organisation_id = v_org;
end;
$function$;

-- Rattacher un compte existant (sans organisation) à son association, en lecture seule.
create or replace function public.equipe_ajouter(p_email text)
 returns text language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_id uuid; v_org_cible uuid;
begin
  v_org := current_org_id();
  if not a_role_asso(array['admin_asso']) then raise exception 'Réservé au président.'; end if;
  select id, organisation_id into v_id, v_org_cible from profiles where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then return 'introuvable'; end if;
  if v_org_cible is not null and v_org_cible <> v_org then return 'deja_membre_ailleurs'; end if;
  update profiles set organisation_id = v_org, role = coalesce(nullif(role,'adherent'),'lecture') where id = v_id;
  return 'ok';
end;
$function$;

-- Retirer un membre de l'équipe (il redevient un simple compte).
create or replace function public.equipe_retirer(p_target uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not a_role_asso(array['admin_asso']) then raise exception 'Réservé au président.'; end if;
  if p_target = auth.uid() then raise exception 'Vous ne pouvez pas vous retirer vous-même.'; end if;
  update profiles set organisation_id = null, role = 'adherent' where id = p_target and organisation_id = current_org_id();
end;
$function$;

revoke all on function public.equipe_definir_role(uuid, text) from public, anon;
revoke all on function public.equipe_ajouter(text) from public, anon;
revoke all on function public.equipe_retirer(uuid) from public, anon;
grant execute on function public.equipe_definir_role(uuid, text) to authenticated;
grant execute on function public.equipe_ajouter(text) to authenticated;
grant execute on function public.equipe_retirer(uuid) to authenticated;