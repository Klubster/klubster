# Dépendances de migrations manquantes

> **Document généré.** Ne pas l'éditer à la main : `node scripts/db/inventaire.mjs`.
> `tests/migrations-deployables.test.ts` échoue s'il est périmé.

Chaque ligne est un objet que les migrations de `supabase/migrations/` **utilisent avant
de le créer**, ou ne créent jamais. Sans eux, rejouée sur une base vide, la chaîne
s'arrête à `0003`.

Deux statuts, et ils n'ont pas la même gravité :

- **repris** (15) — l'objet existe bien dans le dépôt, mais trop tard. Le prérequis
  du harnais n'avance que sa date de naissance ; une migration réelle le remplace ensuite,
  et `scripts/db/assertions/00` échoue si ce n'est pas le cas.
- **absent** (21) — l'objet n'est défini **nulle part** dans le dépôt. Sa forme n'existe
  que dans la base de production, d'où elle a été extraite. Rien ne le remplacera tant que
  l'historique canonique n'aura pas été repris.

| Objet | Type | Premier usage | Définition tardive | Prérequis | Remplacé | Vérifié |
| --- | --- | --- | --- | --- | --- | --- |
| `adherents.infos` | colonne | 0004_register_adherent_full_date_naissance.sql | **aucune** | absent | **non** | assertion 02 |
| `adherents.user_id` | colonne | 0004_register_adherent_full_date_naissance.sql | **aucune** | absent | **non** | assertion 02 |
| `adhesions.derniere_relance` | colonne | 0013_reference_rpc_et_storage.sql | **aucune** | absent | **non** | assertion 02 |
| `adhesions.litige_le` | colonne | 0027_adhesions_colonnes_financieres.sql | **aucune** | absent | **non** | assertion 02 |
| `adhesions.mode_paiement` | colonne | 0004_register_adherent_full_date_naissance.sql | **aucune** | absent | **non** | assertion 02 |
| `adhesions.stripe_payment_intent` | colonne | 0017_snapshot_tables_et_index.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.abonnement_customer_id` | colonne | 0003_ecriture_organisation_par_role.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.abonnement_essai_fin` | colonne | 0003_ecriture_organisation_par_role.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.abonnement_periode_fin` | colonne | 0003_ecriture_organisation_par_role.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.abonnement_statut` | colonne | 0003_ecriture_organisation_par_role.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.abonnement_subscription_id` | colonne | 0003_ecriture_organisation_par_role.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.actualite` | colonne | 0015_organisations_colonnes_publiques.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.domaine_custom` | colonne | 0003_ecriture_organisation_par_role.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.echeances_max` | colonne | 0015_organisations_colonnes_publiques.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.form_config` | colonne | 0004_register_adherent_full_date_naissance.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.page_config` | colonne | 0015_organisations_colonnes_publiques.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.saison_debut` | colonne | 0013_reference_rpc_et_storage.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.saison_fin` | colonne | 0013_reference_rpc_et_storage.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.stripe_test` | colonne | 0003_ecriture_organisation_par_role.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.theme_mode` | colonne | 0002_create_club_ne_detache_plus_le_compte.sql | **aucune** | absent | **non** | assertion 02 |
| `organisations.theme_template` | colonne | 0002_create_club_ne_detache_plus_le_compte.sql | **aucune** | absent | **non** | assertion 02 |
| `a_role_asso` | fonction | 0003_ecriture_organisation_par_role.sql | 0011_reference_fonctions_auth.sql | repris | oui | assertion 00/01 |
| `current_org_id` | fonction | 0003_ecriture_organisation_par_role.sql | 0011_reference_fonctions_auth.sql | repris | oui | assertion 00/01 |
| `enregistrer_questionnaire_sante` | fonction | 0006_reference_rls_et_grants.sql | 0013_reference_rpc_et_storage.sql | repris | oui | assertion 00/01 |
| `enregistrer_reglement_webhook` | fonction | 0012_p0_quatrieme_audit.sql | 0013_reference_rpc_et_storage.sql | repris | oui | assertion 00/01 |
| `enregistrer_remboursement_webhook` | fonction | 0012_p0_quatrieme_audit.sql | 0013_reference_rpc_et_storage.sql | repris | oui | assertion 00/01 |
| `is_super_admin` | fonction | 0003_ecriture_organisation_par_role.sql | 0011_reference_fonctions_auth.sql | repris | oui | assertion 00/01 |
| `marquer_relance` | fonction | 0003_ecriture_organisation_par_role.sql | 0013_reference_rpc_et_storage.sql | repris | oui | assertion 00/01 |
| `promouvoir_liste_attente` | fonction | 0012_p0_quatrieme_audit.sql | 0013_reference_rpc_et_storage.sql | repris | oui | assertion 00/01 |
| `saison_courante` | fonction | 0004_register_adherent_full_date_naissance.sql | 0013_reference_rpc_et_storage.sql | repris | oui | assertion 00/01 |
| `audit_log` | table | 0006_reference_rls_et_grants.sql | 0017_snapshot_tables_et_index.sql | repris | oui | assertion 00/01 |
| `pieces_adherent` | table | 0004_register_adherent_full_date_naissance.sql | 0017_snapshot_tables_et_index.sql | repris | oui | assertion 00/01 |
| `presences` | table | 0006_reference_rls_et_grants.sql | 0017_snapshot_tables_et_index.sql | repris | oui | assertion 00/01 |
| `questionnaires_sante` | table | 0006_reference_rls_et_grants.sql | 0017_snapshot_tables_et_index.sql | repris | oui | assertion 00/01 |
| `reglements` | table | 0006_reference_rls_et_grants.sql | 0017_snapshot_tables_et_index.sql | repris | oui | assertion 00/01 |
| `stripe_events` | table | 0005_claim_stripe_event_atomique.sql | 0017_snapshot_tables_et_index.sql | repris | oui | assertion 00/01 |

