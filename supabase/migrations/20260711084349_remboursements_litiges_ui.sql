-- Pour cibler un remboursement Stripe depuis le cockpit : on garde le payment_intent
-- du paiement en ligne one-shot sur l'adhésion.
alter table adhesions add column if not exists stripe_payment_intent text;

-- Rendre un litige (chargeback) distinct d'un simple retard : un litige ouvert est
-- horodaté ici, effacé quand Stripe clôt le litige. Sans ça, la trésorière voit
-- « en retard » sans savoir qu'il s'agit d'une contestation bancaire.
alter table adhesions add column if not exists litige_le timestamptz;

create index if not exists adhesions_stripe_pi_idx
  on adhesions(stripe_payment_intent) where stripe_payment_intent is not null;