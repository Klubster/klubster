# Règle des communications — nécessaire ou facultatif

Écrit le 04/08/2026, à la clôture du lot K. Ce document dit **ce que le code fait**,
pas ce que le droit exige : il n'y a ici aucune conclusion juridique, seulement la
description d'un comportement et de ses limites connues.

## Deux familles de messages, deux traitements

**Messages NÉCESSAIRES à l'exécution de l'adhésion.** Ils partent toujours.

| Message | Origine | Concerné par l'opposition ? |
| --- | --- | --- |
| Relance « une pièce manque » (J+30/60/90) | cron `/api/cron/relances` | non |
| Relance de cotisation (J+7/21/45) | cron `/api/cron/relances` | non |
| Relance d'échéance rejetée | cron `/api/cron/relances` | non |
| Confirmation d'inscription, reçu | parcours d'inscription | non |
| Ciblage « dossiers incomplets » | écran Communication | **non** — c'est de la gestion de dossier |

**Communications FACULTATIVES.** Elles s'arrêtent sur opposition.

| Message | Origine | Concerné par l'opposition ? |
| --- | --- | --- |
| Ciblage « tous les adhérents » | écran Communication | oui |
| Ciblage « parents » | écran Communication | oui |
| Ciblage « un cours » | écran Communication | oui |

## Comment l'opposition est enregistrée

`adherents.opposition_communications` — une **date**, pas un booléen : la date *est*
la traçabilité (« il s'est opposé le 4 août »). `null` = pas d'opposition.

- Posée et levée depuis la fiche de l'adhérent, section **Communications**, réservée
  aux rôles disposant de `adherents_ecriture` (président, secrétaire) ;
  migration `20260804150000`, grant par colonne, action serveur `basculerOppositionCommunications`.
- Appliquée **à un seul endroit** : `src/lib/ciblage.ts`, la source unique du ciblage
  que consomment le compteur affiché, l'aperçu et l'envoi. Un écart entre « annoncé »
  et « envoyé » reste structurellement impossible.
- Le cron de relances **ne lit pas cette colonne**, à dessein. Une sentinelle de test
  (`tests/ciblage.test.ts`) tombe si quelqu'un l'y ajoute.

**Il n'existe volontairement pas d'interrupteur global « plus aucun email ».** Un tel
réglage laisserait croire au bureau qu'il a coupé tout envoi alors que les relances
continueraient — ou, s'il coupait tout, priverait l'adhérent des messages dont il a
besoin pour compléter son dossier. La distinction est la règle.

## Limites connues, assumées

1. **Un seul responsable légal par adhérent.** L'adresse du représentant légal est
   lue dans `infos["Responsable légal — email"]` : une seule case, donc un seul
   destinataire. Une famille en garde alternée où les deux parents veulent recevoir
   les messages n'est **pas** couverte : le club doit choisir une adresse, ou en
   saisir une partagée. Aucune refonte du modèle familial n'a été entreprise pour ce
   lot — c'est un choix, pas un oubli.
2. **L'opposition est portée par l'adhérent, pas par l'adresse.** Un parent qui a deux
   enfants au club et s'oppose « pour l'un » reste destinataire au titre de l'autre.
   Pour couper réellement, il faut enregistrer l'opposition sur chaque enfant. C'est
   visible à l'écran (l'opposition est affichée sur la fiche de chaque adhérent) et
   testé (`tests/ciblage.test.ts`).
3. **Les statuts d'acheminement ne mesurent pas la lecture.** « Accepté » = pris en
   charge par Resend ; « distribué » = accepté par le serveur du destinataire. Ni l'un
   ni l'autre ne prouve la lecture, ni l'arrivée en boîte principale. Klubster ne
   mesure ni les ouvertures ni les clics (pas de pixel de traçage) — voir
   `docs/audit-messages-2026-07-30.md`.
4. **Aucune désinscription en un clic depuis l'email.** L'opposition passe aujourd'hui
   par une demande à son club, que le bureau enregistre. Un lien de désinscription
   autonome n'est pas développé.

## Statuts d'acheminement (webhook Resend)

Signature Svix vérifiée sur le corps brut, fenêtre de 5 minutes, idempotence par
`svix-id` (bail atomique `claim_resend_event`). Le statut visible est dérivé **par
gravité décroissante** : plainte > rejet > échec > supprimé > distribué > retardé >
accepté. Un `delivered` arrivant après un `bounced` ne peut donc pas faire régresser
la ligne. Un `email_id` inconnu (relance, email transactionnel) est ignoré sans erreur.
