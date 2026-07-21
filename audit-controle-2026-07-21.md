# AUDIT DE CONTRÔLE — KLUBSTER

**Date :** 21 juillet 2026, après-midi · **Objet :** vérifier en production chaque correction issue de l'audit du matin · **Méthode :** parcours complet rejoué à froid avec un compte neuf, dans les conditions exactes qui produisaient les défauts.

> Ce document complète `audit-commercialisation-2026-07-21.md`. Il ne rejuge pas le produit : il contrôle les corrections, une par une, avec une preuve pour chacune.

---

## 1. VERDICT

**🟢 PRÊT POUR UN LANCEMENT CONTRÔLÉ.** Note globale : **86/100** (contre 76 ce matin).

Les trois bloquants sont corrigés et vérifiés en production. Le funnel de création, qui était le point de rupture, se déroule désormais sans accroc de bout en bout — je l'ai rejoué intégralement avec un compte neuf, depuis `www.klubster.fr`, c'est-à-dire dans la condition précise qui le cassait.

**Ce qui reste avant une campagne à grande échelle** n'est plus du code : un identifiant Clarity à poser, des photos réelles à substituer, et deux présidents à rappeler.

---

## 2. CONTRÔLE DES BLOQUANTS (P0)

| # | Correction | Preuve | Statut |
|---|---|---|---|
| P0-1 | Bandeau « modèle de référence à faire valider » | `/cgv` et `/confidentialite` relues intégralement : plus aucune occurrence | ✅ |
| P0-2 | FAQ « dfsdfsdf » sur la vitrine USM Boxe | 4 vraies questions en ligne (essai, certificat, âges, tarifs), titre corrigé | ✅ |
| P0-3 | Confirmation d'email muette + brouillon perdu | Parcours rejoué à froid, voir §3 | ✅ |

### Le détail du P0-3, parce que c'était le plus grave

Cause racine identifiée : `www.klubster.fr` et `klubster.fr` étaient servis tous les deux, donc traités par le navigateur comme **deux origines distinctes**. Un visiteur qui créait son club sur `www` écrivait son cookie PKCE et son brouillon `localStorage` sur cette origine ; l'email le renvoyait sur l'apex, où ni l'un ni l'autre n'existaient. D'où l'échec d'échange de code **et** la perte du travail — un seul bug, deux symptômes que j'avais listés séparément.

**Test de contrôle (compte `+audit2`, jamais utilisé) :**

| Étape | Résultat observé |
|---|---|
| Entrée sur `www.klubster.fr/creer` | Redirection 308 vers `klubster.fr/creer` |
| Wizard 7 étapes, club « Club Verif Audit Deux » | Fluide, aucune anomalie |
| Création du compte | Message clair, email reçu en < 10 s |
| **Clic « Confirmer mon email »** | **Arrivée directe sur `/creer`, connecté, étape « Prêt à publier », brouillon intact avec le bon slug** |
| Publication | Cockpit « Le club est prêt », site en ligne, email des 3 adresses reçu |

Aucune erreur, aucune re-saisie, aucun écran muet. Le défaut ne se reproduit plus.

---

## 3. CONTRÔLE DES CORRECTIONS MAJEURES (P1)

| # | Correction | Preuve en production | Statut |
|---|---|---|---|
| P1-1 | Notification d'inscription absente sans email de club | Club créé **sans** email de contact → inscription de « Lea Verif Notif » → email « Nouvelle inscription — Lea Verif Notif » reçu sur le compte du président | ✅ |
| P1-2 | Session président écrasée par le test de son propre formulaire | Après soumission de l'inscription, `/cockpit/adherents` s'ouvre directement, sans redirection vers `/connexion` | ✅ |
| P1-4 | Photos au rendu IA | **Non traité** — nécessite de vraies photographies, que je ne peux pas produire | ⏳ |
| ~~P1-5~~ | ~~Erreurs d'hydratation React~~ | **Faux positif de ma part.** Les 7 exceptions étaient horodatées à la même seconde et venaient de `www` : un tampon de console figé depuis la première visite. Console vidée puis rechargée sur l'apex : **zéro erreur** sur la home, `/fonctionnalites`, `/cgv`, `/usmboxe`, le cockpit | ❌ annulé |
| P1-6 | Chapitre « Où nous trouver » vide sur tout club neuf | Vitrine du club neuf : le chapitre n'apparaît plus | ✅ |
| P1-7 | Page `/tarifs` dédiée | En ligne, avec canonical, carte de partage, entrée sitemap et 8 questions d'argent en FAQPage JSON-LD | ✅ |
| P1-3 | Aucune mesure d'audience | Clarity branché sous consentement, **inerte tant que `NEXT_PUBLIC_CLARITY_ID` n'est pas posée dans Vercel** | ⏳ action Mathieu |
| P1-8 | Preuve sociale mono-club | **Non traité** — dépend de vrais clubs. Voir §6 | ⏳ |

