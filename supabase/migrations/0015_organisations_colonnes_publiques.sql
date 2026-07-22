-- 0015 — Restreindre les colonnes d'`organisations` lisibles par `anon` (P1 du 4e audit).
--
-- La policy `org_read_public` ouvre la lecture dès `publie = true`, mais une policy RLS
-- s'applique à TOUTES les colonnes : un visiteur anonyme pouvait donc lire, via l'API
-- PostgREST directe, des identifiants internes d'abonnement et les préférences d'emails
-- du club. On passe `anon` en privilèges PAR COLONNE : il ne lit plus que les colonnes de
-- vitrine. `authenticated` conserve l'accès complet (le cockpit en a besoin).
--
-- Colonnes retirées à `anon` : abonnement_customer_id, abonnement_subscription_id,
-- emails_config. `stripe_account_id` et `stripe_test` restent lisibles : le formulaire
-- public en dépend (choix du mode de paiement, checkout sur le compte connecté du club).
-- Les lectures publiques passent désormais par `getOrganisationPubliqueBySlug`, qui
-- sélectionne exactement cette liste — un `select("*")` anonyme échouerait sinon.

revoke select on public.organisations from anon;
grant select (
  id, slug, nom, sport, logo_url, couleur_primaire, adresse, email_contact, telephone,
  stripe_account_id, abonnement_plan, publie, created_at, accroche, presentation, infos_pratiques,
  form_config, actualite, theme_template, theme_mode, page_config, domaine_custom, echeances_max,
  abonnement_statut, abonnement_essai_fin, abonnement_periode_fin, stripe_test, saison_debut, saison_fin
) on public.organisations to anon;
