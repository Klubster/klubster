# Le contrôle terrain — règle du produit

Un encadrant, un téléphone, le bord du tapis. La question est toujours la même :
« cette personne peut-elle entrer ce soir, et à quel cours ? ». L'écran répond en un
regard, et dit quoi faire ensuite.

## Ce que l'encadrant voit

Un panneau par personne : le nom, le cours de ce soir, puis **un statut en toutes
lettres** avec un symbole et une couleur — la couleur complète, elle ne porte jamais
l'information seule — et **l'action suivante**. Le vocabulaire vit dans
`src/lib/controle.ts`, couvert par les tests, pour qu'il ne dérive pas.

Trois familles :

- **Accès autorisé** (✓, vert) : dossier complet, bouton « Marquer présent ».
- **Attention** (⚠, ambre) : paiement en attente ou en retard, dossier incomplet,
  questionnaire de santé manquant. La personne entre, l'encadrant sait quoi
  transmettre au bureau. Le pointage reste possible.
- **Refus** (✕, rouge) : liste d'attente (place non confirmée), adhésion annulée ou
  remboursée, saison précédente, aucune adhésion, adhérent introuvable. **Aucun
  bouton de pointage** : pointer, c'est ouvrir la porte.

Si la personne est inscrite à plusieurs cours de la saison, l'écran l'affiche
(« Aussi inscrit : … ») — le statut montré reste celui de l'adhésion de référence.

## Ce que l'encadrant ne voit pas

Garanti par la RPC `controler_adherent`, pas seulement par l'écran : **aucun
montant**, **aucune donnée Stripe**, **aucun détail du questionnaire de santé**
(seulement présent / absent), **aucune donnée d'un autre club**. La matrice de rôles
est en base : président et encadrant seulement — un compte lecture seule est refusé
par la fonction, pas par un simple masquage d'interface.

## L'adhésion de référence

La même règle que la PR #10 (`verifier_adherent`), dans le même ordre : la saison
courante d'abord, une adhésion active ensuite (`paye`, `en_attente`, `en_retard`),
puis la plus récente, puis l'identifiant — ce dernier uniquement pour rendre l'ordre
total. Fonction **séparée** de `verifier_adherent`, volontairement : pas de
dépendance croisée avec la PR #10.

## Conditions réelles

- **390 px, une main** : bouton de scan et champ de recherche pleine largeur,
  cibles ≥ 44 px, résultat sous le pouce.
- **Réseau lent** : « Vérification… » s'affiche pendant l'attente ; chaque demande
  porte un numéro et seule la dernière réponse s'affiche (deux scans rapprochés ne
  peuvent plus s'intervertir) ; la recherche est débouncée (250 ms).
- **Double scan / double clic** : la présence du jour est unique — l'écran répond
  « Déjà pointé aujourd'hui », le bouton se désactive pendant l'écriture.
- **Session expirée** : message dédié et bouton « Se reconnecter » qui ramène au
  scanner — pas un faux « introuvable ».
- **QR étranger** : un contenu qui n'est pas un identifiant est rejeté sans requête.

## Validation de la RPC de la PR #10 — faite sur `klubster-dev` le 03/08/2026

Fixtures dédiées (`@dev.example.org`), club d'essai `cercleescrimetest` :

- deux adhésions créées le même jour, deux cours, statuts différents → dix appels,
  dix réponses identiques, cours et règlement issus de la même adhésion ;
- saison courante prioritaire (saison passée payée + courante en attente → « non
  réglé », cours courant) ;
- adhésion active prioritaire (liste d'attente + en retard → l'en retard) ;
- cross-tenant refusé (« Non autorisé »), anon refusé (42501), identifiant invalide
  → « Adhérent introuvable ».
