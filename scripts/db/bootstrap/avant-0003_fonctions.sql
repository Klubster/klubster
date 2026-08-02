-- KLUBSTER-BOOTSTRAP-HARNAIS — NE JAMAIS DÉPLOYER, NE JAMAIS APPLIQUER SUR UNE BASE EXISTANTE.
--
-- Ce fichier n'est PAS une migration. Il ne fait pas partie de l'historique de
-- production, il n'est pas connu de `supabase_migrations.schema_migrations`, et
-- `supabase db push` ne doit jamais le voir. Il n'existe que pour permettre à un cluster
-- JETABLE ET VIDE de parcourir l'historique actuel jusqu'au bout.
--
-- ═══ CE QU'UNE PREMIÈRE VERSION A FAILLI COÛTER ══════════════════════════════════
--
-- Ces déclarations ont d'abord été placées dans `supabase/migrations/`, sous le nom
-- `0000_prerequis_reconstructibilite.sql`, avec ce commentaire :
--
--     « Sur une base déjà migrée, ce fichier est sans effet : les corps réels de 0011
--       et 0013 y sont déjà, et CREATE OR REPLACE les réécrira à l'identique lors du
--       rejeu. »
--
-- CETTE PHRASE ÉTAIT FAUSSE, et la faute est du niveau P0. Supabase tient la liste des
-- migrations appliquées dans `supabase_migrations.schema_migrations` ; une migration qui
-- y figure n'est PAS rejouée. Sur la base de production, `0011` et `0013` y figurent
-- déjà. `0000`, lui, en serait absent : il aurait donc été considéré comme manquant, et
-- exécuté SEUL. Ses `create or replace` auraient écrasé les corps réels par les corps
-- minimaux ci-dessous, et rien ne les aurait restaurés.
--
-- Concrètement, sur la base qui héberge de vraies associations :
--
--   | fonction                          | corps minimal | conséquence immédiate           |
--   |-----------------------------------|---------------|---------------------------------|
--   | current_org_id                    | null          | plus une seule RLS ne reconnaît |
--   |                                   |               | l'organisation → cockpit vide   |
--   | is_super_admin                    | false         | console d'administration morte  |
--   | a_role_asso                       | false         | tout rôle refusé                |
--   | saison_courante                   | null          | plus aucune adhésion courante   |
--   | enregistrer_reglement_webhook     | inerte        | paiements Stripe encaissés mais |
--   |                                   |               | jamais enregistrés              |
--   | enregistrer_remboursement_webhook | inerte        | idem, en remboursement          |
--   | enregistrer_questionnaire_sante   | inerte        | questionnaire perdu en silence  |
--   | promouvoir_liste_attente          | false         | liste d'attente bloquée         |
--   | marquer_relance                   | 0             | relances rejouées en boucle     |
--
-- Le risque a été relevé en relecture, avant toute fusion. Aucune de ces fonctions n'a
-- été déployée. C'est la raison pour laquelle ce fichier a quitté
-- `supabase/migrations/` : un fichier dangereux ne se garde pas dans le répertoire d'où
-- part le déploiement, aussi bien commenté soit-il.
--
-- ═══ LE DÉFAUT QUE CE FICHIER RÉVÈLE, ET NE CORRIGE PAS ══════════════════════════
--
-- Rejouées sur une base VIDE, les migrations s'arrêtent à `0003` :
--
--     psql:0003_ecriture_organisation_par_role.sql:33:
--     ERROR: function current_org_id() does not exist
--
-- Neuf fonctions sont appelées avant d'être définies. Le tableau à jour, généré par
-- `scripts/db/inventaire-dependances.sh`, vit dans
-- `docs/finalisation-klubster/dependances-migrations-manquantes.md`.
--
-- **[Hypothèse, non établie.]** Les noms de `0011` et `0013` et leur contenu — des
-- définitions complètes, en `create or replace` — sont cohérents avec des instantanés
-- pris après coup sur une base déjà construite. Je ne peux pas le prouver depuis le
-- dépôt : l'historique Git ne dit pas ce qui a été exécuté dans l'éditeur SQL de
-- Supabase. Ce qui EST établi, c'est le fait — la chaîne ne rejoue pas — et il se
-- reproduit à chaque exécution du harnais.
--
-- CE FICHIER NE REND PAS LA BASE RECONSTRUCTIBLE. Il permet seulement de MESURER
-- l'écart et d'exécuter des tests. Rendre l'historique canonique réellement rejouable
-- est un autre chantier — baseline, squash contrôlé, ou comparaison au schéma distant —
-- qui exige un accès au schéma de référence et fera l'objet d'une PR distincte.
--
-- ═══ POURQUOI DES CORPS MINIMAUX, ET COMMENT ON S'ASSURE QU'ILS DISPARAISSENT ════
--
-- La signature doit correspondre au caractère près : PostgreSQL refuse de remplacer une
-- fonction dont le type de retour change. `0011` et `0013` remplacent ensuite chaque
-- corps par le vrai. `tests/db/00-plus-aucun-corps-minimal.sql` échoue si l'une de ces
-- neuf fonctions conserve son corps minimal à la fin de la chaîne — sans quoi le harnais
-- testerait ses propres cales en croyant tester le produit.
--
-- Point d'insertion : AVANT `0003`, d'où le nom du fichier. Le lanceur le lit.

