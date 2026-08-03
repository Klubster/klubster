# Où en est chaque lot

Mis à jour le 03/08/2026. Aucun secret ici.

| PR | Branche | Worktree | État |
| --- | --- | --- | --- |
| #13 | `fix/roles-attribuables` | `/tmp/klb-roles` | livrée, brouillon |
| #14 | `feat/onboarding-frictions` | `/tmp/klb-onboarding` | livrée, brouillon, parcours complet prouvé |
| #15 | `feat/cockpit-priorites` | `/tmp/klb-cockpit` | livrée, brouillon |
| #16 | `feat/liste-attente` | `/tmp/klb-attente` | livrée, brouillon, migration 0028 |

Aucune n'est fusionnée. Chacune part de `origin/main` et n'a pas de dépendance avec les
autres, sauf la numérotation de migration : `0028` est pris par la PR #16.

## Environnement de développement

Projet Supabase `klubster-dev`. Les identifiants vivent dans `.env.local` et
`.env.test.local`, non versionnés, dans chaque worktree. La confirmation d'email y est
désactivée (réglage du 03/08/2026) — en production elle reste active.

Comptes fictifs sur le Club A : président, trésorier, secrétaire, encadrant, lecture seule.
Club de test `cercleescrimetest` avec un président fondateur. Emails en `@example.com` et
`@dev.example.org`.

## Lancer un worktree

```bash
cd /tmp/klb-<lot>
NODE_ENV= npx next dev -p <port>     # 3211 onboarding, 3212 cockpit
NODE_ENV=test npm test               # NODE_ENV=production traîne dans le terminal
```

## Ce qui reste

- Lot C — contraste des couleurs de club (pas commencé)
- Lot D — contrôle terrain mobile (pas commencé)
- Lot E — cohérence des paiements et des statuts (pas commencé)
- Preview branchée sur `klubster-dev` : demande des variables d'environnement Vercel
- Liste d'attente : prévenir le club qu'une place s'est libérée, délai de réponse après
  promotion — arbitrages produit, documentés dans `docs/regle-liste-attente.md`
