-- SNAPSHOT DE RÉFÉRENCE — fonctions d'autorisation (3e audit).
--
-- L'audit a noté avec raison que l'export permettait d'auditer les policies qui APPELLENT
-- ces fonctions, mais pas leur logique interne. Les voici, telles qu'en production, pour
-- que la base soit reconstructible et auditable de bout en bout.
--
-- Toutes sont STABLE SECURITY DEFINER : elles lisent `profiles` via `auth.uid()` et sont
-- appelées DANS les policies RLS (d'où le SECURITY DEFINER, sinon la RLS de `profiles`
-- s'appliquerait récursivement). Elles restent volontairement exécutables par `anon` et
-- `authenticated` — c'est nécessaire à l'évaluation des policies.

create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path to 'public'
as $$ select organisation_id from public.profiles where id = auth.uid() $$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin') $$;

create or replace function public.role_asso()
returns text language sql stable security definer set search_path to 'public'
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.a_role_asso(p_roles text[])
returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce(is_super_admin(), false) or coalesce(role_asso() = any(p_roles), false) $$;
