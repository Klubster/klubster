Lot **onboarding**, ouvert depuis `main` (indépendant de la PR #13). Trois frictions constatées en exerçant réellement le parcours d'un président, puis le parcours d'un adhérent, sur le projet Supabase de développement.

## Ce que ça change

**1. Les erreurs d'authentification parlent français.** GoTrue répondait en anglais technique — « Email address "…" is invalid » affiché tel quel, illisible pour un bénévole et impossible à distinguer d'une panne. Sont traduits : email invalide, compte déjà existant, mot de passe trop court, email non confirmé, trop de tentatives, réseau. **Tout message inconnu tombe sur un repli générique** ; le détail part dans les journaux serveur, jamais à l'écran.

**2. Un compte connecté sans club n'est plus dans une impasse.** Il tombait sur une 404 sèche en ouvrant une URL de cockpit. Il arrive maintenant sur `/sans-club` : ce qui se passe, puis **CRÉER MON CLUB**, **REVENIR À L'ACCUEIL**, « Se déconnecter ». La page **ne révèle rien du club demandé dans l'URL** — ni son existence, ni son nom.

**3. La preuve avant le discours.** Sur la page du premier club, un encart placé juste après le récit de la naissance de Klubster mène à la **véritable vitrine publique** `/usmboxe` — jamais `/demo`. CTA secondaire, pleine largeur sur mobile ; l'action commerciale principale reste « DEVENIR CLUB FONDATEUR ».

## Parcours exercés de bout en bout

**Côté président** — création de compte, connexion, `/creer` (identité, modèle, couleur, informations, cours + créneau + tarif), publication, vitrine en ligne, cockpit « Le club est prêt ». Un club de test créé en moins de trois minutes.

**Côté adhérent** — vitrine publique → formulaire d'inscription complet : identité, cours, champs personnalisés du club, **questionnaire de santé** (toutes les questions répondues, attestation cochée, signature tracée au pointeur), pièces annoncées, mot de passe, **paiement « au club » (espèces)** → validation → écran de confirmation « Bienvenue, Sarah » avec les étapes suivantes.

**Retour côté président** — le dossier apparaît dans le cockpit et sur la fiche adhérent avec le bon cours (Escrime ados), le bon montant (180 €), le bon statut (EN ATTENTE), le bon mode (Espèces), les deux pièces attendues et l'attestation de santé. **Deux rechargements** : tout persiste.

**Garantie RGPD vérifiée en base** : le questionnaire enregistre `reponses = {}`, `resultat = atteste_negatif`, signature et date. Le détail des réponses n'est jamais conservé, conformément à ce qu'annonce l'interface.

## Défaut découvert pendant le parcours

Le bouton « ○ Manquante / ✓ Reçue » de la fiche adhérent **ne fait rien** : il écrit un statut `recue` que la contrainte de la table n'accepte pas (`manquante` | `fournie` | `par_email`), l'erreur est journalisée puis avalée, et la page se recharge à l'identique. Reproduit dans le navigateur, puis vérifié en base : aucune écriture. Deux autres écrans utilisent le même vocabulaire fantôme (compteur du cockpit sur `attendue`, filtre de relance sur `≠ recue`).

**Corrigé dans le lot Cockpit, pas ici** — c'est un défaut du cockpit et des relances, pas de l'onboarding, et le mélanger à cette PR l'aurait rendue illisible.

## Environnement

Application locale, projet Supabase **klubster-dev**, clés Stripe et Resend factices, comptes et domaines fictifs (`@dev.example.org`, `@example.com`). Aucune écriture en production, aucun paiement réel, aucun email réel.

La confirmation d'email est **désactivée sur le projet de développement uniquement** (`mailer_autoconfirm = true`, vérifié via `/auth/v1/settings` avant de rejouer le parcours). En production, le réglage reste actif et le SMTP est dédié.

## Tests

249 vitest ✓ · build ✓ · typecheck ✓ · lint ✓ (0 erreur).

## Captures

Dans [docs/onboarding-captures/](https://github.com/Klubster/klubster/tree/feat/onboarding-frictions/docs/onboarding-captures) :

- 01 : l'erreur d'inscription, en français, à la place du message GoTrue
- 02 : l'écran « sans club » au lieu de la 404
- 03 : le cockpit juste après publication
- 04 : la vitrine publique du club de test, en ligne
- 05 : le CTA « VOIR LE CLUB USM BOXE » sur la page du premier club
- 06 : le même CTA à 390 px, pleine largeur
- 07 : l'écran « sans club » à 390 px
- 08 : le formulaire d'inscription rempli et signé, prêt à valider
- 09 : la confirmation reçue par l'adhérent
- 10 : le dossier arrivé dans le cockpit du président
- 11 : le formulaire d'inscription à 390 px

## Limite restante

**La preview de cette branche pointe sur la base de production**, comme toutes les autres : la brancher sur `klubster-dev` demande de poser les variables d'environnement de preview côté Vercel. Aucune donnée n'a été créée depuis la preview — tout le parcours a été exercé en local contre la base de développement.
