# Registre des activités de traitement — Klubster

**Responsable / éditeur :** Mathieu Bourdieu (entrepreneur individuel) — 652 chemin de Foumezous, 82370 Corbarieu — contact@klubster.fr — SIRET 795 109 198 00023
**Dernière mise à jour :** 30 juin 2026
**DPO / contact RGPD :** contact@klubster.fr (désignation d'un DPO à anticiper avec la montée en charge des traitements de santé/mineurs)

> Document interne de conformité (art. 30 RGPD). À tenir à jour à chaque évolution des traitements ou des sous-traitants. À faire relire par un conseil RGPD.

Klubster intervient sous **deux qualités** :
- **Responsable de traitement** (art. 30.1) — comptes dirigeants, facturation, sécurité de la plateforme.
- **Sous-traitant** (art. 30.2) — gestion des données des adhérents pour le compte de chaque club, qui en est le responsable.

---

## Partie A — Traitements dont Klubster est responsable (art. 30.1)

### A1. Comptes des dirigeants & authentification
- **Finalité :** créer et sécuriser l'accès des présidents/dirigeants à leur espace.
- **Base légale :** exécution du contrat (CGV).
- **Personnes concernées :** dirigeants d'associations clientes.
- **Données :** nom, prénom, email, mot de passe (haché), identifiant de connexion, journaux techniques.
- **Destinataires :** Klubster ; sous-traitants techniques (Supabase, Vercel).
- **Transferts hors UE :** non (hébergement UE).
- **Durée :** durée du compte + 12 mois, puis suppression.
- **Sécurité :** mots de passe hachés (Supabase Auth), HTTPS, RLS, journalisation.

### A2. Facturation des abonnements
- **Finalité :** facturer l'abonnement (Starter/Club/Club+).
- **Base légale :** obligation légale (comptable) + contrat.
- **Personnes concernées :** clubs clients / leurs représentants.
- **Données :** identité de facturation, offre, montants, historique de paiement (via Stripe).
- **Destinataires :** Klubster ; Stripe (paiement).
- **Transferts hors UE :** Stripe — garanties appropriées (clauses contractuelles types / DPF).
- **Durée :** durée légale de conservation comptable (10 ans pour les pièces).
- **Sécurité :** aucune donnée bancaire stockée par Klubster (gérée par Stripe, PCI-DSS).

### A3. Sécurité, prévention des abus, support
- **Finalité :** garantir la sécurité, diagnostiquer les incidents, répondre au support.
- **Base légale :** intérêt légitime.
- **Données :** journaux de connexion, adresses IP, métadonnées techniques, échanges de support.
- **Durée :** 6 à 12 mois pour les journaux.

---

## Partie B — Traitements réalisés pour le compte des clubs (art. 30.2 — Klubster sous-traitant)

> Chaque **club** est responsable de traitement ; Klubster agit sur ses instructions (voir DPA `/sous-traitance`).

### B1. Gestion des adhérents et des inscriptions
- **Catégories de traitement :** collecte, hébergement, organisation, consultation, conservation, suppression.
- **Personnes concernées :** adhérents, représentants légaux de mineurs.
- **Données :** identité, contact, date de naissance, cours, statut de paiement, pièces justificatives, champs de formulaire définis par le club.
- **Sous-traitants ultérieurs :** Supabase/AWS (UE), Vercel, Stripe.
- **Transferts hors UE :** non (données UE) ; Stripe sous garanties appropriées.
- **Durée :** définie par le club ; par défaut, durée de l'adhésion + archivage limité puis suppression.

### B2. Questionnaire de santé (catégorie particulière — art. 9)
- **Finalité :** attester de l'aptitude à la pratique (remplacement du certificat médical).
- **Base légale :** consentement explicite (art. 9.2.a) ; pour un mineur, consentement du titulaire de l'autorité parentale. L'intérêt légitime n'est pas une base valable pour l'art. 9.
- **Données réellement conservées :** **uniquement le résultat** (attestation négative / certificat requis), la **signature** et la **date**. **Le détail des réponses n'est ni transmis ni stocké** (minimisation).
- **Personnes concernées :** adhérents (dont mineurs) ; signature du représentant légal pour les mineurs.
- **Durée :** la saison concernée, puis suppression.
- **Mesures spécifiques :** minimisation, cloisonnement par club (RLS), chiffrement au repos et en transit, accès restreint au club, AIPD réalisée (voir `aipd-questionnaire-sante.md`).

### B3. Présence / émargement
- **Finalité :** appel et suivi de présence (scanner QR).
- **Données :** identifiant adhérent, date de présence.
- **Durée :** saison en cours.

### B4. Journal des emails automatiques
- **Finalité :** éviter les envois en double et faire respecter le plafond anti-harcèlement (une relance / 7 j).
- **Base légale :** intérêt légitime (bonne gestion des communications, protection contre le harcèlement).
- **Données :** identifiant du club, identifiant de l'adhérent, adresse destinataire, motif, statut d'envoi, horodatage.
- **Durée de conservation :** **13 mois** (une saison pleine + marge), puis purge automatique (`purger_emails_journal`, tâche quotidienne). L'adresse est par ailleurs effacée immédiatement à l'exercice du droit à l'effacement de l'adhérent.

---

## Sous-traitants ultérieurs (récapitulatif)

| Sous-traitant | Rôle | Localisation des données | Garanties |
|---|---|---|---|
| Supabase (sur AWS) | Base de données, authentification, stockage | Union européenne (Irlande, eu-west-1) | Hébergement UE, DPA Supabase |
| Vercel | Hébergement applicatif, fonctions serveur | Fonctions forcées en Europe (Paris, cdg1) | DPA Vercel |
| Stripe | Paiements | UE / international | Clauses contractuelles types / DPF, PCI-DSS |

## Mesures de sécurité transverses
Cloisonnement multi-tenant par `organisation_id` + Row Level Security ; fonctions privilégiées `SECURITY DEFINER` validant l'appartenance ; HTTPS ; chiffrement au repos (Supabase) ; sauvegardes ; journalisation ; procédure de notification de violation sous 72 h.

## Habilitations internes au club — modèle d'accès aux dossiers adhérents

**Décision assumée (22/07/2026, M. Bourdieu), à la suite du 4e audit de sécurité.**

Au sein d'un même club, l'équipe est composée de **bénévoles nommément habilités par le président** (fonction « équipe » du cockpit). Les rôles et leurs droits d'**écriture** sont cloisonnés en base (RLS par rôle) :

| Rôle | Écriture |
|---|---|
| Président (`admin_asso`) | Tout, y compris équipe et abonnement |
| Trésorier | Paiements, encaissements, remises |
| Secrétaire | Adhérents, dossiers, pièces, santé, messages, site |
| Encadrant | Contrôle au scan, présences |
| Lecture seule | Aucune |

Les **données sensibles réglementées** font l'objet d'un cloisonnement de **lecture** spécifique, plus strict :
- **questionnaires de santé** (art. 9) et **pièces justificatives** : lecture réservée au **président et au secrétaire** — jamais au trésorier, à l'encadrant ni au rôle lecture seule (RLS `qs_read_org`, `pieces_read_role`).

Pour les **autres champs du dossier adhérent** (identité, coordonnées, date de naissance, adresse, responsable légal, contact d'urgence, informations administratives), la **lecture est ouverte à l'ensemble de l'équipe habilitée du club**. Ce choix est **assumé et documenté** au titre de l'art. 5.1.c (minimisation) : au sein d'une association, ces informations sont nécessaires à la vie courante du club (convocations, licences, sécurité des mineurs, contact en cas d'urgence pendant l'entraînement), et l'accès est déjà limité aux seuls bénévoles que le président a explicitement habilités, cloisonné par club, journalisé, et révocable à tout moment. Une segmentation colonne-par-colonne plus fine (encadrant limité à identité + présence, trésorier à identité + situation de paiement) reste une **évolution possible** si un club le demande ou si le volume d'équipes le justifie, mais n'est pas retenue comme mesure obligatoire à ce stade.

**Base de la décision :** l'audit externe a explicitement qualifié ce point de non bloquant « si cette organisation est assumée et documentée » — ce que fait la présente section.
