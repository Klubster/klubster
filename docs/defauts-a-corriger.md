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

Le même correctif vaut pour la démonstration, qui utilise `CLUB.couleur` de la même
façon sur `/demo/controle`. Il est prévu au lot accessibilité.
