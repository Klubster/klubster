-- Le webhook posait le verrou d'idempotence AVANT de traiter, puis avalait les erreurs
-- et répondait 200 : un événement échoué n'était jamais rejoué par Stripe → perte
-- définitive de règlement. On ajoute un statut pour distinguer « en cours », « traité »
-- (à acquitter sans rejouer) et « échoué » (à rejouer).
alter table public.stripe_events
  add column if not exists statut text not null default 'traite',
  add column if not exists tentatives integer not null default 1,
  add column if not exists derniere_erreur text,
  add column if not exists traite_le timestamptz;

-- Les lignes existantes ont été traitées avec succès sous l'ancien modèle.
update public.stripe_events set statut = 'traite', traite_le = coalesce(traite_le, recu_le) where traite_le is null;