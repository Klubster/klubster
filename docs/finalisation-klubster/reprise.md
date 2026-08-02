# Reprise — harnais Postgres (PR #11)

Pas de SHA figé ni de compteur recopié : GitHub compte mieux que moi, et un nombre écrit
ici est faux au commit suivant.

## Commandes

```bash
npm run test:db                  # migrations + assertions + tests de session
npm run test:db:reconstruction   # deux reconstructions + comparaison des schémas
bash scripts/db/harnais.sh matrice > docs/finalisation-klubster/matrice-rls.md
npm test -- tests/migrations-deployables.test.ts
```

## Prouvé, et par quoi

| Affirmation | Preuve |
| --- | --- |
| Les migrations du dépôt s'appliquent sur une base vide | `test:db:migrations` |
| Aucun corps minimal ne survit | assertion `00` + mutation |
| Le bootstrap ne masque aucune définition de `0017` | assertion `01` + mutation |
| Les tables de la production sont toutes reconstruites | assertion `02` |
| Deux reconstructions donnent le même schéma | `test:db:reconstruction` |
| Les prérequis ne peuvent pas revenir au déploiement | `tests/migrations-deployables.test.ts` + mutation |
| Un club ne voit rien d'un autre | `tests/db/10-cloisonnement.sql` + mutation |
| Les rôles ont bien les droits annoncés | `tests/db/20-roles.sql` |

### Mutations vérifiées

1. `0011` ne remplace plus `current_org_id` → assertion 00 échoue, alors que la chaîne
   reste verte. Sans elle, une base aveugle passerait pour saine.
2. `reglements.montant_centimes` en `bigint` dans le bootstrap → assertion 01 échoue.
3. Les deux fichiers de bootstrap recopiés dans `supabase/migrations/` → 5 contrôles.
4. `adherents_read_org` passée à `using (true)` → le test de cloisonnement échoue
   (« president.a voit 3 adherents, attendu 2 »).

## Deux erreurs de méthode corrigées, à ne pas refaire

1. **Le bootstrap ajoutait un `revoke` « par précaution ».** `0011` ne rend jamais ce
   droit : le harnais testait une base plus fermée que la production, et un président
   authentifié y échouait. Règle posée : **un prérequis déclare, il ne décide pas.**
2. **Les cales oubliaient les privilèges par défaut de Supabase.** Sans eux, `authenticated`
   n'a aucun droit de table et tout test d'autorisation échoue — ou pire, réussit pour la
   mauvaise raison. `alter default privileges … grant all to anon, authenticated,
   service_role` est désormais dans `00-cales-supabase.sql`.

## Reste à faire sur la PR #11

- **Tests RPC** : `register_adherent_full`, `enregistrer_reglement`, `marquer_present`,
  `promouvoir_liste_attente`, `anonymiser_adherent`, et les deux RPC de webhook (qui
  doivent être refusées à `authenticated`).
- **Validation en base de la PR #10.** La migration `0028` vit sur
  `fix/rpc-adhesion-deterministe` et n'est pas dans ce worktree. Méthode prévue : une
  branche locale **non poussée** `essai/harnais-plus-0028` = cette branche + le seul
  fichier `0028`, y jouer les dix scénarios, puis déposer le résultat **en commentaire**
  sur la PR #10 — sans toucher à son contenu.
  Les dix : égalités le même jour ×100, priorité de saison, active vs annulée, liste
  d'attente, remboursée, sans adhésion, refus inter-club, refus `anon`, super-admin,
  intégrité pièces/présences.
- **Rejeu sur une base déjà migrée** (idempotence).
- `docs/finalisation-klubster/harnais-postgres.md`.

## Objectif B — décidé, pas commencé

Décision de Mathieu (02/08/2026) : **restituer les 47 migrations exactes** depuis
`supabase_migrations.schema_migrations`. Ni baseline, ni squash pour l'instant. Un squash
éventuel sera évalué plus tard, dans une PR distincte, et ne devra jamais remplacer
l'archive des migrations originales.

Marche à suivre : worktree séparé ; essayer d'abord `supabase migration fetch` en lecture
seule ; à défaut, extraire `version`, `name` et `statements` **sans réécriture, sans
reformatage, sans renommage**. Interdits : `migration repair`, `db push`, toute
modification de l'historique distant, toute lecture de donnée métier.

Cas particulier `0011_reference_fonctions_auth.sql` : présente au dépôt, **absente** de
l'historique distant. Ne pas la déployer ni la marquer appliquée. Après restitution :
reconstruire sans elle, comparer les fonctions (signature, corps, droits, `search_path`),
reconstruire avec, comparer les schémas. Si elle est intégralement redondante, la sortir
du chemin déployable en documentant pourquoi ; s'il manque quelque chose, n'extraire que
le besoin réel dans une migration normale postérieure.

Critère de réussite de l'objectif B : **le bootstrap n'est plus nécessaire.**

## Défauts produits trouvés en chemin

- **Trésorier, secrétaire et lecture seule sont inattribuables.** `profiles_role_check`
  n'autorise que `super_admin`, `admin_asso`, `encadrant`, `adherent` — contrainte
  identique en production [vérifié le 02/08/2026]. Le cockpit propose pourtant les cinq
  rôles et `equipe_definir_role` les accepte. Les branches `tresorier`/`secretaire` des
  politiques de `0008` sont donc du code mort. Prouvé par `tests/db/20-roles.sql`.
- Trois observations non tranchées dans `matrice-rls.md` : portée de lecture d'un compte
  adhérent, super-admin qui voit les pièces mais pas les questionnaires de santé,
  irrégularité des GRANT d'`anon`.

## Non déterminé

- **Pourquoi** les 47 migrations manquent au dépôt.
- Si `storage.foldername()` du harnais se comporte comme celle de Supabase. Tout le
  cloisonnement des pièces en dépend, et rien dans `tests/db/` ne le couvre encore.
