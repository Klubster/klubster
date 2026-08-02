# Objectif B — restituer les 47 migrations manquantes

Décision de Mathieu, 02/08/2026 : **restituer les migrations exactes** depuis l'historique
Supabase. Ni baseline, ni squash. Un squash pourra être évalué plus tard, dans une PR
distincte, et **ne devra jamais remplacer l'archive des migrations originales**.

Branche : `restaure/historique-migrations`, worktree séparé, partie de `origin/main`.

## État : commencé, rien d'extrait encore

### Étape 2 — `supabase migration fetch` : essayée, inutilisable en l'état

La sous-commande existe bien (CLI 2.75.0) et fait exactement ce qu'il faut — *« Fetch
migration files from history table »*. Mais elle n'accepte pas `--project-ref` :

```
$ supabase migration fetch --project-ref basnfuvdjobanejahayt
unknown flag: --project-ref
```

Elle exige un projet **lié** (`supabase link`), donc un jeton d'accès personnel et le mot
de passe de la base, ou bien `--db-url` qui contient ce mot de passe en clair.

**Je ne manipule pas ces identifiants**, et ils n'ont rien à faire dans une ligne de
commande ni dans un dépôt. C'est à Mathieu de lancer `supabase link` s'il veut emprunter
cette voie — auquel cas `supabase migration fetch` écrirait les fichiers directement, ce
qui reste la solution la plus propre puisqu'elle vient de l'outil officiel.

### Étape 3 — extraction directe : voie retenue

Le connecteur Supabase déjà autorisé lit `supabase_migrations.schema_migrations` sans
identifiant supplémentaire, et le corps SQL y est intégralement conservé
(`statements`, un élément par migration, entre 169 et 7 866 caractères).

Règles d'extraction, sans exception :

- `version` exacte, telle quelle ;
- `name` exact lorsqu'il existe ;
- `statements` **octet pour octet** — aucune réécriture, aucun reformatage, aucun
  renommage, aucune correction, même d'une évidence ;
- nom de fichier `<version>_<name>.sql`, la convention de `supabase migration fetch`.

Ce qui est extrait n'est pas relu pour être amélioré. Une migration restituée qui
contiendrait une maladresse doit la garder : c'est l'historique réel, et le corriger
reviendrait à fabriquer un passé qui n'a jamais eu lieu.

## Le compte, à vérifier par version et non par nom

**[Vérifié le 02/08/2026]** 73 migrations appliquées en production, 27 fichiers au dépôt.
Le manifeste devra établir, **par identifiant de version** :

| Catégorie | Attendu | À confirmer |
| --- | ---: | --- |
| Communes dépôt ↔ production | 26 | par version |
| En production, absentes du dépôt | 47 | par version |
| Au dépôt, absentes de l'historique distant | 1 | `0011_reference_fonctions_auth.sql` |

Les noms ne suffisent pas : les fichiers du dépôt sont numérotés `NNNN_`, l'historique
distant est horodaté `AAAAMMJJhhmmss`. Le rapprochement se fait sur la version, et le
manifeste doit être **généré**, pas recopié.

## Le cas `0011_reference_fonctions_auth.sql`

Présente au dépôt, **absente** de l'historique appliqué. Ses fonctions existent pourtant
en production, créées par des migrations antérieures — dont plusieurs font partie des 47.

**Ne pas la déployer. Ne jamais la marquer comme appliquée à distance avant preuve.**

Protocole, dans cet ordre :

1. reconstruire **sans** `0011` ;
2. comparer chacune de ses fonctions à ce que la chaîne a produit : signature, corps,
   droits d'exécution, `search_path`, `SECURITY DEFINER` ;
3. reconstruire **avec** `0011` ;
4. comparer les deux schémas (`pg_dump --schema-only`) ;
5. conclure sur la différence mesurée, pas sur une impression de redondance ;
6. si elle ne change rien : la sortir du chemin déployable, en écrivant pourquoi ;
7. s'il manque quelque chose : n'extraire que **le besoin réel** dans une migration
   normale, postérieure à l'historique récupéré.

## Critère de réussite

**Le bootstrap de la PR #11 n'est plus nécessaire.** Tant qu'un fichier de
`scripts/db/bootstrap/` reste indispensable pour aller au bout de la chaîne, l'objectif B
n'est pas atteint. Il reste disponible pendant le chantier pour diagnostiquer les écarts,
mais il ne fait pas partie de la réponse.

Validation exigée, sur base vide et **sans aucun bootstrap** :

- application de l'historique récupéré dans l'ordre réel des versions ;
- deux reconstructions identiques ;
- comparaison au schéma de référence : tables, colonnes, contraintes, index, fonctions,
  triggers, politiques **et grants** ;
- vérification spécifique des buckets de stockage, des tâches cron et des **opérations de
  données** contenues dans les migrations — une migration qui écrit des lignes n'est pas
  du DDL, et une reconstruction qui l'oublie produit une base vide là où la vraie ne l'est
  pas ;
- exécution des tests RLS et RPC de la PR #11 ;
- validation de la migration `0028` de la PR #10 sur cet historique canonique.

## Interdits, rappelés

Pas de `migration repair`. Pas de modification de l'historique distant. Pas de `db push`.
Pas de squash, pas de baseline. Aucune fusion. **Aucune donnée métier lue ou exportée** —
métadonnées de schéma et d'historique uniquement.
