-- Abonnement Klubster (facture par la plateforme, distinct de Stripe Connect
-- qui sert aux cotisations des adherents).
alter table public.organisations
  add column if not exists abonnement_customer_id text,
  add column if not exists abonnement_subscription_id text,
  add column if not exists abonnement_statut text not null default 'aucun',
  add column if not exists abonnement_essai_fin timestamptz,
  add column if not exists abonnement_periode_fin timestamptz;

alter table public.organisations drop constraint if exists organisations_abonnement_statut_valide;
alter table public.organisations
  add constraint organisations_abonnement_statut_valide
  check (abonnement_statut in ('aucun','essai','actif','impaye','resilie'));

comment on column public.organisations.abonnement_statut is
  'aucun | essai (1er mois offert) | actif | impaye | resilie';

-- Le palier tarifaire depend du nombre d''adherents : 9 EUR (<=300), 19 (<=500), 29 (>500).
create or replace function public.palier_abonnement(p_org uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when (select count(*) from adherents a where a.organisation_id = p_org) <= 300 then 'starter'
    when (select count(*) from adherents a where a.organisation_id = p_org) <= 500 then 'club'
    else 'club_plus'
  end;
$function$;

revoke execute on function public.palier_abonnement(uuid) from public, anon;
grant execute on function public.palier_abonnement(uuid) to authenticated, service_role;