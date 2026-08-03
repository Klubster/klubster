# Lot onboarding (PR #14) — état

Branche : `feat/onboarding-frictions`, ouverte depuis `main`.

## Livré et prouvé

Traduction des erreurs d'authentification, écran `/sans-club` à la place de la 404,
CTA « VOIR LE CLUB USM BOXE » vers la vraie vitrine, et **parcours d'inscription publique
complet exercé de bout en bout** sur le projet Supabase de développement : compte adhérent
créé, questionnaire de santé rempli et signé, pièces annoncées, paiement « au club »
(espèces), confirmation côté adhérent, dossier reçu dans le cockpit avec cours, montant,
statut et mode de paiement cohérents, persistance vérifiée à deux rechargements.

Captures dans `docs/onboarding-captures/`.

## Environnement

Application locale, projet Supabase `klubster-dev`, clés Stripe et Resend factices,
comptes et domaines fictifs (`@dev.example.org`). Aucune écriture en production.

La confirmation d'email est **désactivée sur le projet de dev uniquement** (réglage de
Mathieu, 03/08/2026) : `mailer_autoconfirm = true` vérifié via `/auth/v1/settings`. En
production le réglage reste actif et le SMTP est dédié.