## La cause, vérifiée

La base de production porte **73 migrations appliquées** ; le dépôt en contient **27**.
Les 47 migrations appliquées entre le 29/06 et le 11/07/2026 — de `vitrine_contenu` à
`jauge_liste_attente` — n'ont aucun fichier correspondant : le dépôt saute de
`init_multitenant` (29/06) à `create_club_ne_detache_plus_le_compte` (21/07).

C'est là que se trouvent `form_builder_and_member_foundation`, `theme_template_mode`,
`abonnement_klubster`, `saison_dates_organisation`, `storage_pieces_bucket`,
`questionnaire_sante`, `presences_and_scanner_functions` — c'est-à-dire exactement les
objets du tableau ci-dessus.

Dans l'autre sens : `0011_reference_fonctions_auth.sql` existe dans le dépôt mais ne
figure **pas** dans l'historique appliqué en production. Les fonctions qu'il déclare y sont
bien, créées par des migrations antérieures absentes du dépôt.

*[Vérifié le 02/08/2026 par lecture de `supabase_migrations.schema_migrations` sur le
projet `basnfuvdjobanejahayt` — métadonnées de catalogue uniquement, aucune ligne de
donnée, aucune écriture.]*

## Ce que cela coûte

1. **Aucune reprise après sinistre.** Le projet Supabase perdu, le dépôt ne le reconstruit
   pas. Pour un produit qui héberge des données de santé et des mineurs, ce n'est pas un
   détail d'hygiène.
2. **Aucune migration testable avant la production**, puisque aucune autre base ne peut
   être amenée dans le même état.
3. **Aucune préproduction reproductible.**

## Ce qui n'est pas fait ici

Cette PR **ne corrige pas** l'historique canonique. Elle permet de le parcourir, de le
mesurer, et de faire tourner des tests dessus.

Le corps SQL des 47 migrations manquantes est intégralement conservé dans
`supabase_migrations.schema_migrations.statements`. La reconstruction est donc possible
**par extraction**, sans rien réinventer. Reste un choix qui appartient à Mathieu :
restituer les 47 fichiers tels quels, ou repartir d'une baseline unique et archiver
l'ancien historique. C'est l'objectif B, dans une PR distincte.
