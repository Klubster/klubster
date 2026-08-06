# Certification finale — Klubster prêt pour des clubs pilotes

7 août 2026 · branche `feat/finalisation-commerciale-klubster` · base `5ae1af3`
Toutes les preuves : klubster-dev + cluster Postgres jetable + build de production locale.
Aucune donnée réelle, aucun paiement réel, aucun email réel, aucune écriture en production.

## Verdict

**PRÊT POUR DES CLUBS PILOTES** — sous les limites du document `limites-pilote.md`.

## Reconstruction de la base (répétition générale)

- `scripts/db/harnais.sh test` : cluster `initdb` neuf, cales, bootstrap (6 garde-fous),
  **39 migrations dans l'ordre canonique**, 3 assertions structurelles, fixtures
  Club A / Club B, tests SQL (cloisonnement + rôles) — **TOUS VERTS**.
- `double-reconstruction.sh` : deux reconstructions indépendantes comparées —
  **IDENTIQUES, 4 496 lignes de schéma**. Les migrations sont rejouables, sans collision.
- Deux mises à jour de la vérité du harnais pendant la passe (aucun changement de schéma) :
  l'assertion 01 apprend les contraintes remplacées par `20260803180000` (présences par
  cours) et `20260803230000` (remboursements) **et vérifie leurs remplaçantes** ;
  le test rôles apprend le contrat `deja_membre` de `20260802200000` et prouve le chemin
  `ok` sur un compte réellement libre.

## Parcours certifiés en navigateur (build de production, klubster-dev)

| Rôle | Vérifié | Résultat |
| --- | --- | --- |
| Trésorier | trésorerie + paiements visibles ; questionnaire de santé et consultation de pièces INVISIBLES | 4/4 ✓ |
| Secrétaire | adhérents gérables ; montants encaissés, virements et remises INVISIBLES ; refoulée de /paiements par la garde serveur | 3/3 ✓ |
| Encadrant | contrôle terrain sur mobile ; ni trésorerie ni relances | 2/2 ✓ |
| Lecture seule | aucune action d'écriture proposée | 1/1 ✓ |
| Président B (cross-tenant) | refoulé du cockpit A, zéro donnée du club A, son cockpit intact | 4/4 ✓ |
| Président A | export CSV 200 · **21 colonnes** · zéro donnée de santé · injection de formule neutralisée ligne par ligne ; messages ; relances | 4/4 ✓ |
| Adhérent | espace multi-adhésions, carte + QR, reçu, uploads nommés (S7/S13) | ✓ (sessions précédentes de la pile, inchangé) |

Démonstration : 18/18 routes exercées, geste complet SPA (34→35), état perdu au
rechargement, zéro hôte externe, zéro erreur console — certifiée aux lots S8/S9.

## Accessibilité (S13, dans la pile)

Clavier mesuré touche par touche sur 7 écrans : 0 focus invisible/149 arrêts, 0 piège,
0 contrôle sans nom, 0 image sans alt. Erreurs annoncées (`role=alert`), dialogues
conformes, signature du questionnaire **accessible au clavier** (même canvas, même PNG),
uploads nommés. VoiceOver : non vérifié (voir limites).

## Responsive

9 largeurs (320→1920) × 15 routes : **tout vert** après deux corrections trouvées par la
mesure — fiche adhérent (sélecteur d'adhésion, +54 px à 320) et `/fonctionnalites`
(hero 2 colonnes dès `md`, +116 px à 768 → 2 colonnes à partir de `lg`).

## PWA

Manifest par club complet (standalone, scope, start_url espace, icônes dynamiques,
thème club), SW versionné, mise à jour silencieuse. Aucune promesse hors-ligne dans
l'interface. Installation physique : non testée (limites).

## Vérité commerciale

12 mensualités ✓ (plafond réel 2→12, choix adhérent) · 3 mois fondateurs ✓
(`joursEssai(rang)`, source unique) · 0 % commission ✓ (Connect charges directes) ·
import tableur ✓ (mêmes règles que l'inscription) · export complet ✓ (21 colonnes
mesurées, sans santé) · incidents signalés ✓ (litiges au cockpit + emails produit) ·
domaine personnalisé ✓ (proxy) · site modifiable ✓ · hébergement nuancé ✓ (lot vérité) ·
résiliation ✓ (portail Stripe) + récupération ✓ (export). « Prêt en moins de
30 minutes » : plausible (wizard court), non re-chronométré — à chronométrer au premier
pilote réel (limites).

## Chaîne finale

Voir le rapport de session : tests Vitest complets, build, typecheck, lint, harnais SQL,
0 `.only`/`.skip`/TODO, 12 warnings eslint préexistants inventoriés (react-hooks,
antérieurs à la pile, sans rapport avec elle).
