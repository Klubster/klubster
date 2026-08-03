Lot **liste d'attente**, ouvert depuis `main` (indépendant des PR #13, #14 et #15).

## Le défaut, reproduit dans le navigateur

`register_adherent_full` calcule déjà un statut `liste_attente` quand le cours est plein, et l'interface l'affiche partout : badge sur la fiche adhérent, filtre de la liste, compteur par cours, bouton « Donner une place », RPC `promouvoir_liste_attente`. Mais `adhesions_statut_check` **n'acceptait pas cette valeur** — ni en développement, ni en production.

Conséquence, constatée en remplissant un cours puis en s'inscrivant depuis le formulaire public : **dès qu'un cours atteint sa capacité, toute nouvelle inscription échoue.** L'adhérent voit « Une erreur est survenue. Vérifiez vos informations. », le compte créé une seconde plus tôt est annulé, et le club ne saura jamais qu'il a perdu quelqu'un. À la rentrée, quand les cours se remplissent, c'est le pire moment possible.

Journal serveur à l'appui :

```
register_adherent_avec_sante new row for relation "adhesions"
violates check constraint "adhesions_statut_check"
```

## Ce que la migration 0028 établit

1. **`liste_attente` devient un statut valide.**
2. **`statuts_occupant_place()`** dit ce qui consomme une place — `en_attente`, `paye`, `en_retard` — et rien d'autre. Une adhésion annulée ou remboursée libère la sienne ; une liste d'attente n'en occupe aucune. Une seule définition, partagée par l'inscription, la promotion et la jauge.
3. **La décision « place libre ou liste d'attente » devient atomique.** Le cours est verrouillé **avant** le comptage. Sans ce verrou, deux inscriptions simultanées sur la dernière place lisaient le même total et passaient toutes les deux.
4. **La promotion vérifie qu'une place est réellement libre** — promouvoir au-delà de la capacité était possible — et suit l'ordre d'arrivée. Une promotion hors tour reste possible (une fratrie, par exemple) mais est journalisée comme telle.
5. **`places_libres(cours_id)`** donne la vérité. Sans capacité déclarée, un cours n'est jamais complet : un club qui n'a pas renseigné de limite ne veut pas d'une liste d'attente surprise.

## Un refus qui ne disait rien

L'écran Cours redirigeait vers `?promo=0` quand la promotion échouait, et n'affichait aucun message : le bouton semblait ne rien faire. Le refus est maintenant expliqué, avec la marche à suivre.

## La règle métier est écrite

`docs/regle-liste-attente.md` dit ce qui occupe une place, quand un cours est complet, comment on entre et sort de la liste, qui peut promouvoir — et **ce qui n'est pas fait** : aucune notification automatique quand une place se libère, aucune expiration d'une place proposée, plusieurs listes d'attente possibles pour une même personne. Rien n'est déduit silencieusement du code.

## Parcours exercés

Sur la base de développement, cours à 2 places :

- cours rempli à 2/2 → **inscription publique** → écran « Vous êtes sur la liste, Marc », aucun paiement demandé, dossier créé en liste d'attente ;
- **promotion refusée** parce que le cours est plein, avec le message qui l'explique ;
- **place libérée** (annulation) → **promotion acceptée** → « ✓ Place donnée » ;
- **concurrence** : deux inscriptions simultanées sur une seule place → 1 active, 1 en liste d'attente, jamais 2 actives.

Le script `scripts/test-concurrence-liste-attente.sh` rejoue la course et vérifie que le verrou précède le comptage. **Il mord** : en retirant `perform verrouiller_cours(...)` de la fonction, il échoue — vérifié, puis restauré.

Une note honnête y figure : la course brute seule ne suffit pas à faire échouer le test, parce que l'`INSERT` prend de lui-même un verrou de clé étrangère sur la ligne du cours. Mais ce verrou-là n'arrive qu'**après** le comptage — c'est exactement la fenêtre que ferme `verrouiller_cours`.

## Tests

268 vitest ✓ (dont 19 nouveaux sur la liste d'attente) · build ✓ · typecheck ✓ · lint ✓ (0 erreur).

## Environnement

Application locale, projet Supabase **klubster-dev**, comptes et domaines fictifs. **La migration a été appliquée sur la base de développement uniquement — pas en production.** Aucun paiement réel, aucun email réel.

## Ce qui reste à décider

Deux manques sont documentés mais pas comblés, parce qu'ils demandent un arbitrage produit :

- **prévenir le club** qu'une place s'est libérée (aujourd'hui il doit y penser) ;
- **un délai de réponse** après une promotion, au bout duquel la place repartirait à la personne suivante.

## Dépendances

Aucune avec les PR #13, #14 et #15. La migration `0028` prend le numéro suivant de la série ; si une autre PR ajoute une migration avant fusion, il faudra renuméroter.
