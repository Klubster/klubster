# La liste d'attente — règle du produit

Ce document dit ce que Klubster fait, et pourquoi. Il fait foi : le code et les tests s'y
conforment, pas l'inverse.

## Ce qui occupe une place

Une place est occupée par une adhésion dont le statut est **en attente de règlement**,
**payée** ou **en retard**. Une adhésion **annulée**, **remboursée** ou **en liste
d'attente** n'occupe aucune place.

Autrement dit : le club réserve la place dès l'inscription, avant même d'avoir encaissé.
Un dossier non payé n'est pas une place libre — sinon le club promettrait deux fois le
même créneau, et le mercredi soir on refuserait quelqu'un qui a déjà payé.

La règle est portée par `statuts_occupant_place()` en base, appelée partout : inscription,
promotion, jauge du cockpit. Il n'y a pas deux endroits où la liste diverge.

## Quand un cours est complet

Un cours est complet quand le nombre de places occupées atteint `places_max`.

**Sans capacité déclarée** (`places_max` vide ou zéro), le cours n'est **jamais** complet :
personne ne part en liste d'attente. Un club qui n'a pas renseigné de limite ne veut pas
d'une liste d'attente surprise, et un zéro saisi par erreur ne doit pas bloquer sa rentrée.

## Entrer en liste d'attente

L'inscription publique décide seule : si une place est libre, l'adhésion est créée « en
attente de règlement » ; sinon elle est créée « en liste d'attente », **aucun paiement
n'est demandé**, et l'adhérent voit un écran qui le dit clairement.

La décision est **atomique** : le cours est verrouillé avant le comptage et jusqu'à
l'insertion. Deux inscriptions simultanées sur la dernière place ne peuvent pas passer
toutes les deux — la seconde recompte et part en liste d'attente.

## Sortir de la liste d'attente

**La promotion est manuelle.** Le club donne la place depuis l'écran Cours. Elle n'est
jamais automatique : une place qui se libère en novembre n'a pas le même sens qu'en
septembre, et le club connaît son monde.

La promotion **échoue si aucune place n'est libre**, avec un message qui le dit. Promouvoir
au-delà de la capacité était possible et produisait des cours en surcapacité.

**L'ordre est le premier arrivé, premier servi** (`created_at` croissant). Le club peut
promouvoir hors tour — c'est parfois nécessaire, une fratrie par exemple — mais le geste
est alors enregistré comme tel dans le journal d'audit (`hors_tour: true`).

Une place se libère par : désistement, annulation, remboursement, changement de cours,
suppression administrative, ou augmentation de la capacité. Dans tous les cas, c'est le
comptage qui fait foi : aucun compteur séparé à maintenir.

## Qui peut promouvoir

Président et secrétaire. La règle est vérifiée **en base** par la RPC, pas seulement dans
l'interface.

## Ce qui n'est pas fait

- **Aucune notification automatique** n'est envoyée quand une place se libère. L'écran
  annonce « la personne a été prévenue par email » : cet email part bien à la promotion,
  mais rien ne prévient le club qu'une place s'est libérée. À traiter.
- **Aucune expiration** : une personne promue reste « en attente de règlement »
  indéfiniment. Il n'y a pas de délai de réponse au bout duquel la place repartirait à la
  personne suivante.
- **Une personne peut figurer sur plusieurs listes d'attente** (un cours chacune), et rien
  ne l'empêche d'être inscrite ailleurs. C'est voulu : un adhérent peut vouloir deux cours.

## Historique

Avant la migration `0028`, `adhesions_statut_check` n'acceptait pas la valeur
`liste_attente`, alors que `register_adherent_full` la produisait dès qu'un cours était
plein et que toute l'interface l'affichait déjà. Conséquence, reproduite dans le navigateur
sur la base de développement : **dès qu'un cours atteignait sa capacité, chaque nouvelle
inscription publique échouait** sur « une erreur est survenue », le compte créé une seconde
plus tôt était annulé, et le club perdait l'adhérent sans jamais l'apprendre.
