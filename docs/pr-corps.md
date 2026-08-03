Lot **cockpit**, ouvert depuis `main` (indépendant des PR #13 et #14).

En ouvrant son cockpit, un président doit savoir en cinq secondes ce qu'il a à faire. Il y trouvait sept indicateurs alignés sur le même plan visuel — « 14 adhérents » pesait autant que « 2 cotisations en retard » — puis trois cartes qui répétaient les mêmes chiffres, et qui n'apparaissaient qu'aux rôles financiers : **un secrétaire ouvrait un cockpit sans une seule action**, alors que les dossiers incomplets sont précisément son travail.

## Trois niveaux, et rien de plus

**À traiter maintenant** — litige bancaire, cotisations en retard, dossiers incomplets, nouvelles inscriptions. Un geste est attendu.
**À surveiller** — règlements attendus (chèque, espèces, virement), cours complets ou bientôt complets. Pas urgent, mais ça le deviendra.
**Le club aujourd'hui** — effectif, cours ouverts, cours du soir. Aucune injonction.

Une entrée à zéro n'est **jamais** produite : un club calme se voit calme, plutôt qu'une colonne de zéros à interpréter. Et la phrase d'accueil ne compte que le niveau « à traiter » : additionner les trois annonçait « 14 choses méritent votre attention » à un club parfaitement à jour dont le seul tort était d'avoir 12 adhérents.

Le calcul et le filtrage par rôle vivent dans `src/lib/priorites.ts`, testés séparément (13 tests). Aucune statistique en dur : tout vient de la base.

## Chaque alerte mène à l'écran déjà filtré

Deux filtres nouveaux sur la liste des adhérents : `?dossier=incomplet` et `?recentes=N`, avec un bandeau qui nomme le filtre actif et un lien « TOUT VOIR ». Vérifié dans le navigateur : « 5 dossiers incomplets » ouvre 5 lignes, « 2 cotisations en retard » en ouvre 2, « 8 nouvelles inscriptions » en ouvre 8.

Ce dernier chiffre ne concordait pas au départ : le filtre portait sur la date de la **fiche adhérent** alors que le cockpit compte les **adhésions** créées dans la semaine — 8 annoncées, 14 affichées. Corrigé. Un filtre sans résultat affiche une liste vide, jamais la liste entière.

## Trois bugs réels, une seule cause

Trois vocabulaires coexistaient pour `pieces_adherent.statut`, alors que la contrainte de la base n'accepte que `manquante` | `fournie` | `par_email` :

1. **La fiche adhérent écrivait `recue`.** Violation de contrainte à chaque clic, erreur journalisée puis avalée, page rechargée à l'identique : le bouton « ○ Manquante / ✓ Reçue » **ne faisait rien**. Reproduit dans le navigateur, puis vérifié en base — aucune écriture.
2. **Le cockpit comptait `attendue`.** Le compteur de pièces manquantes affichait donc toujours zéro. En production, **22 pièces sont manquantes** et n'ont jamais été signalées au club.
3. **La messagerie filtrait `≠ recue`.** Le filtre n'excluait aucune pièce : des adhérents parfaitement à jour entraient dans la cible « dossier incomplet » d'une relance collective.

`src/lib/pieces.ts` devient la source unique de vérité, et un test interdit ces littéraux dans les six fichiers concernés — la divergence ne peut plus revenir. Un échec de bascule affiche désormais un message au lieu de se recharger comme si tout allait bien.

Le compteur porte maintenant sur le nombre de **dossiers** (adhérents), pas de documents : quatre pièces manquantes dans la même famille, c'est un seul appel à passer.

## Rôles exercés dans le navigateur

Sur la base de développement, avec des données représentatives (14 adhérents, 6 payés, 4 en attente, 2 en retard, 1 annulé, 1 remboursé, 8 pièces manquantes, un cours bientôt complet) :

- **président** : les 3 lignes à traiter, les 2 à surveiller, l'abonnement Klubster ;
- **trésorier** : retards et règlements attendus, **pas** les dossiers, **pas** l'abonnement ;
- **secrétaire** : dossiers incomplets et nouvelles inscriptions, **aucun** chiffre de trésorerie ;
- **encadrant** et **lecture seule** : « Le club est à jour », l'effectif, aucune action d'écriture.

**Isolation** : le compte du Club A ouvrant `/club-b/cockpit` est renvoyé vers la connexion.

## Mobile

390 px : aucun débordement horizontal, le titre puis la première action visibles sans défilement excessif (première alerte à 409 px du haut), lignes entières cliquables de 89 px de haut — au bord du ring, on vise mal une petite flèche.

## Tests

275 vitest ✓ · build ✓ · typecheck ✓ · lint ✓ (0 erreur).

Un test existant qui vérifiait la **forme du JSX** (`{peutPaiements ? … À RELANCER`) a été réécrit pour vérifier le **comportement** : que les entrées financières portent bien la permission `paiements` et disparaissent pour les trois rôles non financiers. Il mord toujours, et il ne cassera plus à la prochaine retouche de mise en page.

## Captures

Dans [docs/cockpit-captures/](https://github.com/Klubster/klubster/tree/feat/cockpit-priorites/docs/cockpit-captures) :

- 01 — avant : tout sur le même plan, les trois cartes qui répètent la liste, aucune pièce manquante signalée
- 02 — après : les trois niveaux, chaque ligne menant à son écran filtré
- 03 — 390 px

## Environnement

Application locale, projet Supabase **klubster-dev**, comptes fictifs, clés Stripe et Resend factices. Aucune écriture en production. Les fixtures ont été créées sur le Club A de la base de développement.

## Limites

Aucune migration : tout se joue côté application. La **liste d'attente** n'existe pas encore en base — l'écran des adhérents affiche pourtant un statut `liste_attente` que la contrainte `adhesions_statut_check` n'accepte pas. C'est le sujet du lot suivant.

La preview de cette branche pointe sur la base de production, comme les autres ; rien n'y a été créé.
