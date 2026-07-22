# Emails Klubster — bilan et propositions

*21 juillet 2026. État réel du code, puis propositions. Rien n'est encore implémenté : c'est une base de décision.*

---

## 1. Ce qui part aujourd'hui

Tous les emails sont en **texte brut**, expédiés via Resend depuis `inscriptions@klubster.fr` (ou `clubs@klubster.fr` pour la messagerie de groupe), avec le club en `reply-to`. Le domaine klubster.fr est authentifié (SPF, DKIM, DMARC), donc la délivrabilité est bonne.

### Pour l'adhérent

| Email | Déclencheur | Auto / manuel |
|---|---|---|
| Confirmation d'inscription | Il s'inscrit | **Auto** |
| Liste d'attente | Il s'inscrit sur un cours complet | **Auto** |
| Une place s'est libérée | Le club libère une place | **Auto** |
| Prélèvement (échéance) refusé | Sa banque rejette une mensualité | **Auto** (webhook) |
| Relance impayé (montant restant) | Le président clique « Relancer » | **Manuel** |
| Confirmez votre email / mot de passe oublié | Création de compte, réinitialisation | **Auto** (Supabase) |

### Pour le club (bénévoles)

| Email | Déclencheur | Auto / manuel |
|---|---|---|
| Nouvelle inscription | Un adhérent s'inscrit | **Auto** |
| Liste d'attente (côté club) | Inscription sur un cours complet | **Auto** |
| Échéance rejetée | Mensualité d'un adhérent refusée | **Auto** (webhook) |
| Litige bancaire | Un adhérent conteste un paiement | **Auto** (webhook) |
| « Votre club est en ligne » | Création du club | **Auto** |
| Message aux adhérents | Le club l'écrit lui-même | **Manuel** |

### L'abonnement Klubster lui-même

Les emails liés à l'abonnement du club (fin d'essai, carte à enregistrer, facture, échec de prélèvement de l'abonnement) sont **envoyés par Stripe**, pas par Klubster. C'est robuste, mais le ton n'est pas le nôtre et tu ne les contrôles pas.

---

## 2. Ce qui manque, et les risques

1. **Aucune aide à l'installation de l'app (PWA).** Rien sur le site ni dans les emails n'explique comment ajouter le club à l'écran d'accueil. C'est pourtant le geste qui transforme un site en « app ».
2. **La relance d'impayé est entièrement manuelle.** Si le président n'y pense pas, personne n'est relancé. Tu veux justement des relances « quand c'est nécessaire » — aujourd'hui elles dépendent d'un clic.
3. **Aucun rappel de dossier incomplet.** Les pièces manquantes (certificat médical, photo) sont suivies dans le cockpit, mais l'adhérent n'est jamais relancé automatiquement pour les déposer.
4. **Aucun rappel avant un prélèvement d'échéance.** L'adhérent découvre le débit sans préavis — source d'incompréhension et de litiges.
5. **Le bénévole ajouté à l'équipe ne reçoit rien.** Pas d'email « vous avez été ajouté au club X, voici votre accès ».
6. **Pas de garde-fou anti-harcèlement formalisé.** Le seul frein existant est l'horodatage de la dernière relance manuelle. Il n'y a pas de règle « pas plus de N emails par semaine et par personne ».

---

## 3. Principe directeur : deux familles d'emails

Pour ne jamais harceler, il faut séparer nettement :

**Transactionnel** — déclenché par une action de la personne, toujours attendu, jamais ressenti comme du spam : confirmation d'inscription, reçu, réinitialisation de mot de passe, place libérée. **Aucune limite de fréquence** : ils sont toujours légitimes.

**Cycle de vie / relance** — déclenché par Klubster, pas par la personne : rappel de pièce manquante, rappel avant prélèvement, relance d'impayé. Ce sont ceux qui peuvent agacer. Ils doivent obéir à trois règles :

- **Plafond** : au maximum **un email de relance tous les 7 jours** par adhérent, tous motifs confondus.
- **Escalade limitée** : une relance d'impayé se répète au plus **3 fois** (J+7, J+21, J+45), puis s'arrête — le relais devient humain (le club appelle).
- **Sortie claire** : dès que le motif disparaît (pièce déposée, cotisation réglée), la relance cesse immédiatement.

Un email transactionnel ne compte jamais dans le plafond ; une relance, si.

---

## 4. Proposition — emails ADHÉRENTS

