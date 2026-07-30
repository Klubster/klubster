# Suivi des messages — audit préalable

**30 juillet 2026.** Audit demandé avant tout développement. Tout ce qui suit vient de la
lecture du code et de la documentation officielle de Resend, pas de suppositions.

---

## 1. Comment un message manuel part aujourd'hui

`src/app/[asso]/cockpit/communication/actions.ts` → `envoyerMessage(slug, groupe, objet, message)`.

Le chemin est sain sur l'essentiel :

- **permission `messages` exigée** (`verifierPermission`) — président et secrétaire uniquement
  (`src/lib/roles.ts:17,19`). Un trésorier, un encadrant ou un accès en lecture seule ne
  peuvent pas écrire au club ;
- **le ciblage est recalculé côté serveur** à partir de `organisation_id` — le navigateur
  n'envoie jamais de liste d'adresses ;
- **les doublons sont supprimés** (`Array.from(new Set(...))`, minuscules, trim) ;
- **un email par personne** : `to: [email]` individuellement, personne ne voit les autres ;
- objet plafonné à 150 caractères, corps à 10 000.

Quatre groupes : `tous`, `parents` (mineurs), `incomplet` (au moins une pièce non reçue),
ou un identifiant de cours.

## 2. Ce qui est enregistré aujourd'hui

**Rien.**

C'est le point central de cet audit. `envoyerAuxAdherents` (`src/lib/resend.ts:145-185`)
poste vers `POST /emails/batch` par lots de 100, puis :

```ts
if (!res.ok) { … return { ok: envoyes > 0, envoyes, erreur } }
envoyes += lot.length;
```

**La réponse de Resend est jetée.** Le corps n'est jamais lu, donc les identifiants
d'emails renvoyés par l'API ne sont ni capturés ni stockés. Aucune ligne n'est écrite en
base : ni campagne, ni destinataire, ni horodatage.

Deux conséquences :

1. **Aucun historique n'existe.** L'écran actuel ne peut rien afficher.
2. **`envoyes` est optimiste.** Il compte `lot.length` dès que le lot est accepté — c'est
   « accepté par l'API », pas « remis au destinataire ». Un lot de 100 accepté puis
   intégralement rejeté par les serveurs destinataires compterait quand même 100.

`emails_journal` n'est **pas** utilisé par ce chemin : il ne sert qu'aux relances
automatiques du cron.

## 3. Ce que Resend permet réellement de suivre

Événements disponibles par webhook, vérifiés dans la documentation officielle :

| Événement | Ce qu'il signifie | Utile ici |
|---|---|---|
| `email.sent` | La requête API a réussi | oui |
| `email.delivered` | Le serveur du destinataire a accepté | **oui — c'est la vraie preuve d'envoi** |
| `email.bounced` | Rejet **définitif** | **oui** |
| `email.delivery_delayed` | Problème temporaire (boîte pleine…) | oui |
| `email.failed` | Échec d'envoi (adresse invalide, quota, domaine) | **oui** |
| `email.complained` | Marqué comme indésirable | **oui — signal de délivrabilité** |
| `email.suppressed` | Adresse mise en liste de suppression | oui |
| `email.opened` | Ouverture | **voir §4** |
| `email.clicked` | Clic sur un lien | **voir §4** |

Tous ces événements exigent **un webhook** : rien n'est lisible autrement, et rien n'est
récupérable a posteriori pour les envois déjà partis.

**Prérequis absolu** : capturer l'identifiant d'email renvoyé par Resend à l'envoi. Sans
lui, aucun événement entrant ne peut être rattaché à un destinataire. C'est donc la
première chose à corriger dans `resend.ts`.

## 4. Ouvertures et clics — ma recommandation : **non**, pas en v1

### Comment ça marche techniquement

Documentation Resend : l'ouverture est mesurée par **un pixel GIF transparent de 1×1
inséré dans chaque email**. Le clic est mesuré en **réécrivant chaque lien** pour le faire
passer par un sous-domaine de traçage (`links.klubster.fr`), qui enregistre puis redirige.

### Quatre raisons de ne pas le faire maintenant

**1. C'est un accès en lecture au terminal du destinataire.** En droit français, cela
relève de l'**article 82 de la loi Informatique et Libertés** — le même que les cookies.
La CNIL considère les pixels de mesure d'ouverture comme nécessitant le **consentement
préalable**. Ce n'est pas un débat d'interprétation confortable.

