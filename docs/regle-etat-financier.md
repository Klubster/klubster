# L'état financier d'un dossier — la règle du produit

Écrite le 03/08/2026, portée par `src/lib/finances.ts` (la seule implémentation) et la
migration `20260803230000_paiements_coherence.sql`. Tous les écrans lisent cette règle ;
aucun ne recalcule la sienne.

## Les états, et ce qu'ils veulent dire

Un dossier est dans UN de ces états, dans cet ordre de priorité :

1. **Litige** — une contestation bancaire est ouverte (`litige_le` posé par le webhook).
   Prioritaire sur tout : tant qu'elle n'est pas fermée, rien d'autre ne compte.
2. **Annulée** — le club a annulé l'adhésion. Rien n'est dû.
3. **Remboursé** — tout a été rendu (au seuil près). Posé par le webhook de
   remboursement ; le calcul le reconnaît aussi quand les règlements nets tombent à
   zéro avec au moins un remboursement.
4. **Liste d'attente** — pas de place : rien n'est dû tant qu'elle n'est pas donnée.
5. **Aucun paiement attendu** — cotisation à 0 €.
6. **Réglé** — soldé, à la tolérance près.
7. **En retard** — un CONSTAT, jamais une déduction d'écran : posé par une échéance
   rejetée (webhook), un litige, ou le cron à la troisième fenêtre de relance (45 j).
8. **Partiellement réglé** — au moins un règlement, mais il reste dû.
9. **En attente de paiement** — rien reçu, rien d'anormal.

## La tolérance : 5 centimes, partout

`TOLERANCE_CENTIMES = 5` — la valeur historique des RPC d'encaissement, désormais
unique. En dessous de 5 centimes d'écart, le dossier est soldé. Avant : une adhésion à
210,00 € réglée 209,97 € était « payée » pour l'encaissement et « impayée, reste
0,03 € » pour les relances. Plus maintenant.

## Ce que veut dire un montant

Tous les montants sont des **entiers en centimes**, en base comme en logique. Les
remboursements sont des règlements **négatifs** (mode `remboursement`) : la somme des
règlements est toujours le net réellement encaissé. « Trésorerie » = somme nette des
règlements de la saison — jamais la somme des montants dus.

## Priorité des événements Stripe

- Deux livraisons du même événement : la première écrit, les suivantes ne font rien
  (`stripe_events` + unicité `stripe_ref`). Vérifié à 10 rejeux et en simultané.
- Remboursement reçu avant le règlement (livraison dans le désordre) : le dossier est
  « remboursé » — un remboursement acté ne redevient jamais « payé » sans un geste
  explicite du club.
- Rejet d'échéance après un paiement réussi : le rejet pose « en retard » ; le solde
  réel reste celui des règlements.
- Litige fermé : `litige_le` est levé, le statut n'est PAS recalculé automatiquement —
  le club décide (choix assumé, hérité du webhook existant).
- Événement inconnu : acquitté sans écriture. Signature invalide ou trop vieille
  (300 s) : refusé en 400, jamais rejoué.

## Qui voit quoi

- **Président, trésorier** : tout le volet financier (règlements, litiges, relances,
  remises, virements, export CSV).
- **Secrétaire** : le statut administratif du dossier (badge), jamais les règlements —
  l'écran le dit au lieu d'afficher un zéro trompeur.
- **Encadrant** : l'état opérationnel au contrôle (peut entrer / prévenir), aucun
  montant.
- **Lecture seule** : lecture, aucune écriture.
- **Adhérent** : son propre dossier, son échéancier, son reçu.

## Table de cohérence — mesurée sur klubster-dev le 03/08/2026 (fixtures `@lot-e`)

| Situation (fixture) | Cockpit (compteurs) | Fiche adhérent | Trésorerie | Relances | Espace adhérent |
| --- | --- | --- | --- | --- | --- |
| Réglé à 3 c près (210,00 / 209,97) | compté « payé » | « Soldé » (tolérance) | absent des impayés | **absent** (avant : « reste 0,03 € ») | « Payé » |
| Chèque partiel (50 / 99 €) | compté « en attente » | « Reste 49,00 € » | listé, solde 49,00 € | listé, 49,00 € | « En attente » |
| Impayé **sans mode de paiement** | compté « en attente » | « Reste 120,00 € » | **listé** (avant : invisible) | listé | « En attente » |
| Retard constaté | compté « en retard » | badge « En retard » | listé « EN RETARD » | listé | « En retard » |
| Remboursé (18000 puis −18000) | plus compté « payé » | badge « Remboursé », net 0 | ligne « Remboursements » | absent | « Remboursé » |
| Litige ouvert | compté « en retard » | bloc litige + badge | volet litiges | — | « En retard » |

Chaque rôle voit sa part : le trésorier agit, le secrétaire lit le badge et la fiche
lui DIT pourquoi les règlements sont absents, l'encadrant et la lecture seule sont
refusés par la base (RLS `0026` + RPC), pas seulement par l'interface — vérifié par
requêtes directes (PostgREST) avec les JWT de chaque rôle, y compris l'écriture
(403) et le cross-tenant (« Non autorisé »).

## Limites

- L'échéancier Stripe (mensualités) n'a pas d'écran capturable sur la base de
  développement : aucun compte Stripe connecté. La répartition des montants
  (`repartirMensualites`) et la planification (`planifierEcheances`) restent
  couvertes par les tests unitaires existants et nouveaux.
- Les webhooks ont été prouvés de bout en bout (signature HMAC valide / invalide /
  périmée, idempotence à 10 rejeux) sur un événement de plateforme ; les écritures
  des événements de comptes connectés sont prouvées au niveau RPC (rejeux, ordre
  inversé, simultanéité) — pas via un POST connecté complet, faute de compte.
- Poste de développement : si le même secret webhook sert de « test » et de
  « live », un événement `livemode:false` est refusé (contrôle de concordance des
  modes) — poser un `STRIPE_WEBHOOK_SECRET_TEST` distinct.
