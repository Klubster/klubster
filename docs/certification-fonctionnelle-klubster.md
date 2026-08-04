# Certification fonctionnelle Klubster — contrat produit `/fonctionnalites`

Commencée le 04/08/2026. Chaque ligne n'obtient un statut qu'après avoir été
**réellement exercée sur `klubster-dev`** (navigateur sur build de production,
API avec les jetons de chaque rôle, SQL de contrôle) — jamais sur la seule
présence d'un bouton ni une lecture de code. Les captures citées vivent dans les
PR de chaque lot ; les parcours détaillés dans leurs corps de PR.

Statuts : `PROUVÉE` · `CORRIGÉE ET PROUVÉE` · `PARTIELLE — LIMITE AFFICHÉE` ·
`ABSENTE — À DÉVELOPPER` · `PROMESSE À REFORMULER`.

## Domaines certifiés au 04/08/2026

| Fonctionnalité | Promesse publique | Routes | Base/RPC/Storage | Rôles | Parcours | Mobile | Sécurité | PR | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Formulaire personnalisable (7 types de champs, obligatoire/facultatif, réorganisation) | « champs, pièces, activités et règles adaptées » | `/cockpit/formulaire` | `organisations.form_config` (jsonb) | site = président/secrétaire (action) | ajout, type liste + options, enregistrement, rechargement, persistance vérifiée en base | 390 ✓ | validation serveur ajoutée (libellés vides, options vides refusés avec message) | #20 | CORRIGÉE ET PROUVÉE |
| Modèles (sportive/culturelle) sans écrasement | implicite | idem | `formulaires-types.ts` | idem | config non vide → boutons modèles absents (vérifié) | — | — | — | PROUVÉE |
| Pièce par activité | « exigée que pour une activité » | formulaire + inscription | `Piece.cours_id`, filtre RPC | — | acquis (lot #14) + badge public | ✓ | — | — | PROUVÉE |
| **Pièce réservée aux mineurs** | « ou que pour les mineurs » | formulaire + inscription | `Piece.mineurs_seulement` + filtre dans `register_adherent_full` (minorité décidée par le serveur) | — | adulte inscrit → PAS d'« Autorisation parentale » ; mineur inscrit → pièce présente (SQL vérifié) | 390 ✓ | date de naissance seule source, jamais un champ posté | #20 | **ABSENTE → développée, CORRIGÉE ET PROUVÉE** |
| Questionnaire de santé signé en ligne | promis | inscription | `questionnaires_sante`, RPC transactionnelle | lecture : président/secrétaire/adhérent (RLS) | adulte 9 questions tout Non → `atteste_negatif` ; mineur 21 questions un Oui → `certificat_requis` + pièce « Certificat médical » créée ; signataire = représentant légal | 390 ✓ | **`reponses = {}` vérifié en base pour les deux** — le détail n'existe nulle part | — | PROUVÉE |
| Dossier reçu/incomplet, dépôt de documents | promis | espace + fiche | bucket `pieces`, `pieces_adherent` | matrice | dépôt adhérent → ✓ FOURNIE ; refus expliqué (faux PDF) | 390 ✓ | premiers octets, 5 Mo, chemin serveur | — | PROUVÉE |
| **Ajout de documents par un bénévole** | « ajoutés à son dossier par un bénévole » | fiche cockpit | `deposerPieceCockpit` | adherents_ecriture | faux PDF → « Fichier refusé » ; vrai PDF → « ✓ Pièce enregistrée » + lien Consulter | — | mêmes contrôles que l'adhérent ; > 4 Mo refusé AVANT envoi (le transport tuait la requête en 413 muet) | #21 | **ABSENTE → développée, CORRIGÉE ET PROUVÉE** |
| **Reçue par email** | statut prévu en base, promis par le vocabulaire produit | fiche + espace | `par_email` (contrainte d'origine) | idem | bouton « ✉ Par email » → affiché des deux côtés, réversible | — | — | #21 | **ABSENTE → développée, CORRIGÉE ET PROUVÉE** |
| **Permissions sur les pièces** | « visibles que par les personnes autorisées » | route signée + Storage | politique `pieces_admin_read` | président/secrétaire seulement | appels Storage directs : secrétaire 200 ; trésorier, encadrant, lecture, club B, anon → refus ; URL signée expirée → 400 | — | **la politique Storage ne suivait PAS la matrice** (tout membre du club lisait) → alignée | #21 | **CORRIGÉE ET PROUVÉE** |
| Remplacement d'une pièce par l'adhérent | « déposés par l'adhérent » | espace | nouvel objet à chaque dépôt | soi-même (RLS + politique member_rw) | fournie → bouton REMPLACER → nouvel objet | 390 ✓ | jamais d'écrasement | #21 | CORRIGÉE ET PROUVÉE |
| Carte de membre et QR | promis | `/espace` | QR = **identifiant seul**, SVG généré serveur | adhérent | carte affichée (club, nom, saison, QR) | 390 ✓ | ni santé, ni paiement, ni email, ni secret dans le QR ; QR modifié → « introuvable » ; autre club → refus (lot #18) | — | PROUVÉE |
| Mot de passe oublié | implicite | `/connexion` (mode oubli) | GoTrue reset | — | réponse constante anti-énumération | 390 ✓ | pas de fuite d'existence de compte | — | PROUVÉE |

## Limites honnêtes consignées

- **Renouvellement depuis l'espace adhérent : n'existe pas** (cockpit seulement).
  À afficher tel quel — pas promis par la page publique.
- **Nouvelle saison : le questionnaire de santé n'est pas redemandé** au
  renouvellement cockpit (aucune pièce recréée non plus). Limite documentée, à
  arbitrer produit avant la saison 2.
- **QR sans expiration** : la carte est permanente ; une capture d'écran du QR
  vaut la carte. Accepté pour le pilote (le scan ne donne accès à rien d'autre
  que le statut d'entrée) — consigné.
- **Transport des dépôts limité à 4 Mo** (plafond Vercel/Server Actions) alors
  que la règle métier dit 5 Mo : le contrôle client l'annonce désormais ; la
  vraie levée passerait par l'upload direct navigateur → Storage (chantier
  connu, hors pilote).

## Domaines restants (non certifiés à ce jour)

Activités/créneaux/changement de cours (J) · messages et campagnes (K) ·
relances (L) · site du club (M) · actualités (N) · import (O) · export (P) ·
abonnement (Q) · domaine personnalisé (R) · PWA (S) · administration (T) ·
accessibilité · performance · RGPD transversal · vérité commerciale.