**2. Les destinataires sont des adhérents, dont des mineurs.** Ils ont donné leur adresse
pour s'inscrire à un cours, pas pour être mesurés. Recueillir un consentement valable au
traçage auprès d'un parent qui veut connaître l'horaire du samedi est juridiquement
lourd et commercialement absurde.

**3. Le réglage est au niveau du domaine, pas du message.** C'est une option de
`klubster.fr` chez Resend : l'activer traçerait **tous** les emails de la plateforme —
confirmations d'inscription, signatures de questionnaire de santé, réinitialisations de
mot de passe. Il n'existe aucun moyen de l'activer pour les seuls messages de club.
À lui seul, ce point tranche.

**4. Le suivi des clics réécrit toutes les URL.** Les liens deviennent
`links.klubster.fr/...`. Sur un email d'association qui pointe vers le site du club,
c'est une dégradation visible pour le destinataire.

### Ce que je propose à la place

Les états **serveur à serveur**, qui n'accèdent à aucun terminal et ne posent donc aucune
question de consentement :

> **envoyé · distribué · rejeté · échoué · plainte**

C'est moins flatteur qu'un taux d'ouverture, et c'est plus utile : un président a besoin
de savoir *si le message est arrivé*, pas combien de personnes l'ont regardé.

**Conséquence sur la démonstration :** l'écran `/demo/messages` affiche aujourd'hui
« 141 ouvertures ». C'est un **écart P0** — une métrique que le produit ne fournira pas.
À remplacer par les états réels lors du réalignement.

## 5. Pourquoi ne pas réutiliser `emails_journal`

Modèle actuel : `organisation_id, adherent_id, destinataire, motif, envoye_le, statut,
lease_until, tentatives, provider_message_id, derniere_erreur, periode`, avec unicité sur
`(organisation_id, motif, periode)` et un mécanisme de réservation par bail.

Il est conçu pour **une autre chose** : garantir qu'une relance automatique ne part
qu'une fois par période, et empêcher deux exécutions du cron d'envoyer en double. Son
unicité par période est exactement ce qu'il ne faut pas pour une campagne manuelle — un
club peut vouloir écrire trois fois dans la même semaine.

Il possède déjà `provider_message_id`, mais aucun webhook ne l'exploite.

**Deux tables séparées**, donc, comme proposé. Les deux mécanismes partageront en
revanche le futur webhook Resend, qui pourra alimenter l'un comme l'autre.

## 6. Architecture retenue

### `message_campaigns`
`id`, `organisation_id`, `auteur_profile_id`, `objet`, `corps`, `groupe`,
`groupe_libelle`, `statut`, `nombre_destinataires`, `nombre_envoyes`,
`nombre_distribues`, `nombre_echecs`, `nombre_plaintes`, `created_at`, `completed_at`.

Statuts : `preparation` → `en_cours` → `envoye` | `partiel` | `echec`.

Pas de `nombre_ouverts` ni `nombre_cliques` : une colonne qu'on ne saura jamais remplir
honnêtement est une invitation à inventer une métrique plus tard.

### `message_recipients`
`id`, `campaign_id`, `organisation_id`, `adherent_id` (nullable, `on delete set null`),
`email`, `provider_message_id`, `statut`, `sent_at`, `delivered_at`, `bounced_at`,
`failed_at`, `complained_at`, `erreur`.

**Photographie au moment de l'envoi** : l'adresse est copiée dans la ligne. Si l'adhérent
est ensuite anonymisé ou supprimé, la campagne reste inspectable — mais l'email pourra
être effacé indépendamment au titre du droit à l'effacement, sans détruire les compteurs.

`organisation_id` est porté par les deux tables : un événement Resend ne peut jamais être
rattaché à un autre club que celui de la campagne d'origine.

**Idempotence** : unicité sur `provider_message_id`, et chaque transition d'état n'écrit
que si l'horodatage correspondant est encore nul. Un webhook rejoué ne peut pas
incrémenter deux fois.

### Webhook
`src/app/api/resend/webhook/route.ts` — signature Svix vérifiée, table d'événements
traités pour l'idempotence, sur le modèle éprouvé de `claim_stripe_event`.

---

## 7. Ce qui reste à trancher par Mathieu

Rien de bloquant : la consigne prévoyait explicitement le repli sur les états fiables si
les ouvertures posaient un problème de conformité. C'est le cas, je m'y tiens.

Un seul point à valider **avant la mise en production** : le webhook Resend doit être
déclaré dans le tableau de bord Resend, et son secret de signature posé en variable
d'environnement. Sans cela, les états resteront bloqués à « envoyé ».
