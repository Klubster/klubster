-- Défense en profondeur sur `profiles.role` et `profiles.organisation_id` (3e audit).
--
-- Aujourd'hui, l'escalade de privilège décrite par l'audit N'EST PAS possible : le rôle
-- `authenticated` n'a de droit UPDATE que sur les colonnes `nom` et `prenom` (privilèges
-- par colonne), donc une requête PostgREST tentant de changer `role` est déjà rejetée par
-- Postgres avant même la RLS.
--
-- Mais cette protection repose uniquement sur les grants de colonnes : un futur
-- `grant update on profiles to authenticated` la ferait sauter sans bruit. On ajoute donc
-- un garde explicite : toute modification de `role` ou `organisation_id` faite dans un
-- contexte utilisateur direct (`authenticated`/`anon`) est refusée. Les seules voies
-- autorisées sont les fonctions de gestion d'équipe (`equipe_*`, SECURITY DEFINER,
-- exécutées en tant que `postgres`) et le `service_role`.
--
-- Le trigger est volontairement en SECURITY INVOKER : c'est ce qui fait que `current_user`
-- reflète le vrai contexte — `authenticated` sur un appel direct, `postgres` à l'intérieur
-- d'une fonction d'équipe.

create or replace function public.proteger_role_profile()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if (new.role is distinct from old.role
      or new.organisation_id is distinct from old.organisation_id)
     and current_user in ('authenticated', 'anon')
  then
    raise exception 'Modification du rôle ou de l''organisation interdite par cette voie.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_role_profile on public.profiles;
create trigger trg_proteger_role_profile
  before update on public.profiles
  for each row execute function public.proteger_role_profile();
