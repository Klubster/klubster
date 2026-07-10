# Klubster — propositions d'améliorations

**9 juillet 2026.** Trois sujets : Stripe (fait, à finir de brancher), la gestion des adhérents (ce que font les concurrents, ce que je recommande), et la home — trop à lire, et ton expérience du terrain absente.

---

## 1. Stripe — état réel

### Ce qui est en place (commit `148ab27`)

Le code bascule tout seul entre test et production, et **le doute penche vers le test** : on est en mode test dès qu'une clé de test existe, sauf si `STRIPE_MODE=live`. L'erreur coûteuse n'est pas de tester en croyant être en prod ; c'est de facturer de vraies cartes en croyant tester.

Les identifiants Stripe du mode test (`acct_`, `cus_`, `sub_`) vivent dans une colonne séparée, `stripe_test`. Sans cette séparation, un club « connecté » en test serait apparu connecté en production, avec un compte inexistant — la bascule aurait été un carnage silencieux.

Le webhook accepte la signature du mode courant **et** de l'autre, donc un seul point de terminaison suffit pour les deux mondes. Le cockpit affiche un bandeau orange « Stripe en mode test — aucun paiement réel », et signale si la clé ne correspond pas au mode annoncé.

### Ce qu'il te reste à faire

Tu as créé `STRIPE_SECRET_KEY_TEST` — parfait, le code la lit. Il manque :

