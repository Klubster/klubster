-- 1) Compte plateforme dedie.
update public.profiles set role = 'super_admin' where email = '__KLUBSTER_SUPER_ADMIN_EMAIL__';

-- 2) P1 / V4 : cockpit_stats acceptait n'importe quel slug public et renvoyait
-- l'effectif + la tresorerie du club. Desormais : seul le club de l'appelant (ou un super_admin).
create or replace function public.cockpit_stats(p_slug text)
 returns table(equipage integer, en_attente integer, en_retard integer, paye integer, tresorerie_centimes bigint)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid;
begin
  select id into v_org from organisations where slug = p_slug;
  if v_org is null then raise exception 'Association introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;

  return query
  select
    (select count(*)::int from adherents a where a.organisation_id = v_org),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.statut = 'en_attente'),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.statut = 'en_retard'),
    (select count(*)::int from adhesions ad where ad.organisation_id = v_org and ad.statut = 'paye'),
    (select coalesce(sum(ad.montant_centimes), 0)::bigint from adhesions ad where ad.organisation_id = v_org and ad.statut = 'paye');
end;
$function$;

revoke execute on function public.cockpit_stats(text) from public, anon;
grant execute on function public.cockpit_stats(text) to authenticated;

-- 3) P1 / V5 : idempotence du webhook Stripe. Un evenement redelivre ne doit etre traite qu'une fois.
create table if not exists public.stripe_events (
  event_id text primary key,
  type text,
  recu_le timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- Aucune policy : seule la service_role (qui contourne la RLS) y accede. Personne d'autre.
revoke all on table public.stripe_events from public, anon, authenticated;