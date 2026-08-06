# Plan de fusion et de déploiement pilote

La pile complète, du bas vers le haut. **Rien ne se fusionne ni ne se déploie sans
l'autorisation explicite de Mathieu.** Ordre strict — chaque étage suppose le précédent.

## 0. Préalables (une fois)

1. Sauvegarde de la base de production (dashboard Supabase → backup manuel).
2. `git fetch origin --prune` ; vérifier les SHA ci-dessous à l'octet.

## 1. La release commerciale (déjà certifiée, hors Lot S)

| Étape | Branche / PR | SHA | Migrations | Actions |
| --- | --- | --- | --- | --- |
| 1.1 | `release/klubster-commercial-v1-demo` → `main` (PR existantes #9-#28, fusion via la branche de release) | `5cf82de` | `0028` puis les 11 horodatées `202608*` (ordre alphabétique) | ⚠ `20260804100000` touche `storage.objects` : à appliquer via le MCP/SQL editor Supabase avec droits propriétaire. Vercel déploie au push sur `main`. |

Vérification 1.1 : CI verte sur `main` · smoke-test (doc dédié) · relances usmboxe
toujours désactivées (réglage en base `emails_config`, à contrôler APRÈS migration).
Rollback 1.1 : revert de la fusion sur `main` (les migrations sont additives ; la seule
destructive est la contrainte de mode de `reglements`, réversible par re-création).

## 2. La pile Lot S (4 PR empilées, à fusionner DANS L'ORDRE, après 1.1)

| Étape | PR (base ← head) | SHA tête | Migrations | Vérification | Rollback |
| --- | --- | --- | --- | --- | --- |
| 2.1 | `release/…-demo` ← `feat/lot-s-fondations-interface` | `ffdef01` | aucune | CI + captures `docs/lot-s-captures/` | revert (front pur) |
| 2.2 | (après 2.1, rebase base → `main`) ← `feat/lot-s-adoption-composants` | `7cdf83d` | aucune | CI + `docs/lot-s-captures/s6-s8/` | revert |
| 2.3 | ← `feat/lot-s-marketing-formulaires` | `dd07b34` | aucune | CI + `docs/lot-s-captures/s9-s11/` | revert |
| 2.4 | ← `feat/lot-s-accessibilite-profonde` | `5ae1af3` | aucune | CI + `docs/lot-s-accessibilite/` | revert |
| 2.5 | ← `feat/finalisation-commerciale-klubster` | (tête finale) | aucune | CI + harnais `scripts/db/harnais.sh test` en CI locale + `docs/certification-finale-klubster.md` | revert |

Note GitHub : après chaque fusion, la PR suivante se rebase automatiquement sur la
nouvelle base (branches empilées). Aucune PR du Lot S ne porte de migration SQL —
la 2.5 ne modifie que le harnais de TEST (assertions/tests, pas le schéma).

## 3. Après déploiement

1. Dérouler `docs/smoke-test-post-deploiement.md` (10 min).
2. Chronométrer une création de club réelle (« moins de 30 minutes » — à confirmer).
3. Passage VoiceOver (`docs/lot-s-accessibilite/voiceover.md`, 10 min).
4. Installer la PWA sur un téléphone réel (checklist dans `limites-pilote.md`).
5. Choisir le club pilote (décision de Mathieu — condition du feu vert commercial).

## Interventions humaines nécessaires (aucune n'est du code)

- Ouvrir les 5 PR (corps prêts : `pr-1`…`pr-4` + PR finale) — connecteur GitHub.
- Autoriser fusions + appliquer la migration storage avec droits propriétaire.
- Sauvegarde préalable de la prod.
- VoiceOver (10 min) et PWA physique (10 min).
- Fournir `SUPABASE_SERVICE_ROLE_KEY` de klubster-dev si l'on veut rejouer le tunnel
  d'inscription E2E complet en local (l'action serveur la requiert ; la RPC est couverte
  par les tests et le harnais).
