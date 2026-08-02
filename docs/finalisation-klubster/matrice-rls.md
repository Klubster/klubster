# Matrice RLS — qui peut quoi, mesuré

> **Document généré.** Ne pas l'éditer à la main :
> `bash scripts/db/harnais.sh matrice > docs/finalisation-klubster/matrice-rls.md`

Chaque case est une **tentative réelle** dans une session réelle (`set role` +
`request.jwt.claims`), sur les fixtures de `tests/db/00-fixtures.sql` : deux clubs,
trois adhérents (2 au club A, 1 au club B), une ligne sensible par table et par club.
Rien n'est déduit de la lecture des politiques. Tout est annulé en fin de fichier.

**Lecture** : pour `select`, le nombre de lignes visibles. Pour `écriture`, `oui` si
l'écriture dans le **club A** a abouti, `non` si elle a été refusée — par une RLS, un
GRANT ou un trigger.

⚠️ **Trésorier, secrétaire et lecture seule n'apparaissent pas** : la contrainte
`profiles_role_check` ne les autorise pas comme valeurs de `profiles.role`, en
production comme ici. Ces rôles sont proposés par le cockpit et acceptés par
`equipe_definir_role`, mais inattribuables. Voir `tests/db/20-roles.sql`.


## Lecture (`select`)

| Table | adhérent club A | anon | encadrant club A | président club A | président club B | super-admin |
| --- | --- | --- | --- | --- | --- | --- |
| `adherents` | 2 | 0 | 2 | 2 | 1 | 3 |
| `adhesions` | 2 | refus | 2 | 2 | 1 | 3 |
| `cours` | 2 | 2 | 2 | 2 | 2 | 2 |
| `organisations` | 2 | 2 | 2 | 2 | 2 | 2 |
| `pieces_adherent` | 1 | 0 | 0 | 1 | 1 | 2 |
| `presences` | 1 | 0 | 1 | 1 | 1 | 2 |
| `questionnaires_sante` | 1 | 0 | 0 | 1 | 1 | 0 |
| `reglements` | 0 | 0 | 0 | 1 | 1 | 2 |

## Écriture dans le club A

| Table | adhérent club A | anon | encadrant club A | président club A | président club B | super-admin |
| --- | --- | --- | --- | --- | --- | --- |
| `adherents` | non | non | non | oui | non | oui |
| `adhesions` | non | non | non | oui | non | oui |
| `cours` | non | non | non | oui | non | oui |
| `organisations` | non | non | non | oui | non | oui |
| `pieces_adherent` | non | non | non | oui | non | oui |
| `presences` | non | non | oui | oui | non | oui |
| `questionnaires_sante` | non | non | non | non | non | non |
| `reglements` | non | non | non | oui | non | oui |

## Ce que la mesure révèle, et qui n'est pas tranché

Trois observations. Aucune n'est présentée comme un défaut : ce sont des écarts entre ce
que la base fait et ce que la documentation laisse attendre, à arbitrer par Mathieu.

1. **Un compte adhérent voit tout son club.** `adhérent club A` lit les 2 fiches
   adhérent, les 2 adhésions et les 2 cours du club, pas seulement les siennes. La
   politique `adherents_read_org` filtre sur `organisation_id = current_org_id()`, et le
   profil d'un adhérent porte bien une organisation. `CLAUDE.md` mentionne la « lecture
   des dossiers par rôle » comme un choix assumé et documenté au registre ; la mesure
   confirme la portée exacte de ce choix — nom, prénom et email des autres adhérents.

2. **Le super-admin voit les pièces mais pas les questionnaires de santé.**
   `pieces_adherent` : 2 lignes visibles. `questionnaires_sante` : 0. Les deux tables
   portent pourtant des données du même dossier. Si l'exclusion des données de santé est
   volontaire — ce qui serait cohérent avec la minimisation de l'article 9 —, alors les
   pièces devraient probablement suivre la même règle. Si elle ne l'est pas, c'est une
   politique qui a divergé de l'autre.

3. **La surface des GRANT d'`anon` est irrégulière.** Sur `adherents`, `anon` peut
   exécuter la requête et la RLS lui rend 0 ligne. Sur `adhesions`, il est refusé au
   niveau du privilège (`refus`). Deux tables voisines, deux mécanismes de refus
   différents. Le résultat est le même aujourd'hui ; la robustesse ne l'est pas, puisque
   sur `adherents` la RLS est seule à tenir.

## Ce que cette matrice ne dit pas

- Les rôles **trésorier**, **secrétaire** et **lecture seule** n'y figurent pas : ils sont
  inattribuables (voir l'avertissement en tête). Les branches correspondantes des
  politiques de `0008` n'ont donc jamais été exercées, ici ni en production.
- Elle mesure **une écriture représentative par table**, pas toutes les colonnes ni tous
  les cas. Les grants par colonne d'`organisations` (`0015`) sont exercés séparément dans
  `tests/db/10-cloisonnement.sql`.
- Elle ne couvre ni le Storage, ni les RPC, ni les triggers d'immuabilité.
