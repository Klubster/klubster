# Défauts du produit relevés en construisant la démonstration

Ce fichier ne liste que des défauts du **produit réel**, trouvés en relisant le code
pour le reproduire fidèlement dans `/demo`. Chacun demande une PR séparée : ils n'ont
rien à faire dans la branche de la démonstration, et les mélanger rendrait les deux
illisibles.

Un défaut corrigé se retire d'ici, avec le commit qui l'a fermé.

---

## 1. `verifier_adherent` n'a pas d'ordre total

**Relevé le** 31/07/2026, en écrivant `verifierAdherentDemo`.
**Où** `supabase/migrations/0013_reference_rpc_et_storage.sql`, lignes 505-511.

La RPC choisit l'adhésion de référence — celle qui donne le cours affiché **et** le
verdict « À jour / Non réglé » — par :

```sql
order by ad.created_at desc limit 1
```

`created_at` est une date, pas un instant : deux adhésions du même jour sont
**ex æquo**. Postgres est alors libre de rendre l'une ou l'autre, et rien ne garantit
qu'il rende la même deux fois de suite.

**Quand ça se produit** un renouvellement saisi le jour même de l'inscription, ou une
correction faite dans la foulée. Le scanner peut afficher l'ancien cours et l'ancien
statut de règlement — donc « À jour » pour quelqu'un qui n'a pas payé la nouvelle
saison, ou l'inverse.

**Correctif** ajouter un second critère de tri dans la RPC :

```sql
order by ad.created_at desc, ad.id desc
```

`id` est un uuid : il ne porte aucun sens chronologique, mais il rend l'ordre **total**
et donc le résultat stable. Si l'on veut en plus qu'il soit *juste*, c'est la colonne
`saison` qu'il faudrait départager, pas l'identifiant — à trancher au moment du
correctif.

La démonstration applique déjà ce départage (`selecteurs.ts`, `verifierAdherentDemo`),
pour être déterministe. C'est un écart assumé et signalé sur place.

---

## 2. La couleur du club sert de couleur de texte, sans garantie de contraste

**Relevé le** 31/07/2026, en reprenant l'écran du scanner.
**Où** `src/app/[asso]/cockpit/scanner/Scanner.tsx` — `style={{ color: accent }}` sur
« ✓ PRÉSENT AUJOURD'HUI », et `style={{ background: accent }}` sur « MARQUER PRÉSENT »
avec un texte blanc.

`accent` vient de `organisations.couleur_primaire` : c'est une valeur **choisie par le
club**, pas un jeton du système de design. Rien ne la contraint. Un vert sauge comme
`#6B7F5E` donne environ 3,6:1 sur le papier — sous le 4,5:1 exigé en AA pour du texte
de 13 px, et sous le 4,5:1 du texte blanc sur ce fond.

Ce n'est pas un cas d'école : c'est exactement le genre de vert doux que choisit une
association de yoga ou de randonnée.

**Correctif** ne jamais poser la couleur du tenant directement sur du petit texte ni en
fond de bouton. Deux pistes, à trancher :

- assombrir la couleur du tenant à la volée jusqu'à atteindre le ratio, et n'utiliser la
  couleur brute que pour les accents non textuels (filets, puces, jauges) ;
- ou séparer en base une couleur d'accent et une couleur de texte, ce qui déplace le
  problème vers le formulaire de réglages du club.

La première ne demande rien au club, ce qui est un argument sérieux : personne ne
choisit sa couleur en pensant au contraste.

**Côté démonstration : corrigé le 01/08/2026.** `donnees.ts` porte désormais DEUX
valeurs — `CLUB.couleur` (`#6B7F5E`, la couleur choisie par le club, réservée aux
accents non textuels : filets, liserés, curseur `_`) et `CLUB.couleurTexte`
(`#3F4C36`, la même assombrie jusqu'à 8,9:1 sur le papier et 9,1:1 sous du blanc),
qui porte les libellés, les statuts et les fonds de bouton. `tests/demo-accessibilite.test.tsx`
refuse tout `color:` ou `background:` posé sur la valeur brute, et vérifie par le
calcul que la brute échoue en AA et que l'assombrie passe — de sorte qu'une
« correction » de la donnée du club, plutôt que de son usage, ferait tomber le test.

C'est la piste n°1 ci-dessus, appliquée à un seul tenant. Le correctif du produit
reste à porter : il doit assombrir à la volée, pour n'importe quelle couleur.

---

## 3. La liste d'attente peut s'ouvrir sur un cours qui n'est pas complet

**Relevé le** 01/08/2026, en écrivant l'aperçu du formulaire d'inscription.
**Où** ce n'est pas un défaut de code mais un défaut possible en base — et il était
présent dans les données de la démonstration jusqu'à ce commit.

`coursComplets` (`src/lib/complets.ts`) décide qu'un cours est complet quand ses
adhésions actives de la saison atteignent `places_max`. Mais **rien n'empêche une
adhésion `liste_attente` d'exister sur un cours qui a de la place** : ni contrainte
en base, ni vérification à l'inscription au-delà du moment du choix. Une jauge
relevée après coup — le club trouve deux tapis de plus — laisse les personnes en
attente là où elles sont, sans que rien ne le signale au président.

**Ce que voit le club** l'écran « Cours et tarifs » affiche `5/16 inscrits · 3 en
liste d'attente ». C'est exact, et incompréhensible.

**Correctif** à trancher : soit signaler la situation sur l'écran des cours (« des
places se sont libérées : 3 personnes attendent »), soit promouvoir automatiquement
à l'enregistrement d'une jauge élargie. La première laisse la décision au club, ce
qui vaut mieux — donner une place envoie un email, et un email automatique déclenché
par un réglage surprend.
