# Reprise — finalisation Klubster

Dernière session : 02/08/2026 au soir. Un seul document d'état ; le détail des preuves
est dans la PR #13 et `docs/pr13-captures/`.

## Où on en est

- **Branche** : `fix/roles-attribuables` — **worktree** : `/tmp/klb-roles` — commit de
  référence : `44c9c70` (+ ce document).
- **PR #13** : brouillon, corps à jour (section « Parcours navigateur exercés »),
  CI verte, preview Vercel construite (SSO équipe — Mathieu seul peut l'ouvrir).
- **Fait et prouvé dans le navigateur** : parcours président complet sur l'écran Équipe
  (ajout, rôles, persistance, erreurs), les cinq rôles connectés un par un, isolation
  Club A/B, mobile 390/768/1280, quatre défauts UX corrigés (voir corps de PR).
- **Tests** : 249 vitest ok, build ok, typecheck ok, lint ok.
- **Onboarding (lot suivant, entamé)** : parcours compte → /creer (6 étapes) → club créé
  → vitrine publiée exercé de bout en bout sur l'environnement de dev. Il reste :
  première inscription fictive côté public, corrections des frictions, PR dédiée depuis
  `main`.

## Environnement de test (aucune donnée réelle)

- **Projet Supabase de dev** : `klubster-dev` (`xumkklyinikmvfafyjxd`, eu-west-3, plan
  gratuit, org Klubster). Reconstruit depuis les migrations du dépôt + bootstrap du
  harnais, puis **aligné à la main sur la prod** (suppression de 8 politiques
  `*_same_org`/`*_public_read` héritées, grants « par défaut Supabase » rejoués puis
  revokes des migrations réappliqués). Les migrations seules ne suffisent pas — c'est le
  chantier PR #12.
- **Identifiants de test** : conservés dans **`.env.test.local`** à la racine du
  worktree, **non versionné** (couvert par `.env*.local` du `.gitignore`). Aucune valeur
  secrète ne doit figurer dans le dépôt, les commits, la PR, les captures ou la mémoire.
  Rotation : générer de nouvelles valeurs aléatoires (`openssl rand`), mettre à jour
  `auth.users` (via le MCP Supabase en `postgres`, ou une fonction temporaire dédiée,
  supprimée ensuite) et le rôle SQL `dev_ops` (`alter role dev_ops with password …` —
  un rôle peut changer son propre mot de passe). À faire avant toute nouvelle session
  si le fichier local a disparu.
- **Comptes fictifs** (emails uniquement) : president.a / tresorier.a / secretaire.a /
  encadrant.a / lecture.a / adherent.a @example.com (Club A, slug `club-a`),
  president.b@example.com (Club B), benevole.nouveau@example.com,
  fondatrice.test@example.org (club `clubtestonboarding`), super.admin@example.com.
- **.env.local du worktree** : pointe vers klubster-dev, clés Stripe/Resend factices
  (aucun email ne peut partir, aucun paiement). Ne jamais y mettre les clés de prod.
- **Serveur local** : `cd /tmp/klb-roles && NODE_ENV= npx next dev -p 3210`
  (si 404 partout : `rm -rf .next` d'abord — un `next build` a pu laisser des artefacts).
- **Piège connexion via Chrome MCP** : remplir les champs puis
  `form.requestSubmit()` en JS (le clic simple sur SE CONNECTER se perd pendant
  l'hydratation React).

## Prochaine interaction navigateur

1. `http://localhost:3210/connexion` — fondatrice.test@example.org, mot de passe dans
   `.env.test.local`.
2. Ouvrir `http://localhost:3210/clubtestonboarding/inscription` et dérouler une
   inscription fictive (adhérent adulte, pièces, questionnaire santé, paiement « au
   club ») ; résultat attendu : dossier visible dans le cockpit, statut en attente.
3. Noter chaque friction ; corriger dans un lot **créé depuis `main`**
   (`git worktree add /tmp/klb-onboarding origin/main -b feat/onboarding-frictions`).

## Frictions onboarding déjà relevées (à corriger dans le lot dédié)

- Erreur d'inscription GoTrue affichée **en anglais brut** (« Email address … is
  invalid ») sur /connexion, onglet Créer un compte. Traduire/adoucir côté action.
- Le GoTrue du projet dev refuse les domaines réservés (example.org) à l'inscription :
  contourner en créant le compte en SQL — en prod, vrais emails, non bloquant.
- Un utilisateur connecté **sans club** qui ouvre une URL de cockpit d'un club existant
  obtient un 404 sec (pas de lien « retour à la création ») — à adoucir.

## Problème restant (PR #13)

Rien de bloquant côté produit. À la fusion : appliquer `20260802120000` puis
`20260802200000` en prod (non destructives, rejouables), et vérifier l'écran Équipe
d'USM Boxe en conditions réelles.
