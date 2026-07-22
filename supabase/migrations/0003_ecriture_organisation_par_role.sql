-- Durcissement des écritures sur la table `organisations`.
--
-- Constat (audit du 21/07/2026) : la policy `org_admin_write` autorisait TOUT membre
-- authentifié du club à modifier la fiche de son organisation — `id = current_org_id()`,
-- sans aucun contrôle de rôle. Un « lecture seule » ou un encadrant pouvait donc, en
-- appelant Supabase directement (hors interface), changer le compte Stripe du club, son
-- domaine personnalisé ou l'état de son abonnement.
--
-- La difficulté : plusieurs rôles écrivent LÉGITIMEMENT des colonnes DIFFÉRENTES de la
-- même ligne — le secrétaire publie l'actualité, le trésorier borne la saison, le
-- président gère l'identité et le paiement. Une policy de ligne ne sait pas distinguer
-- les colonnes. On combine donc deux barrières :
--
--   1. la policy de ligne réserve l'écriture aux rôles qui écrivent quelque chose
--      (président, trésorier, secrétaire) — encadrant et lecture sont désormais exclus ;
--   2. un trigger protège les colonnes sensibles (Stripe, abonnement, domaine) et n'en
--      autorise la modification qu'au président, ou à un contexte serveur de confiance
--      (webhook en service_role, RPC SECURITY DEFINER — repérés par `auth.uid() is null`).

begin;

-- 1. Policy de ligne : écriture réservée aux rôles qui en ont un usage réel.
drop policy if exists org_admin_write on public.organisations;
create policy org_admin_write on public.organisations
  for all
  using (
    (id = current_org_id() and a_role_asso(array['admin_asso','tresorier','secretaire']))
    or is_super_admin()
  )
  with check (
    (id = current_org_id() and a_role_asso(array['admin_asso','tresorier','secretaire']))
    or is_super_admin()
  );

-- 2. Trigger de protection des colonnes sensibles.
create or replace function public.proteger_colonnes_sensibles_organisation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Contexte serveur de confiance (service_role du webhook, RPC SECURITY DEFINER) :
  -- aucun utilisateur final n'est associé, on laisse passer.
  if auth.uid() is null then
    return new;
  end if;

  -- Le président (ou un super-admin) peut tout modifier.
  if a_role_asso(array['admin_asso']) then
    return new;
  end if;

  -- Sinon, toute tentative de toucher à une colonne sensible est refusée.
  if new.stripe_account_id is distinct from old.stripe_account_id
     or new.domaine_custom is distinct from old.domaine_custom
     or new.abonnement_plan is distinct from old.abonnement_plan
     or new.abonnement_customer_id is distinct from old.abonnement_customer_id
     or new.abonnement_subscription_id is distinct from old.abonnement_subscription_id
     or new.abonnement_statut is distinct from old.abonnement_statut
     or new.abonnement_essai_fin is distinct from old.abonnement_essai_fin
     or new.abonnement_periode_fin is distinct from old.abonnement_periode_fin
     or new.stripe_test is distinct from old.stripe_test
  then
    raise exception 'Seul le président peut modifier les paramètres de paiement, d''abonnement ou de domaine.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proteger_colonnes_sensibles on public.organisations;
create trigger trg_proteger_colonnes_sensibles
  before update on public.organisations
  for each row execute function public.proteger_colonnes_sensibles_organisation();

-- 3. `marquer_relance` restait exécutable par `anon` (héritage du GRANT par défaut de
--    Postgres à PUBLIC). Elle ne fait qu'horodater une relance, mais n'a aucune raison
--    d'être ouverte à un visiteur anonyme.
revoke execute on function public.marquer_relance(uuid[]) from anon, public;

commit;