- `STRIPE_WEBHOOK_SECRET_TEST` — le `whsec_…` du point de terminaison **de test**.
- Le point de terminaison lui-même : `https://klubster.fr/api/stripe/webhook`, avec les événements **de ton compte** (`checkout.session.completed`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`) **et** ceux des **comptes connectés** (`checkout.session.completed`, `invoice.payment_succeeded`, `invoice.paid`).
- Le portail client Stripe activé, avec « Annuler l'abonnement » et « Mettre à jour le moyen de paiement » — sinon le bouton « Factures & résiliation » du cockpit échoue, alors que tes CGV le promettent.

Le jour de la bascule : `STRIPE_MODE=live`. Rien d'autre.

**Ce que je n'ai pas pu faire.** Aucun paiement n'a été testé de bout en bout. Le code de paiement non testé reste du code non testé — et le webhook est le seul endroit où l'argent peut disparaître sans bruit. Dès que la variable et le webhook sont là, je déroule : connexion Stripe d'un club, inscription d'un adhérent avec la carte `4242 4242 4242 4242`, paiement en trois fois, puis vérification en base que le règlement apparaît, que l'adhésion passe à « payé », et que la deuxième échéance est bien enregistrée.

---

## 2. Gestion des adhérents — ce qui existe ailleurs

J'ai regardé ce que proposent AssoConnect, HelloAsso, Sportsplus, Gestasso et les logiciels de fédération. Voilà ce qui revient partout, classé par ce qu'un bénévole utilise vraiment.

### Déjà livré aujourd'hui (`8d3719e`)

Liste paginée, recherche nom/prénom/email, filtre par statut de dossier, fiche complète (adhésion, règlements, solde, pièces basculables, questionnaire de santé, champs personnalisés), modification des coordonnées, export CSV.

### À ajouter, par ordre d'utilité réelle

**Ajouter un adhérent à la main.** Le cas est constant : quelqu'un s'inscrit sur papier au forum des associations, ou par téléphone. Aujourd'hui, impossible. C'est le manque le plus criant.

**Actions groupées.** Sélectionner dix adhérents et leur envoyer un message, ou les marquer payés. Sans ça, un trésorier clique cent fois.

**Relance en un clic depuis la fiche.** « Relancer pour la cotisation », « Relancer pour le certificat ». Le texte est pré-rempli, le bénévole n'écrit rien.

**Import CSV.** Le premier jour d'un club qui vient d'AssoConnect ou d'un tableur, c'est la seule chose qui compte. Sans import, Klubster commence par « ressaisissez vos 300 adhérents ». C'est un tueur d'adoption, et c'est la vraie réponse à l'objection « comment je migre ? ».

**Détection de doublons.** Deux « Dupont Jean », l'un inscrit par le père, l'autre par la mère. Tous les clubs vivent ça.

**Groupes / étiquettes.** Bénévole, arbitre, compétiteur, loisir. Sert à filtrer et à écrire au bon groupe.

**Notes internes.** « Ne pas relancer, difficultés financières, vu avec le président. » Invisible de l'adhérent. Tous les logiciels sérieux l'ont, parce que la vie associative est faite de cas particuliers.

**Historique de la fiche.** Qui a modifié quoi, quand. Indispensable dès qu'un club a deux administrateurs.

**Archivage de saison** plutôt que suppression. Un adhérent qui ne se réinscrit pas ne doit pas disparaître : ses règlements passés font partie de la comptabilité.

**Plusieurs administrateurs, avec des rôles.** Aujourd'hui Klubster n'a qu'un `admin_asso` par club. Un trésorier ne devrait pas pouvoir modifier le site, un secrétaire ne devrait pas voir la trésorerie. C'est aussi une protection : un seul compte partagé, c'est un mot de passe qui circule sur WhatsApp.

### Ce que je déconseille, malgré les concurrents

Le tableau de bord analytique (courbes d'évolution, cohortes). Ça échoue au filtre des 18 h : personne n'ouvre un graphique avant d'ouvrir la salle.

La suppression définitive d'un adhérent en un clic. Effacer un adhérent, c'est effacer ses paiements et son questionnaire de santé. Archiver, oui. Supprimer, avec confirmation en deux temps et jamais par accident.

---

## 3. La home — trop à lire

Tu as raison, et le diagnostic est précis : **la page fait dix sections, dont sept sont du texte.** Un président d'association la lit sur son téléphone, entre deux entraînements. Il ne lit pas, il balaie.

### Ce que je couperais

**« VI — Pendant ce temps »** et **« VII — Quand le club ouvre »** disent la même chose : le logiciel travaille pendant que vous vivez. Deux sections, une idée. Garder la timeline 18:02→18:06, qui *montre*. Supprimer le chapitre contemplatif, qui *dit*.

**« IX — Une saison »** ne raconte plus rien de neuf après le cockpit et le mercredi soir. Tu la gardais pour l'équilibre visuel — mais elle coûte trois cents mots.

**Les « Notes de terrain »** sous « Sur le terrain » : trois phrases qui répètent la section qui les précède.

Le gain : la page passe de dix à sept sections, et le visiteur atteint les tarifs avant de se lasser.

### Ce que je remplacerais par des images

La promesse « prêt en trente minutes » est démontrée par une liste de quatre étapes. Ce serait plus fort en **quatre captures d'écran** du vrai wizard, sans une ligne de texte.

Le cockpit est déjà une image. C'est la section qui convainc le plus, et c'est la moins bavarde. Ce n'est pas un hasard.

### Ton expérience du milieu associatif — elle est absente

C'est le vrai manque, et il est plus important que la longueur.

Aujourd'hui la page dit « Je n'ai pas inventé Klubster, j'en avais besoin » puis raconte une scène. C'est bien. Mais **quinze ans de vie associative, neuf ans dans un bureau, quatre ans de présidence** n'apparaissent nulle part comme une preuve — seulement comme une anecdote qu'on a coupée ce matin.

Or c'est exactement ce qu'un président prudent cherche : *est-ce que celui qui a fait ça sait ce que c'est, un mercredi soir de septembre ?*

Trois façons de le montrer sans se vanter :

**Une ligne sous le hero**, en mono, discrète : « Développé par le président d'un club, dans son club. Utilisé chaque semaine à l'USM Boxe. » Elle existe déjà en bas de page. Elle est trop bas.

**Des détails que seul un initié connaît.** « Les certificats arrivent au bon endroit » est vrai mais générique. « Le questionnaire de santé remplace le certificat depuis 2021, sauf pour la compétition » — ça, un président le lit et comprend immédiatement qu'on parle sa langue. Tu as ce savoir. La page ne l'utilise pas.

**Le vocabulaire du terrain.** Bureau, licence, forum des associations, dossier incomplet, chèque de caution, mercredi soir. Ta page parle déjà de mercredi soir, et c'est sa plus belle phrase. Il en faut cinq comme celle-là, pas cinq cents mots.

---

## Trois choses que je ferais en premier

1. **L'import CSV des adhérents.** C'est ce qui débloque l'adoption, et ça répond à l'objection « comment je migre » que ta home ne traite toujours pas.
2. **Ajouter un adhérent à la main.** Manque criant, coût faible.
3. **Couper trois sections de la home**, remplacer les quatre étapes par quatre captures.

Et, avant tout ça : **finir le branchement Stripe et le tester**. Tant que le webhook n'est pas éprouvé, tout le reste est décoration.
