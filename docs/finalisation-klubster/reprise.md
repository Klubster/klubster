# Reprise — restauration de l'historique des migrations (objectif B)

**Prochaine étape déjà déterminée : extraire les 40 migrations restantes, par lots de 5 à 8.**

## Commande de reprise

```bash
cd /tmp/klb-restauration          # ou : git worktree add <chemin> restaure/historique-migrations
node scripts/db/verifier-restauration.mjs
```

Elle affiche l'avancement et **la liste des versions restant à extraire**. C'est le point
de départ de chaque lot : aucune liste à tenir à jour à la main.

## La boucle, exactement

Pour chaque lot de 5 à 8 versions données par le vérificateur :

1. Lire le SQL depuis l'historique distant, via le connecteur Supabase déjà autorisé :

   ```sql
   select version, name, statements[1] as sql
     from supabase_migrations.schema_migrations
    where version in ('…','…')
    order by version;
   ```

2. Écrire chaque fichier sous `supabase/migrations/<version>_<name>.sql`, **contenu exact**.
   Pas de retour à la ligne final ajouté, pas de reformatage, pas de correction — même
   d'une évidence, même d'une faute de frappe dans un commentaire. C'est l'historique réel.

3. `node scripts/db/verifier-restauration.mjs` — il recalcule le MD5 de chaque fichier et
   le compare à celui relevé **sur la base avant toute écriture**
   (`docs/finalisation-klubster/manifeste-migrations.tsv`). Un octet d'écart échoue.

4. Commit du lot. Passer au suivant.

## État

**14 des 47 restituées, 0 divergente.** Le rond-trip est prouvé : `write_file` conserve les
octets, y compris l'absence de retour à la ligne final, et les accents.

Restent 33. Aucune n'a présenté de difficulté particulière jusqu'ici.

## Ce qui vient après la 47ᵉ

1. **Retirer le bootstrap.** Copier `scripts/db/` depuis la branche `test/postgres-supabase-harness`
   (PR #11), puis vider `scripts/db/bootstrap/` et relancer :

   ```bash
   bash scripts/db/harnais.sh migrations
   ```

   Tant qu'une erreur subsiste, elle désigne une migration encore manquante ou un objet
   créé hors migration : la traiter, ne pas la contourner par un prérequis.
   **Critère de réussite de l'objectif B : le dossier `bootstrap/` est vide et la chaîne passe.**

2. **Ordre d'application.** Les fichiers restitués sont horodatés (`AAAAMMJJhhmmss`), ceux
   du dépôt numérotés (`NNNN_`). L'ordre alphabétique place `0001_…` AVANT `2026…`, ce qui
   est faux : `0001_init_multitenant` correspond à `20260629100250`, et les 47 restitués
   viennent après lui mais avant `0002`. **À traiter avant de lancer la chaîne** — c'est le
   premier écueil du prochain lot, et il ne se voit pas tout de suite : la chaîne
   échouera plus loin, sur un objet qui semblera manquant sans l'être.
   Deux voies, à trancher sur mesure : renommer les 27 fichiers du dépôt avec leur version
   distante réelle (cohérent avec `schema_migrations`, mais réécrit des noms existants), ou
   apprendre au lanceur l'ordre réel depuis le manifeste. La seconde ne touche à aucun
   fichier et se teste seule : la préférer d'abord.

3. **`0011_reference_fonctions_auth.sql`** — protocole dans `restauration-historique.md`.
   Reconstruire sans, capturer le schéma, reconstruire avec, comparer. Ne jamais la marquer
   appliquée à distance.

4. **Validation complète** : deux reconstructions identiques, comparaison au schéma de
   référence (tables, colonnes, contraintes, index, fonctions, triggers, politiques,
   grants), buckets, tâches cron, **opérations de données** contenues dans les migrations,
   puis les tests RLS/RPC de la PR #11 et la migration `0028` de la PR #10.

## Risques connus

- **Les migrations restituées peuvent contenir des opérations de données**, pas seulement
  du DDL. Une reconstruction qui les ignore produit une base vide là où la vraie ne l'est
  pas. À relever pendant l'extraction, pas après.
- `roles_benevoles_rbac` (20260711071424) est dans le lot restant. C'est elle qui devrait
  élargir `profiles_role_check` — or la contrainte de production n'autorise toujours que
  quatre rôles. Son contenu tranchera le défaut « trésorier inattribuable » prouvé dans la
  PR #11 (`tests/db/20-roles.sql`). **À lire attentivement quand elle sera extraite.**
- La PR de cette branche n'est pas encore ouverte (`gh` absent) : elle se fera par le
  navigateur. Cela ne bloque rien, la branche est poussée.

## Interdits, rappelés

Pas de `migration repair`, pas de `db push`, pas de modification de l'historique distant,
pas de squash, pas de baseline, aucune fusion. **Aucune donnée métier lue ou exportée** —
métadonnées de schéma et d'historique uniquement.
