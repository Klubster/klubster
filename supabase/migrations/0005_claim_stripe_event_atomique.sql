-- Verrou d'idempotence des webhooks Stripe, rendu atomique.
--
-- L'ancien modèle « réclamer » lisait puis réécrivait le statut en deux temps : deux
-- livraisons concurrentes du même événement (Stripe peut en émettre) pouvaient toutes
-- deux franchir le verrou et traiter le règlement en double (audit du 21/07/2026).
--
-- On remplace la lecture-écriture par une seule instruction `INSERT ... ON CONFLICT DO
-- UPDATE ... WHERE`, atomique et verrouillante au niveau de la ligne. Un seul appelant
-- obtient le bail ; les autres repartent sans retraiter. Un bail expiré (worker mort en
-- cours de route) ou un précédent traitement échoué peuvent être repris.

alter table public.stripe_events
  add column if not exists verrou_expire timestamptz;

create or replace function public.claim_stripe_event(
  p_event_id text, p_type text, p_lease_seconds int default 120)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_statut text;
begin
  insert into stripe_events (event_id, type, statut, tentatives, verrou_expire)
  values (p_event_id, p_type, 'en_cours', 1, now() + make_interval(secs => p_lease_seconds))
  on conflict (event_id) do update
    set statut = 'en_cours',
        tentatives = stripe_events.tentatives + 1,
        verrou_expire = now() + make_interval(secs => p_lease_seconds)
    where stripe_events.statut = 'echoue'
       or (stripe_events.statut = 'en_cours' and coalesce(stripe_events.verrou_expire, to_timestamp(0)) < now())
  returning statut into v_statut;

  -- Une ligne renvoyée = on a obtenu le bail (insertion, ou reprise d'un échec / bail expiré).
  if found then
    return 'nouveau';
  end if;

  -- Sinon le conflit n'a pas satisfait la clause : soit déjà traité, soit en cours ailleurs.
  select statut into v_statut from stripe_events where event_id = p_event_id;
  if v_statut = 'traite' then return 'traite'; end if;
  return 'occupe';
end;
$$;

-- Écriture réservée au rôle serveur : le webhook s'exécute en service_role.
revoke execute on function public.claim_stripe_event(text, text, int) from anon, authenticated, public;