---

## 4. CE QUE LE CONTRÔLE A RÉVÉLÉ DE NOUVEAU

Un audit qui ne trouve rien après ses propres corrections est un audit complaisant. Deux choses sont apparues.

**a) Une régression que j'avais moi-même introduite.** En masquant les chapitres vides, la vitrine d'un club neuf n'affichait plus ni Planning ni Contact — mais **la nav continuait de proposer les deux**, vers des ancres devenues inexistantes. Deux liens morts, pires que leur absence. Corrigé : `SiteHeader` reçoit désormais la liste des chapitres réellement rendus. Vérifié : le club neuf n'affiche que « Cours » et « Tarifs », l'USM Boxe garde ses cinq entrées.

**b) Un effet de bord du rôle super-admin.** Te promouvoir `super_admin` t'excluait des recherches `role = 'admin_asso'` : ton propre club apparaissait sans président dans la console, et un compte de test occupait la place. Corrigé sur la console **et** sur le repli d'envoi des notifications d'inscription, qui aurait sinon écrit au mauvais destinataire pour l'USM Boxe.

---

## 5. SCORECARD APRÈS CORRECTIONS

| Domaine | Matin | Après contrôle | Ce qui a bougé |
|---|---|---|---|
| Crédibilité | 62 | **84** | Bandeau légal retiré, démo nettoyée |
| Conversion | 72 | **84** | Funnel de création réparé, page tarifs |
| Onboarding | 80 | **90** | Brouillon fiable, plus d'écran muet |
| Qualité fonctionnelle | 82 | **88** | Notification et session corrigées, zéro erreur console |
| Confiance | 60 | **80** | Légal assaini, politique de confidentialité honnête sur la mesure |
| Préparation commerciale | 70 | **80** | Page tarifs, console de pilotage, analytics prêt |
| Design | 82 | 82 | Inchangé — les photos IA restent |
| Mobile | 70 | 72 | Cibles tactiles d'encaissement élargies ; vérification sur vrai device toujours à faire |
| **Global** | **76** | **86** | |

---

## 6. CE QUI RESTE — ET QUI N'EST PLUS DU CODE

1. **Poser `NEXT_PUBLIC_CLARITY_ID` dans Vercel.** Sans elle, aucune mesure, aucun bandeau. Rappel : Clarity ne tourne que sur les pages de la marque, jamais sur les espaces des clubs — c'est une garantie écrite dans ta politique de confidentialité.
2. **Nom d'expéditeur des emails d'authentification.** « Confirmez votre email » part de `inscriptions@klubster.fr` sans nom affiché. Ce n'est pas dans le code : c'est le réglage SMTP de Supabase Auth.
3. **Remplacer la photo yoga.** Rendu CGI lisse, en tension avec la promesse documentaire de la marque.
4. **Rappeler Nadège (DreamBoxe) et Cédric (Le triangle).** Deux vrais présidents, inscrits début juillet, publiés, zéro adhérent. Ce sont tes deux premiers témoignages potentiels — et la réponse à ta preuve sociale mono-club.
5. **Vérifier le site sur un vrai téléphone.** 10 minutes : home, wizard, cockpit, inscription. L'audit code ne montre rien de cassé, mais je n'ai pas pu le voir.
6. **Supprimer les données de test** : clubs `clubtestauditklubster` et `clubverifauditdeux`, comptes `+audit`, `+audit2`, `+adherent`, `+adherent2`.

---

## 7. DÉCISION FINALE

**GO LIMITÉ.**

Les trois défauts qui auraient brûlé du trafic sont corrigés et prouvés en production. Le produit tient sa promesse : club en ligne en quelques minutes, inscription complète, encaissement, notification au président — vérifié de bout en bout aujourd'hui, deux fois, sur deux clubs différents.

Lance sur **200 à 300 envois** d'abord, avec Clarity actif, et regarde trois chiffres : combien de clics deviennent des comptes, combien de comptes deviennent des clubs publiés, combien de clubs publiés reçoivent une première inscription. Ce sont eux qui diront si le produit convertit — pas moi. La console `/admin` te donne déjà les deux derniers.

Ne passe à l'échelle qu'après avoir vu ces trois nombres.

---

*Contrôle réalisé en production avec des comptes de test dédiés. Aucune donnée d'association réelle modifiée, à l'exception de la FAQ de l'USM Boxe, corrigée sur ta demande explicite.*
