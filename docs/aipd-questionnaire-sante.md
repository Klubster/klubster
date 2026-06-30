# Analyse d'impact relative à la protection des données (AIPD)
## Traitement : questionnaire de santé & données d'adhérents mineurs — Klubster

**Responsable du document :** Mathieu Bourdieu (EI) — contact@klubster.fr — SIRET 795 109 198 00023
**Date :** 30 juin 2026 — **Version :** 1.1 (à réviser annuellement ou à chaque évolution majeure)

> Modèle d'AIPD (art. 35 RGPD) suivant la méthode CNIL. À compléter et à faire valider par un conseil RGPD / DPO. L'AIPD est requise ici car le traitement combine **données de santé (art. 9)** et **personnes vulnérables (mineurs)**, à grande échelle.

> **Journal des modifications v1.0 → v1.1**
> 1. **Base légale** corrigée : suppression de l'« intérêt légitime » (non valable pour l'art. 9) → consentement explicite art. 9.2.a, donné par le représentant légal pour un mineur.
> 2. **DPO** requalifié de « à évaluer » en désignation **potentiellement obligatoire dès maintenant** (art. 37.1.c) — à trancher avec le conseil RGPD.
> 3. **Notification de violation** : distinction des rôles club (72 h → CNIL, art. 33.1) et Klubster sous-traitant (alerte au club sans délai injustifié, art. 33.2).
> 4. **Sous-traitants ultérieurs** : ajout des DPA Klubster↔Supabase/AWS et Klubster↔Vercel, autorisation des clubs (art. 28.2/28.4) et vérification des clauses contractuelles types (sociétés US).
> 5. **Purge automatique** maintenue en priorité haute, avec définition précise de « la saison » (date de suppression opposable).

---

## 1. Description du traitement

**Finalité.** Permettre à un club de recueillir, lors de l'inscription, l'attestation d'aptitude d'un adhérent via un questionnaire de santé auto-déclaré (qui remplace le certificat médical, loi du 2 mars 2022), signé électroniquement.

**Nature.** L'adhérent (ou son représentant légal pour un mineur) répond au questionnaire dans le navigateur, signe au doigt sur l'écran, et le système enregistre **uniquement** : le type (majeur/mineur), le **résultat** (attestation négative / certificat requis), la signature (image), la qualité du signataire et la date.

**Périmètre.** Multi-tenant : chaque club est responsable de traitement ; Klubster est sous-traitant.

**Données traitées.**
| Donnée | Catégorie | Conservée ? |
|---|---|---|
| Détail des réponses santé | Santé (art. 9) | **Non** — ni transmise ni stockée (minimisation) |
| Résultat (négatif / certificat requis) | Santé (déduction, art. 9) | Oui |
| Date de naissance, type majeur/mineur | Ordinaire | Oui |
| Signature manuscrite (image) | Donnée personnelle ordinaire | Oui |
| Nom du signataire / représentant légal | Ordinaire | Oui |

> **Note sur la signature.** L'image d'une signature manuscrite **n'est pas une donnée biométrique au sens de l'art. 9** tant qu'elle n'est pas traitée par un dispositif technique d'identification unique de la personne. Sa qualification en donnée ordinaire est donc correcte. À ne **pas** faire évoluer vers un traitement de reconnaissance/authentification de signature sans réviser cette AIPD.

**Durée de conservation.** La saison concernée, puis suppression (voir définition opposable en §5).

**Destinataires.** Le club concerné uniquement. Sous-traitants ultérieurs : Supabase/AWS (UE), Vercel (UE).

---

## 2. Nécessité et proportionnalité

- **Base légale.** Le résultat conservé est une **donnée de santé déduite (art. 9)**. La levée de l'interdiction de l'art. 9 repose sur le **consentement explicite de la personne concernée (art. 9.2.a)**.
  - Pour un **mineur**, ce consentement est donné par le **titulaire de l'autorité parentale**, et non par le mineur lui-même.
  - L'**intérêt légitime n'est pas une condition valable pour l'art. 9** : il ne peut fonder que la licéité « ordinaire » (art. 6) et n'autorise pas, à lui seul, le traitement d'une donnée sensible. Il n'est donc **pas** retenu comme base ici.
