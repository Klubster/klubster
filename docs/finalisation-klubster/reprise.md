# Reprise — harnais Postgres et reconstructibilité des migrations

Passation écrite le 01/08/2026 à la limite de contexte. Elle décrit un état **partiel et
vérifiable**, pas un chantier terminé.

## Où en est-on

| | |
|---|---|
| Branche | `test/postgres-supabase-harness`, worktree `/tmp/klb-harness` |
| Partie de | `origin/main` à `42ff19d` (revérifié au démarrage) |
| PR | brouillon, à ouvrir/ouverte |
| État | **le harnais fonctionne ; la chaîne de migrations ne passe pas encore** |

`npm run test:db` — ou `./scripts/db/harnais.sh migrations` — applique aujourd'hui
**7 migrations sur 30** puis s'arrête sur une erreur réelle du dépôt.

## Ce que le harnais a établi

**La base n'est pas reconstructible depuis le dépôt.** `CLAUDE.md` pose pourtant la
règle : « La base doit rester reconstructible depuis le repo. »

Rejouées sur une base vide, les migrations s'arrêtent dès `0003`. Trois familles de
manques, toutes du même genre — des objets utilisés avant d'exister :

| Famille | Nombre | Créés dans | Premier usage |
|---|---:|---|---|
| Fonctions | **9** | `0011`, `0013` | `0003` |
| Tables | **6** | `0017` | `0004` |
| Colonnes | **≥ 1** (`adherents.user_id`) | à déterminer | `0006` |

**[Vérifié par script]** — le relevé des fonctions et des tables est produit par analyse
statique des migrations, et l'arrêt est reproductible à chaque exécution.

**[Hypothèse, non établie]** — les noms `0011_reference_fonctions_auth`,
`0013_reference_rpc_et_storage` et `0017_snapshot_tables_et_index` et leur contenu (des
définitions complètes en `CREATE OR REPLACE`) sont cohérents avec des instantanés pris
après coup sur une base déjà construite hors migration. L'historique Git ne dit pas ce
qui a été exécuté dans l'éditeur SQL de Supabase : je ne peux pas le prouver.

### Ce que cela coûte

1. **Aucune reprise après sinistre.** Le projet Supabase perdu, le dépôt ne suffit pas à
   le reconstruire. Pour un produit qui héberge des données de santé et des mineurs, ce
   n'est pas un détail d'hygiène.
2. **Aucune migration ne peut être testée avant la production**, faute de pouvoir amener
   une autre base dans le même état. C'est aussi ce qui bloque la validation de la PR #10.
3. **Aucune préproduction reproductible.**

## Ce qui est déjà écrit

| Fichier | Rôle |
|---|---|
| `scripts/db/harnais.sh` | cluster jetable : `initdb`, socket Unix privé, cales, migrations, tests, destruction |
| `scripts/db/00-cales-supabase.sql` | `auth.uid()`, `auth.users`, `storage.objects`, `storage.foldername()`, 4 rôles, 4 buckets |
| `supabase/migrations/0000_prerequis_reconstructibilite.sql` | les 9 fonctions, signatures exactes, corps minimal |
| `supabase/migrations/0001a_tables_declarees_tardivement.sql` | les 6 tables, définitions extraites de `0017` |

Deux décisions de méthode, à ne pas défaire :

- **`0000` et `0001a`, pas un renumérotage.** L'ordre d'application est l'ordre
  alphabétique ; `0001_init… < 0001a_tables… < 0002…`. Renuméroter aurait réécrit un
  historique déjà appliqué en production.
- **Les définitions sont extraites automatiquement**, jamais retranscrites : deux
  vérités pour une seule table finissent toujours par diverger.

## La commande exacte pour reprendre

```bash
cd /tmp/klb-harness            # ou: git worktree add /tmp/klb-harness test/postgres-supabase-harness
./scripts/db/harnais.sh migrations
```

Sortie attendue aujourd'hui : sept `ok`, puis

```
0006_reference_rls_et_grants.sql   ÉCHEC
psql:…:53: ERROR:  column "user_id" does not exist
```

### Le pas suivant, précisément

1. Trouver où `adherents.user_id` est ajoutée :
   `grep -rn "user_id" supabase/migrations/*.sql | grep -i "alter table\|add column"`
2. L'ajouter à `0001a` (ou à un `0001b` si elle dépend d'une table plus tardive), par
   **extraction**, pas à la main.
3. Relancer. Traiter l'erreur suivante de la même façon.
4. **Ne pas s'arrêter au premier vert** : enchaîner une seconde reconstruction depuis
   zéro et comparer les schémas (`pg_dump --schema-only` des deux, `diff`).

`KLB_GARDER_CLUSTER=1 ./scripts/db/harnais.sh migrations` conserve le cluster pour
inspecter après un échec.

## Ce qui reste à faire sur ce lot

- [ ] terminer la chaîne jusqu'à la dernière migration de `main`
- [ ] double reconstruction + comparaison de schémas
- [ ] rejeu sur base déjà migrée (les migrations doivent être idempotentes)
- [ ] fixtures multi-tenant (club A / club B, tous les rôles, emails `@example.com`)
- [ ] sessions par `set local request.jwt.claims` — **jamais** `service_role` pour prouver une autorisation
- [ ] matrice RLS générée, `docs/finalisation-klubster/matrice-rls.md`
- [ ] `npm run test:db`, `test:db:reset`, `test:db:rls`, `test:db:rpc`
- [ ] CI sur `supabase/migrations/**` et le harnais
- [ ] **validation de la PR #10** : les 10 scénarios de la RPC `verifier_adherent`
- [ ] `docs/finalisation-klubster/harness-postgres.md`

## Risques et points non vérifiés

- **Les cales ne sont pas Supabase.** Elles reproduisent la surface SQL relevée dans les
  migrations, rien de plus : ni GoTrue, ni API Storage, ni Realtime, ni PostgREST. Un
  test qui passe ici ne prouve pas le comportement de Supabase en production — il prouve
  le comportement du SQL du dépôt.
- **`storage.foldername()` est la cale la plus sensible** : tout le cloisonnement des
  pièces en dépend. Une cale qui rendrait le mauvais segment ferait passer des tests
  d'isolation qui devraient échouer. Son comportement (`org/pieces/x.pdf` → `{org,pieces}`)
  est à confronter à celui de Supabase avant de conclure quoi que ce soit sur le Storage.
- **Docker absent sur cette machine** (`which -a docker podman colima nerdctl` vide,
  pas de `/Applications/Docker.app`) : `supabase start` était impossible. Si Docker
  devient disponible, un Supabase local complet vaudrait mieux que les cales — le harnais
  resterait utile en CI, où il est plus léger.
- **PostgreSQL 16.14 installé via Homebrew** pour ce chantier. Version de production non
  vérifiée : à confronter avant de tirer des conclusions sur des comportements
  dépendants de la version.
- `export LC_ALL=C` dans le lanceur : sans lui, le postmaster échoue sur macOS avec
  « devenu multithreadé lors du démarrage », message qui ne parle pas de locale.
