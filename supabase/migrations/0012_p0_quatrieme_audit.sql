-- 0012 — Correctifs du 4e audit externe (22/07/2026).
--
-- Quatre chantiers, tous côté base :
--   1. `pieces_adherent` : l'UPDATE de `authenticated` portait sur TOUTES les colonnes.
--      La policy `pieces_self_upload` vérifie le rattachement de la pièce mais pas les
--      colonnes : un adhérent pouvait déplacer sa propre pièce vers un autre club en
--      réécrivant `organisation_id`, ou en altérer `cle`/`chemin`/`label`. On passe aux
--      grants par colonne (le même mécanisme qui protège déjà `adherents` et `profiles`),
--      doublés d'un trigger — un futur `grant update` large ne rouvrirait pas la faille.
--   2. RPC webhook Stripe : `enregistrer_reglement_webhook` (4 args) et
--      `enregistrer_remboursement_webhook` étaient exécutables par `authenticated`, SANS
--      contrôle interne (elles sont conçues pour la service_role du webhook). N'importe
--      quel compte connecté pouvait donc marquer sa propre adhésion « payé » ou s'inscrire
--      un remboursement via PostgREST. On révoque tout : la service_role ignore les grants.
--   3. Inscription + questionnaire de santé dans UNE transaction
--      (`register_adherent_avec_sante`) : l'adhésion n'existe plus sans son volet santé
--      quand celui-ci est fourni — un échec d'enregistrement du questionnaire annule tout.
--   4. Révocations de défense en profondeur sur les grants PUBLIC résiduels.

-- ————————————————————————————————————————————————————————————————
-- 1. pieces_adherent — grants par colonne + colonnes immuables
-- ————————————————————————————————————————————————————————————————
-- Seules colonnes légitimement modifiées via la clé authentifiée :
--   - espace adhérent : statut ('fournie'/'par_email'), chemin, updated_at ;
--   - cockpit (président/secrétaire) : statut ('recue'…).
revoke update on public.pieces_adherent from authenticated;
grant update (statut, chemin, updated_at) on public.pieces_adherent to authenticated;

-- Ceinture et bretelles (même logique que 0009 pour profiles.role) : un futur
-- `grant update on pieces_adherent to authenticated` ne doit pas suffire à rouvrir
-- le déplacement d'une pièce entre clubs ou adhérents.
create or replace function public.proteger_colonnes_piece()
returns trigger
language plpgsql
as $$
begin
  if new.organisation_id is distinct from old.organisation_id
     or new.adherent_id is distinct from old.adherent_id
     or new.cle is distinct from old.cle then
    raise exception 'organisation_id, adherent_id et cle sont immuables sur pieces_adherent.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proteger_colonnes_piece on public.pieces_adherent;
create trigger trg_proteger_colonnes_piece
  before update on public.pieces_adherent
  for each row execute function public.proteger_colonnes_piece();

-- adherents : l'UPDATE est déjà réduit à (email, nom, prenom, telephone) par grants de
-- colonne — le point de l'audit était pour l'essentiel un faux positif. On fige tout de
-- même l'organisation et le rattachement de compte par trigger, pour que la protection
-- survive à un élargissement accidentel des grants. `user_id` ne peut évoluer que vers
-- NULL (détachement à l'anonymisation) — jamais vers un autre compte.
create or replace function public.proteger_colonnes_adherent()
returns trigger
language plpgsql
as $$
begin
  if new.organisation_id is distinct from old.organisation_id then
    raise exception 'organisation_id est immuable sur adherents.';
  end if;
  if new.user_id is distinct from old.user_id and new.user_id is not null then
    raise exception 'user_id ne peut être modifié que vers NULL (anonymisation).';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proteger_colonnes_adherent on public.adherents;
create trigger trg_proteger_colonnes_adherent
  before update on public.adherents
  for each row execute function public.proteger_colonnes_adherent();

-- ————————————————————————————————————————————————————————————————
-- 2. RPC réservées au webhook (service_role uniquement)
-- ————————————————————————————————————————————————————————————————
revoke execute on function public.enregistrer_reglement_webhook(uuid, integer, text, text) from anon, authenticated, public;
revoke execute on function public.enregistrer_remboursement_webhook(uuid, integer, text) from anon, authenticated, public;
-- Version héritée à 3 arguments, plus appelée nulle part : on la supprime.
drop function if exists public.enregistrer_reglement_webhook(uuid, integer, text);

-- ————————————————————————————————————————————————————————————————
-- 3. Inscription + questionnaire de santé : une seule transaction
-- ————————————————————————————————————————————————————————————————
-- Avant : la Server Action enchaînait `register_adherent_full` PUIS
-- `enregistrer_questionnaire_sante` ; un échec du second laissait un dossier « complet »
-- sans volet santé (données de mineurs, art. 9 — inacceptable en silence). Ici, tout
-- échec du questionnaire annule l'adhésion : PostgreSQL fait le rollback.
create or replace function public.register_adherent_avec_sante(
  p_slug text, p_user_id uuid, p_prenom text, p_nom text, p_email text, p_tel text,
  p_cours_id uuid, p_infos jsonb, p_mode text,
  p_q_type text default null, p_q_date_naissance date default null, p_q_resultat text default null,
  p_q_signataire_nom text default null, p_q_signataire_qualite text default null, p_q_signature text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_adhesion uuid;
begin
  v_adhesion := register_adherent_full(p_slug, p_user_id, p_prenom, p_nom, p_email, p_tel, p_cours_id, p_infos, p_mode);
  if v_adhesion is null then
    raise exception 'Inscription impossible.';
  end if;
  -- Questionnaire fourni → il DOIT s'enregistrer, sinon toute l'inscription est annulée.
  if nullif(trim(coalesce(p_q_signature, '')), '') is not null then
    perform enregistrer_questionnaire_sante(
      v_adhesion, p_q_type, p_q_date_naissance,
      '{}'::jsonb, -- jamais le détail des réponses (minimisation)
      p_q_resultat, p_q_signataire_nom, p_q_signataire_qualite, p_q_signature
    );
  end if;
  return v_adhesion;
end;
$$;
-- Appelée exclusivement par la service_role (Server Action d'inscription).
revoke execute on function public.register_adherent_avec_sante(text, uuid, text, text, text, text, uuid, jsonb, text, text, date, text, text, text, text) from anon, authenticated, public;

-- ————————————————————————————————————————————————————————————————
-- 4. Grants PUBLIC résiduels (défense en profondeur)
-- ————————————————————————————————————————————————————————————————
-- Ces fonctions ont un contrôle de rôle interne, mais rien ne justifie leur exposition
-- au-delà du strict nécessaire.
revoke execute on function public.marquer_relance(uuid[]) from public;
revoke execute on function public.promouvoir_liste_attente(uuid) from anon, public;
