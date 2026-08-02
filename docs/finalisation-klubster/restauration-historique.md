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

---

## Constat sur `roles_benevoles_rbac` — le défaut des rôles est confirmé à sa source

**[Vérifié]** La migration `20260711071424_roles_benevoles_rbac.sql`, restituée, introduit
bien les cinq rôles. Son propre commentaire les énumère :

    admin_asso : président — tout
    tresorier  : trésorerie et paiements + lecture adhérents ; PAS les données de santé
    secretaire : adhérents, dossiers, pièces, santé, messages, site
    encadrant  : contrôle terrain (scan) + présences ; PAS santé ni paiements
    lecture    : lecture seule

Elle crée `role_asso()` et `a_role_asso(text[])`, et s'en sert immédiatement dans la
politique `qs_read_org` pour réserver les données de santé à `admin_asso` et `secretaire`.

**Et elle ne touche pas à `profiles_role_check`.** Aucun `alter table … drop constraint`,
aucun `add constraint`. La contrainte posée par `init_multitenant` le 29/06 —
`role in ('super_admin','admin_asso','encadrant','adherent')` — reste donc en place,
inchangée, jusqu'à aujourd'hui.

C'est l'origine exacte du défaut prouvé dans la PR #11 (`tests/db/20-roles.sql`) :
**le RBAC a été construit sur des valeurs que la table refuse d'enregistrer.** Trois des
cinq rôles annoncés — `tresorier`, `secretaire`, `lecture` — n'ont jamais pu exister dans
`profiles.role`. Toutes les branches de politique qui les nomment sont mortes depuis le
premier jour, y compris celle qui protège les données de santé : `qs_read_org` n'accorde
en pratique la lecture qu'à `admin_asso`.

Deux conséquences à ne pas confondre :

- **Côté confidentialité, l'effet est protecteur** : la politique est plus fermée que ce
  qu'elle annonce, jamais plus ouverte. Aucune donnée de santé n'a été exposée par ce
  défaut.
- **Côté produit, le RBAC n'a jamais fonctionné.** Un président qui nomme un trésorier ou
  un secrétaire dans le cockpit obtient une violation de contrainte. La matrice de rôles
  décrite dans `CLAUDE.md` et dans `src/lib/roles.ts` n'a jamais été appliquée.

La correction n'appartient pas à cette branche : restituer l'historique, c'est le
restituer tel qu'il fut, défaut compris. Elle fera l'objet d'une **migration normale
postérieure** à l'historique restauré, dans le lot « Rôles et permissions cohérents »,
avec l'inventaire des rôles affichés, des permissions attendues et des usages réels.

## Opérations de données relevées dans les migrations restituées

Une migration n'est pas toujours du DDL. Relevé au fil de l'extraction, à rejouer lors de
la reconstruction :

| Migration | Opération |
| --- | --- |
| `20260709160014_echeances_max_par_organisation` | `update public.organisations set echeances_max = 3 where slug = 'usmboxe'` |
| `20260630055247_storage_pieces_bucket` | `insert into storage.buckets` — bucket `pieces` |
| `20260702133730_bucket_logos` | `insert into storage.buckets` — bucket `logos` |

Les deux `insert into storage.buckets` confirment que les buckets font partie de
l'historique : une reconstruction qui les oublierait donnerait une base sans stockage,
et les politiques `storage.objects` porteraient sur des buckets inexistants.

---

## Dérogation de confidentialité — `20260709083407`

**Décision de Mathieu, 02/08/2026** : ne pas publier l'adresse, ne pas rendre le dépôt
privé. Dérogation explicite, limitée à cette seule valeur.

La migration est restituée **à l'identique, sauf l'adresse personnelle de l'administrateur
initial**, remplacée par le marqueur `__KLUBSTER_SUPER_ADMIN_EMAIL__`. Une seule
substitution, aucun autre octet touché.

Le marqueur ne contient pas d'`@`. `profiles.email` étant alimentée depuis
`auth.users.email`, que GoTrue valide comme une adresse, **aucune ligne ne peut porter
cette valeur** : l'`update` s'exécute sans promouvoir personne. L'inertie est structurelle,
pas conventionnelle — et c'est ce qui rend la reconstruction saine, puisqu'une base neuve
n'a alors aucun super-administrateur. La procédure d'attribution est dans
`super-admin.md` ; elle ne comporte aucun fichier contenant une adresse.

Le manifeste conserve les deux empreintes, les deux tailles, la date et la raison. Le
vérificateur distingue désormais trois états — byte-exacte, dérogation contrôlée,
divergence non expliquée — et refuse :

- toute autre modification du fichier (`DÉROGATION ALTÉRÉE`) ;
- une dérogation déclarée mais non appliquée, c'est-à-dire un fichier resté identique à
  l'original, donc une valeur sensible publiée ;
- une dérogation portant sur une version absente du manifeste ;
- toute divergence non déclarée.

`tests/donnees-personnelles.test.ts` complète le dispositif par liste blanche : toute
adresse non explicitement autorisée est refusée dans `supabase/migrations/`, `docs/`,
`scripts/` et `tests/`. Le test ne contient pas l'adresse qu'il protège — une liste noire
publierait exactement ce qu'elle prétend cacher.

**Vérifié par mutation** : remplacer le marqueur par une adresse réelle fait échouer les
deux garde-fous, le test (`ce fichier ne doit contenir aucune adresse`) et le vérificateur
(`DÉROGATION ALTÉRÉE`).

Le test a d'ailleurs trouvé un second cas au passage : `tests/campagnes.test.ts` utilisait
une adresse en `club.fr`. Ce domaine peut exister et recevoir du courrier, contrairement à
`@example.com` (RFC 2606, réservé à jamais). Corrigé.

### Le test a refusé la documentation qui le décrivait

En expliquant la correction de `tests/campagnes.test.ts`, j'avais écrit l'adresse fautive
en toutes lettres dans ce document et dans `reprise.md`. Le test les a refusés tous les
deux.

Il avait raison, et l'erreur mérite d'être notée : **citer une adresse pour expliquer
qu'on l'a retirée la réintroduit**. C'est le même piège qu'une liste noire versionnée —
le remède publie ce qu'il prétend supprimer. Les documents décrivent désormais le domaine
sans écrire l'adresse.

Le périmètre du test inclut `docs/` précisément pour cela.

<!-- ETAT-RESTAURATION -->
**Restitution terminée : 47/47.** 46 byte-exactes, 1 dérogation de confidentialité contrôlée, 0 divergence non expliquée, 0 manquante.
<!-- /ETAT-RESTAURATION -->