| # | Email | Quand | Famille | Priorité |
|---|---|---|---|---|
| A1 | **Installer l'app du club** | Juste après l'inscription (email dédié ou bloc dans la confirmation) | Transactionnel | Haute |
| A2 | **Bienvenue + accès à l'espace** | Inscription (existe déjà, à enrichir : lien espace, pièces à fournir, install app) | Transactionnel | — (améliorer) |
| A3 | **Il vous manque une pièce** | 3 jours après inscription si une pièce obligatoire manque, puis rappel unique à J+10 | Relance | Haute |
| A4 | **Rappel avant prélèvement** | 3 jours avant une échéance mensuelle | Transactionnel | Moyenne |
| A5 | **Prélèvement refusé** | Échec d'échéance (existe déjà) | Transactionnel | — |
| A6 | **Relance de cotisation** | Impayé : J+7, J+21, J+45 (auto, plafonné) — remplace le clic manuel | Relance | Haute |
| A7 | **Reçu de paiement** | Paiement encaissé (aujourd'hui c'est Stripe qui l'envoie, à uniformiser au ton du club) | Transactionnel | Basse |
| A8 | **Réduction validée / refusée** | Le club statue sur une remise demandée (Pass'Sport…) | Transactionnel | Moyenne |

**Ce qu'on NE fait pas** : pas de newsletter automatique, pas d'email « à bientôt », pas de relance d'inscription à répétition. La communication éditoriale reste à l'initiative du club (messagerie manuelle existante).

---

## 5. Proposition — emails BÉNÉVOLES / CLUB

| # | Email | Quand | Famille | Priorité |
|---|---|---|---|---|
| B1 | **Vous avez été ajouté à l'équipe** | Un président ajoute un bénévole (avec son rôle et le lien cockpit) | Transactionnel | Haute |
| B2 | **Installer le cockpit sur le téléphone** | Ajout à l'équipe ou première connexion | Transactionnel | Haute |
| B3 | **Nouvelle inscription** | Un adhérent s'inscrit (existe déjà) | Transactionnel | — |
| B4 | **Récap hebdomadaire** | Lundi matin : N inscriptions, M impayés, dossiers en attente — **un seul email/semaine**, désactivable | Cycle de vie | Moyenne |
| B5 | **Échéance rejetée / litige** | Problème de paiement d'un adhérent (existe déjà) | Transactionnel | — |
| B6 | **Fin d'essai approche** | J-5 avant la fin du mois offert, ton Klubster (aujourd'hui c'est Stripe) | Cycle de vie | Moyenne |

Le **récap hebdomadaire (B4)** est le seul email « poussé » régulier vers le club. Un par semaine, le lundi, résumant ce qui demande une action — jamais quotidien. Désactivable en un clic.

---

## 6. Installation de l'app (PWA) — le concret

Deux points d'entrée, plus un email :

- **Sur le site du club** : un lien discret « Installer l'app » (ou un bandeau au premier passage sur l'espace adhérent) qui ouvre un guide court, adapté à l'appareil : sur iPhone « Partager → Sur l'écran d'accueil », sur Android « le menu ⋮ → Installer l'application ». Un guide, pas une pop-up agressive.
- **À l'inscription** : un bloc dans l'email de confirmation (A1/A2) « Retrouvez votre carte de membre d'un tap : installez l'app » avec le lien vers le guide.
- **Pour le bénévole** : même chose dans l'email d'ajout à l'équipe (B2), pointant vers le cockpit.

Le guide peut être une page simple `/[club]/installer` qui détecte l'appareil et montre les 2-3 étapes avec une capture. Léger, sans dépendance.

---

## 7. Format : rester en texte, ou passer à un HTML léger ?

Aujourd'hui tout est en texte brut. C'est sobre, rapide, et ça passe partout — mais un email de confirmation ou d'installation gagnerait à porter le nom et la couleur du club.

**Recommandation** : garder le texte brut pour les relances et notifications courtes (efficace, jamais ressenti comme du marketing), et introduire **un gabarit HTML léger** (logo/nom du club, un bouton, un pied de page Klubster) pour trois emails à fort impact : bienvenue/installation (A1-A2), ajout à l'équipe (B1), récap hebdo (B4). Un seul gabarit réutilisable, aux couleurs du club, cohérent avec les emails Supabase déjà brandés.

---

## 8. Ordre que je propose

**D'abord (avant la campagne cold email, car ça touche l'expérience des premiers vrais adhérents)**
1. A6 — relance d'impayé automatique et plafonnée (remplace le clic manuel).
2. A3 — rappel de pièce manquante.
3. A1/A2 + guide d'installation PWA sur le site et dans l'email.
4. B1/B2 — email d'ajout d'un bénévole à l'équipe + installation du cockpit.

**Ensuite**
5. A4 — rappel avant prélèvement.
6. B4 — récap hebdomadaire du club.
7. Gabarit HTML léger pour les 3 emails à fort impact.
8. A8, B6 — remise validée, fin d'essai au ton Klubster.

**Socle technique commun à créer une fois** : une petite table de journal des envois (qui, quel motif, quand) pour faire respecter le plafond « une relance / 7 jours » et éviter les doublons — c'est elle qui garantit qu'on ne harcèle personne. Les relances automatiques (A3, A6, A4, B4) tourneront via une tâche planifiée quotidienne.

---

Dis-moi ce que tu retiens, et dans quel ordre tu veux que je l'implémente. Je peux commencer par le bloc « avant campagne » (1 à 4), qui est celui qui compte pour tes premiers clubs.
