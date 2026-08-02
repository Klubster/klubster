-- Les identifiants Stripe du mode test (acct_, cus_, sub_) n'existent pas en production
-- et inversement. Les melanger casserait le jour de la bascule : on les isole.
alter table public.organisations
  add column if not exists stripe_test jsonb not null default '{}'::jsonb;

comment on column public.organisations.stripe_test is
  'Identifiants Stripe du mode test : {account_id, customer_id, subscription_id, statut}. La production reste dans les colonnes historiques.';