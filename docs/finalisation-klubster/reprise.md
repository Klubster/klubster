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

<!-- ETAT-RESTAURATION -->
**Restitution terminée : 47/47.** 46 byte-exactes, 1 dérogation de confidentialité contrôlée, 0 divergence non expliquée, 0 manquante.
<!-- /ETAT-RESTAURATION -->

Ce bloc est **réécrit par le vérificateur** (`--maj-docs`) et **contrôlé** à chaque
exécution. Il ne se recopie pas à la main : c'est précisément en le recopiant que ce
document a annoncé « 45 des 47 » alors que les 47 fichiers étaient déjà poussés.

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


## Acquis depuis, à ne pas refaire

- **Dérogation de confidentialité** sur `20260709083407` : décidée le 02/08, appliquée,
  déclarée au manifeste (deux empreintes, deux tailles, date, raison), vérifiée par
  mutation. Voir `restauration-historique.md` et `super-admin.md`.
- **`tests/donnees-personnelles.test.ts`** : liste blanche d'adresses, sur
  `supabase/migrations/`, `docs/`, `scripts/`, `tests/`. Il ne contient pas l'adresse qu'il
  protège. Il a trouvé au passage une adresse en `club.fr` dans `tests/campagnes.test.ts` (domaine
  qui peut exister et recevoir) — corrigé en `@example.com`.
- **`pg_cron` est nécessaire** : `purge_questionnaires_sante_cron` fait
  `create extension if not exists pg_cron` puis `cron.schedule`. Mon relevé initial
  « zéro create extension » ne valait que pour les 27 fichiers du dépôt. Le harnais devra
  fournir l'extension ou une cale du schéma `cron`, et la tâche de purge RGPD (03:00 UTC)
  doit être vérifiée après reconstruction.
- **Opérations de données relevées** : `update` sur `usmboxe` (echeances_max = 3), quatre
  `insert into storage.buckets` (pieces, logos, sections, actualites), `update` de
  rattrapage sur `stripe_events`, `cron.schedule`. Une reconstruction qui les ignorerait
  donnerait une base sans stockage et sans purge.

## Ordre d'application — le prochain écueil

Les fichiers restitués sont horodatés (`AAAAMMJJhhmmss`), ceux du dépôt numérotés
(`NNNN_`). L'ordre alphabétique place `0001_` avant `2026…`, ce qui est faux :
`0001_init_multitenant` **est** `20260629100250`, et les 47 restitués s'intercalent entre
lui et `0002` (= `20260721155636`). À traiter **avant** de lancer la chaîne : sinon elle
échouera plus loin, sur un objet qui semblera manquant sans l'être.

Voie préférée : apprendre l'ordre réel au lanceur depuis le manifeste, sans renommer aucun
fichier existant. Elle ne touche à rien et se teste seule.
