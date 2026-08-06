# Smoke-test post-déploiement (~10 minutes, comptes de test uniquement)

À dérouler sur klubster.fr après CHAQUE fusion déployée. Comptes `+audit` dédiés,
supprimés ensuite — jamais les données d'une association réelle.

## 1. Public (2 min)
- [ ] `/` s'affiche, CTA « CRÉER MON CLUB » cliquable, aucun texte manquant
- [ ] `/tarifs`, `/fonctionnalites` : rendu propre à 390 px (DevTools)
- [ ] `/demo` : bandeau DÉMONSTRATION, ajouter un adhérent → effectif bouge,
      RÉINITIALISER remet tout, rechargement dur = état initial
- [ ] `/usmboxe` : vitrine du club réel intacte (couleur du club, chapitres)

## 2. Connexion et cockpit (3 min, compte président de test)
- [ ] Connexion → cockpit ; « À TRAITER MAINTENANT / À SURVEILLER » présents
- [ ] Navigation Adhérents → une fiche → retour : squelettes de chargement visibles,
      aucune page blanche
- [ ] Mauvais mot de passe : l'erreur s'affiche (et s'annonce au lecteur d'écran)
- [ ] Export CSV : télécharge, s'ouvre, aucune colonne de santé

## 3. Espace adhérent (2 min, compte adhérent de test)
- [ ] Carte + QR affichés ; adhésions de la saison listées
- [ ] Dépôt d'une pièce de test (PDF) → statut passe à Fournie → REMPLACER visible

## 4. Écritures critiques (2 min)
- [ ] Enregistrer un règlement espèces de test sur l'adhérent de test → le solde suit
- [ ] Envoyer un message de test À SOI-MÊME uniquement → reçu
- [ ] Vérifier `emails_config` usmboxe : relances toujours désactivées

## 5. Technique (1 min)
- [ ] `/api/cron/relances` NON appelé à la main (le cron Vercel s'en charge)
- [ ] Logs Vercel : aucun 500 dans les 10 dernières minutes
- [ ] `sw.js` répond ; une PWA installée se met à jour silencieusement (icône du club)

En cas d'échec d'un point : ne pas enchaîner la fusion suivante — diagnostiquer,
corriger ou revert, rejouer le smoke-test.
