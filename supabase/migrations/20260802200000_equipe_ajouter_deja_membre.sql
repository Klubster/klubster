-- `equipe_ajouter` : dire la vérité quand la personne est déjà dans l'équipe.
--
-- Trouvé en exerçant le parcours président dans le navigateur (02/08/2026) : ajouter
-- l'email d'un compte déjà rattaché à SON PROPRE club renvoyait « ok », et l'écran
-- affichait « Membre ajouté à l'équipe, en lecture seule » — alors que rien n'avait
-- changé et que la personne gardait son rôle (ici : trésorier). Le message était faux
-- deux fois. Le cas « déjà membre d'une AUTRE association » était, lui, déjà couvert.
--
-- On ajoute un retour `deja_membre`, traduit à l'écran par un message exact. Aucun
-- changement de droits : la fonction reste réservée au président via a_role_asso.

create or replace function public.equipe_ajouter(p_email text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid; v_id uuid; v_org_cible uuid;
begin
  v_org := current_org_id();
  if not a_role_asso(array['admin_asso']) then raise exception 'Réservé au président.'; end if;
  select id, organisation_id into v_id, v_org_cible from profiles where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then return 'introuvable'; end if;
  if v_org_cible is not null and v_org_cible <> v_org then return 'deja_membre_ailleurs'; end if;
  if v_org_cible = v_org then return 'deja_membre'; end if;
  update profiles set organisation_id = v_org, role = coalesce(nullif(role,'adherent'),'lecture') where id = v_id;
  return 'ok';
end;
$function$;

-- La RPC est appelée avec la session de l'utilisateur : `authenticated` doit pouvoir
-- l'exécuter (le contrôle réel est le a_role_asso ci-dessus). Jamais `anon`.
revoke execute on function public.equipe_ajouter(text) from anon, public;
grant execute on function public.equipe_ajouter(text) to authenticated;