-- ——— Fonctions d'autorisation, corps réel dans 0011 ————————————————————————————

create or replace function public.current_org_id() returns uuid
  language sql stable security definer set search_path to 'public'
as $$ select null::uuid $$;

create or replace function public.is_super_admin() returns boolean
  language sql stable security definer set search_path to 'public'
as $$ select false $$;

create or replace function public.a_role_asso(p_roles text[]) returns boolean
  language sql stable security definer set search_path to 'public'
as $$ select false $$;

-- ——— Fonctions métier, corps réel dans 0013 ————————————————————————————————————

create or replace function public.saison_courante(p_org uuid) returns text
  language sql stable security definer set search_path to 'public'
as $$ select null::text $$;

create or replace function public.marquer_relance(p_ids uuid[]) returns integer
  language sql security definer set search_path to 'public'
as $$ select 0 $$;

create or replace function public.promouvoir_liste_attente(p_adhesion_id uuid) returns boolean
  language sql security definer set search_path to 'public'
as $$ select false $$;

create or replace function public.enregistrer_questionnaire_sante(
  p_adhesion_id uuid, p_type text, p_date_naissance date, p_reponses jsonb,
  p_resultat text, p_signataire_nom text, p_signataire_qualite text, p_signature text
) returns uuid
  language sql security definer set search_path to 'public'
as $$ select null::uuid $$;

create or replace function public.enregistrer_reglement_webhook(
  p_adhesion_id uuid, p_montant_centimes integer,
  p_note text default null, p_ref text default null
) returns void
  language sql security definer set search_path to 'public'
as $$ select $$;

create or replace function public.enregistrer_remboursement_webhook(
  p_adhesion_id uuid, p_montant_centimes integer, p_ref text default null
) returns void
  language sql security definer set search_path to 'public'
as $$ select $$;

-- ——— AUCUN `revoke` ICI, ET C'EST UNE CORRECTION ——————————————————————————————
--
-- Une version précédente ajoutait, « par précaution » :
--
--     revoke execute on function public.current_org_id() from anon, public;
--
-- C'était une faute de méthode. `0011` ne rend jamais ce droit ; le `revoke` survivait
-- donc jusqu'à la fin de la chaîne, et le harnais testait une base PLUS FERMÉE que la
-- production. Le premier test de session l'a montré immédiatement :
--
--     ERROR: permission denied for function current_org_id
--
-- Un président authentifié échouait dans le harnais alors qu'il fonctionne en production.
-- Dans l'autre sens, le danger est pire : un prérequis qui OUVRIRAIT un droit ferait
-- passer au vert un test d'isolation qui devrait échouer.
--
-- La règle, désormais : UN PRÉREQUIS DÉCLARE, IL NE DÉCIDE PAS. Il pose l'objet avec la
-- signature attendue et rien de plus. Les droits viennent des migrations réelles, et
-- s'ils sont trop larges, c'est un constat à rapporter — pas un écart à corriger en
-- douce dans une cale de test, où personne ne le verrait.
--
-- L'assertion 00 signale d'ailleurs les fonctions restées exécutables par `anon`.
