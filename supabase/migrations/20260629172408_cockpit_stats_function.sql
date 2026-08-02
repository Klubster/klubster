
create or replace function public.cockpit_stats(p_slug text)
returns table(equipage int, en_attente int, en_retard int, paye int, tresorerie_centimes bigint)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*)::int from adherents a join organisations o on o.id=a.organisation_id
       where o.slug = p_slug and o.publie),
    (select count(*)::int from adhesions ad join organisations o on o.id=ad.organisation_id
       where o.slug = p_slug and o.publie and ad.statut='en_attente'),
    (select count(*)::int from adhesions ad join organisations o on o.id=ad.organisation_id
       where o.slug = p_slug and o.publie and ad.statut='en_retard'),
    (select count(*)::int from adhesions ad join organisations o on o.id=ad.organisation_id
       where o.slug = p_slug and o.publie and ad.statut='paye'),
    (select coalesce(sum(ad.montant_centimes),0)::bigint from adhesions ad join organisations o on o.id=ad.organisation_id
       where o.slug = p_slug and o.publie and ad.statut='paye');
$$;

revoke all on function public.cockpit_stats(text) from public;
grant execute on function public.cockpit_stats(text) to anon, authenticated;