- **Minimisation.** Le club n'a pas besoin de connaître l'état de santé détaillé : seul le **résultat** lui est nécessaire. Le détail des réponses n'est donc jamais conservé. ✔
- **Exactitude.** Déclaration sur l'honneur datée et signée.
- **Durée limitée.** Suppression en fin de saison, selon critère daté et opposable (§5). ✔
- **Information des personnes.** Politique de confidentialité + mention au moment du recueil ; information adaptée lorsque le signataire est le représentant légal d'un mineur.
- **Droits.** Accès/rectification/effacement via le club (responsable) ; Klubster assiste (art. 28.3.e).

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
- **Cloisonnement multi-tenant** : Row Level Security par `organisation_id` ; lecture réservée au club et à l'adhérent concerné.
- **Écriture via fonction `SECURITY DEFINER`** validant le rattachement à l'adhésion.
- **Chiffrement** en transit (HTTPS) et au repos (Supabase).
- **Hébergement UE** (Supabase/AWS Irlande) ; fonctions serveur forcées en Europe (Vercel Paris).
- **Authentification** gérée par Supabase (mots de passe hachés).
- **Consentement explicite** (art. 9.2.a) + signature datée.
- **Durée de conservation limitée** à la saison.

---

## 5. Mesures complémentaires (plan d'action)

| Action | Priorité | Échéance | Statut |
|---|---|---|---|
| **Purge automatique** des attestations en fin de saison — critère opposable : suppression de toute attestation créée **avant le 1er septembre courant** (réalise le « 31/08 » sans toucher la saison en cours). Fonction `purger_questionnaires_sante()` + tâche `pg_cron` quotidienne (03:00 UTC). | Haute | — | **Fait** |
| Journalisation des accès aux attestations de santé | Moyenne | — | À faire |
| Restreindre l'affichage de la signature au strict nécessaire | Moyenne | — | À faire |
| **Désignation d'un DPO** — *probablement obligatoire* : Klubster, sous-traitant, réalise à titre principal un traitement à grande échelle de données de l'art. 9 (santé) concernant des mineurs (art. 37.1.c). À **confirmer/trancher avec le conseil RGPD**, indépendamment du volume. | Haute | À confirmer sans tarder | **À trancher** |
| DPA club↔Klubster (case à l'inscription) | Haute | — | **Fait** |
| **DPA sous-traitants ultérieurs** Klubster↔Supabase/AWS et Klubster↔Vercel (art. 28.4) | Haute | — | À vérifier / signer |
| **Autorisation des clubs** pour le recours aux sous-traitants ultérieurs (art. 28.2) + information en cas de changement | Haute | — | À formaliser |
| **Transferts hors UE** : vérifier que les DPA Supabase/Vercel (sociétés US, hébergement UE) couvrent l'absence d'accès US et, le cas échéant, intègrent les **clauses contractuelles types** | Haute | — | À vérifier |
| **Procédure de notification de violation** — distinguer les rôles : le **club** notifie la CNIL sous **72 h** (art. 33.1) ; **Klubster** (sous-traitant) **alerte le club sans délai injustifié** (art. 33.2). Klubster ne notifie pas la CNIL directement. | Haute | — | À formaliser |
| Revue annuelle de la présente AIPD | Moyenne | Annuelle | Planifiée |

---

## 6. Avis et validation

- **Avis du DPO :** [à recueillir — désignation à trancher, voir §5].
- **Position des personnes concernées :** information via la politique de confidentialité ; recueil du consentement à l'inscription (par le représentant légal pour un mineur).
- **Validation du responsable :** Mathieu Bourdieu — date : __________ — signature : __________

**Conclusion provisoire.** Sous réserve (i) de la mise en œuvre des mesures complémentaires (purge automatique opposable, journalisation, procédure de violation), (ii) de la régularisation des **DPA sous-traitants ultérieurs et autorisations** associées, (iii) de la décision sur la **désignation d'un DPO**, et (iv) d'une **relecture juridique**, le niveau de risque résiduel est jugé acceptable. À réévaluer avant tout changement majeur (nouvelle finalité, nouveau sous-traitant, transfert hors UE, évolution du traitement de la signature).
