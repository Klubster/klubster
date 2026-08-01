# Reprise — harnais Postgres (PR #11)

Ce document dit où en est le lot, ce qui est prouvé, et par quelle commande reprendre.
Il n'y a **pas de SHA figé** : GitHub compte les commits mieux que moi, et un numéro
recopié ici serait faux dès le commit suivant.

## Où en est le lot

La chaîne complète tourne. Les 27 migrations du dépôt s'appliquent sur un cluster vide,
trois assertions passent, et deux reconstructions successives produisent le même schéma.

```bash
cd <worktree de test/postgres-supabase-harness>
npm run test:db:reconstruction     # deux reconstructions + comparaison des schémas
npm run test:db:migrations         # une seule, plus rapide
npm test -- tests/migrations-deployables.test.ts
```

## Ce qui est prouvé, et comment

| Affirmation | Preuve |
| --- | --- |
| Les 27 migrations s'appliquent sur une base vide | `npm run test:db:migrations` → « 27 migrations appliquées » |
| Aucun corps minimal ne survit à la chaîne | assertion `00`, et la mutation qui la fait échouer (voir plus bas) |
| Le bootstrap ne masque aucune définition de `0017` | assertion `01`, idem |
| La base reconstruite a les 22 tables de la production | assertion `02`, contre `scripts/db/reference/schema-20260802.txt` |
| Deux reconstructions donnent le même schéma | `npm run test:db:reconstruction` → « IDENTIQUES — 3629 lignes » |
| Les prérequis ne peuvent pas revenir dans le déploiement | `tests/migrations-deployables.test.ts`, 10 contrôles |

### Les mutations qui prouvent que les contrôles mordent

Un test qui ne peut pas échouer ne prouve rien. Chacun a été vérifié en réintroduisant
le défaut qu'il surveille, puis en restaurant.

1. **Assertion 00** — neutraliser le `create or replace` de `current_org_id` dans `0011`.
   La chaîne annonce toujours « 27 migrations appliquées », et l'assertion échoue :
   `CORPS MINIMAL SURVIVANT — current_org_id()`. C'est exactement l'intérêt du contrôle :
   sans lui, une base où `current_org_id()` rend `null` est déclarée verte.
2. **Assertion 01** — passer `reglements.montant_centimes` en `bigint` dans le bootstrap.
   Échec : `type integer attendu, bigint trouvé`.
3. **Test anti-déploiement** — recopier les deux fichiers de bootstrap dans
   `supabase/migrations/` sous leurs noms d'origine. **Cinq** contrôles indépendants
   échouent, dont la numérotation `0001a`.

## Ce qui n'est pas fait

- **Fixtures multi-tenant** (Club A / Club B, tous les rôles, `@example.com` uniquement).
- **Sessions par rôle** via `set local request.jwt.claims`. Rappel de la consigne :
  ne jamais prouver une autorisation avec `service_role` — il contourne les RLS.
  `service_role` sert aux fixtures, au nettoyage et à la lecture d'état interne.
- **Matrice RLS** générée dans `docs/finalisation-klubster/matrice-rls.md`.
- **Tests RPC**, et surtout **la validation en base de la PR #10** : les dix scénarios
  (égalités le même jour ×100, priorité de saison, active vs annulée, liste d'attente,
  remboursée, sans adhésion, refus inter-club, refus anon, super-admin, intégrité
  pièces/présences). Le harnais est prêt à les recevoir : `tests/db/*.sql`.
- **Rejeu sur une base déjà migrée** (idempotence).
- `docs/finalisation-klubster/harnais-postgres.md`.

## Le pas suivant, précisément

1. Écrire `tests/db/00-fixtures.sql` : deux organisations, un jeu de rôles par
   organisation, des adhérents en `@example.com`. Aucune donnée réelle.
2. Écrire l'assistant de session : `set local role authenticated` +
   `set local request.jwt.claims = '{"sub":"…"}'`, et vérifier d'abord que la bascule
   MORD — un test qui croit changer d'identité sans y parvenir valide le vide.
3. Puis les dix scénarios de la PR #10, et déposer le résultat en commentaire sur #10.

## Ce qui reste indéterminé

- **Pourquoi** les 47 migrations manquent au dépôt. Le fait est vérifié (voir
  `dependances-migrations-manquantes.md`) ; la cause ne l'est pas. L'historique Git ne
  dit pas ce qui a été exécuté dans l'éditeur SQL de Supabase.
- Si `storage.foldername()` du harnais se comporte exactement comme celle de Supabase.
  Tout le cloisonnement des pièces en dépend. À confronter avant de conclure quoi que ce
  soit sur le bucket `pieces`.
