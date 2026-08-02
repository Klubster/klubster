-- Rôles bénévoles au sein d'une association. Jusqu'ici tout membre était « admin_asso »
-- (accès total). On introduit des rôles distincts, appliqués aux données sensibles :
--   admin_asso : président — tout
--   tresorier  : trésorerie et paiements + lecture adhérents ; PAS les données de santé
--   secretaire : adhérents, dossiers, pièces, santé, messages, site
--   encadrant  : contrôle terrain (scan) + présences + lecture adhérents ; PAS santé ni paiements
--   lecture    : lecture seule
-- (super_admin = exploitant Klubster ; adherent = membre côté public)

-- Rôle de l'utilisateur courant dans SON organisation.
create or replace function public.role_asso()
 returns text language sql stable security definer set search_path to 'public'
as $function$ select role from public.profiles where id = auth.uid() $function$;

-- Vrai si l'utilisateur a l'un des rôles demandés (ou est super_admin).
create or replace function public.a_role_asso(p_roles text[])
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select coalesce(is_super_admin(), false) or coalesce(role_asso() = any(p_roles), false)
$function$;

-- Les questionnaires de santé (données art. 9) ne sont lisibles que par le président et
-- le secrétariat — jamais par le trésorier ni l'encadrant.
drop policy if exists qs_read_org on public.questionnaires_sante;
create policy qs_read_org on public.questionnaires_sante
  for select using (
    organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])
  );