# Analyse d'impact relative à la protection des données (AIPD)
## Traitement : questionnaire de santé & données d'adhérents mineurs — Klubster

**Responsable du document :** Mathieu Bourdieu (EI) — contact@klubster.fr — SIRET 795 109 198 00023
**Date :** 30 juin 2026 — **Version :** 1.0 (à réviser annuellement ou à chaque évolution majeure)

> Modèle d'AIPD (art. 35 RGPD) suivant la méthode CNIL. À compléter et à faire valider par un conseil RGPD / DPO. L'AIPD est requise ici car le traitement combine **données de santé (art. 9)** et **personnes vulnérables (mineurs)**, à grande échelle.

---

## 1. Description du traitement

**Finalité.** Permettre à un club de recueillir, lors de l'inscription, l'attestation d'aptitude d'un adhérent via un questionnaire de santé auto-déclaré (qui remplace le certificat médical, loi du 2 mars 2022), signé électroniquement.

**Nature.** L'adhérent (ou son représentant légal pour un mineur) répond au questionnaire dans le navigateur, signe au doigt sur l'écran, et le système enregistre **uniquement** : le type (majeur/mineur), le **résultat** (attestation négative / certificat requis), la signature (image), la qualité du signataire et la date.

**Périmètre.** Multi-tenant : chaque club est responsable de traitement ; Klubster est sous-traitant.

**Données traitées.**
| Donnée | Catégorie | Conservée ? |
|---|---|---|
| Détail des réponses santé | Santé (art. 9) | **Non** — ni transmise ni stockée (minimisation) |
| Résultat (négatif / certificat requis) | Santé (déduction) | Oui |
| Date de naissance, type majeur/mineur | Ordinaire | Oui |
| Signature manuscrite (image) | Donnée personnelle | Oui |
| Nom du signataire / représentant légal | Ordinaire | Oui |

**Durée de conservation.** La saison concernée, puis suppression.

**Destinataires.** Le club concerné uniquement. Sous-traitants ultérieurs : Supabase/AWS (UE), Vercel (UE).

---

## 2. Nécessité et proportionnalité

- **Base légale.** Consentement explicite (case « j'atteste sur l'honneur ») et/ou intérêt légitime du club pour l'admission.
- **Minimisation.** Le club n'a pas besoin de connaître l'état de santé détaillé : seul le **résultat** lui est nécessaire. Le détail des réponses n'est donc jamais conservé. ✔
- **Exactitude.** Déclaration sur l'honneur datée et signée.
- **Durée limitée.** Suppression en fin de saison. ✔
- **Information des personnes.** Politique de confidentialité + mention au moment du recueil.
- **Droits.** Accès/rectification/effacement via le club (responsable) ; Klubster assiste.

---

## 3. Risques (méthode CNIL : accès illégitime, modification non désirée, disparition)

| Risque | Sources | Impacts potentiels | Gravité | Vraisemblance |
|---|---|---|---|---|
| Accès illégitime aux données (dont signature, résultat) | Attaquant externe, erreur de cloisonnement, fuite d'identifiants | Atteinte à la vie privée d'un mineur, divulgation d'une donnée de santé | Importante | Limitée |
| Modification non désirée | Bug, accès indu | Attestation erronée, mauvaise décision d'admission | Limitée | Limitée |
| Disparition de données | Panne, suppression accidentelle | Perte de l'attestation, ré-inscription nécessaire | Négligeable | Limitée |

---

## 4. Mesures existantes

- **Minimisation forte** : détail des réponses santé jamais transmis ni stocké.
- **Cloisonnement multi-tenant** : Row Level Security par `organisation_id`; lecture réservée au club et à l'adhérent concerné.
- **Écriture via fonction `SECURITY DEFINER`** validant le rattachement à l'adhésion.
- **Chiffrement** en transit (HTTPS) et au repos (Supabase).
- **Hébergement UE** (Supabase/AWS Irlande) ; fonctions serveur forcées en Europe (Vercel Paris).
- **Authentification** gérée par Supabase (mots de passe hachés).
- **Consentement explicite** + signature datée.
- **Durée de conservation limitée** à la saison.

---

## 5. Mesures complémentaires (plan d'action)

| Action | Priorité | Échéance | Statut |
|---|---|---|---|
| Purge automatique des attestations en fin de saison | Haute | Avant la 1re fin de saison | À faire |
| Journalisation des accès aux attestations de santé | Moyenne | — | À faire |
| Restreindre l'affichage de la signature au strict nécessaire | Moyenne | — | À faire |
| Désignation d'un DPO si le volume croît | Moyenne | À la montée en charge | À évaluer |
| DPA signé par chaque club (case à l'inscription) | Haute | — | **Fait** |
| Procédure de notification de violation (72 h) | Haute | — | À formaliser |
| Revue annuelle de la présente AIPD | Moyenne | Annuelle | Planifiée |

---

## 6. Avis et validation

- **Avis du DPO :** [à recueillir — DPO non encore désigné].
- **Position des personnes concernées :** information via la politique de confidentialité ; recueil du consentement à l'inscription.
- **Validation du responsable :** Mathieu Bourdieu — date : __________ — signature : __________

**Conclusion provisoire.** Sous réserve de la mise en œuvre des mesures complémentaires (purge automatique, journalisation, procédure de violation) et d'une relecture juridique, le niveau de risque résiduel est jugé acceptable. À réévaluer avant tout changement majeur (nouvelle finalité, nouveau sous-traitant, transfert hors UE).
