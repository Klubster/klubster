-- Colonnes financières d'`adhesions` : grants par colonne + RPC de lecture.
--
-- ——— L'ARBITRAGE, ET POURQUOI ————————————————————————————————————————————————
--
-- La 0026 a fermé `reglements`. Elle laissait pourtant `adhesions` grande ouverte : un
-- encadrant lisait encore le statut, le montant, le mode de paiement et l'existence d'un
-- litige bancaire. Annoncer « le suivi des règlements est réservé au président et au
-- trésorier » au-dessus d'un « 210 € · cheque · En retard » n'était pas une protection,
-- c'était une contradiction.
--
-- Frontière retenue, arbitrée le 30/07/2026 :
--
-- RESTE VISIBLE À TOUTE L'ÉQUIPE DU CLUB
--   `cours_id`, `saison`  — l'inscription. Un encadrant a besoin de sa liste.
--   `montant_centimes`    — c'est le TARIF DU COURS, et il est déjà public : la vitrine
--                           affiche « Cotisations annuelles » et l'expose même en
--                           schema.org/Offer pour le référencement. Le cacher à un
--                           encadrant pendant qu'un visiteur le lit sur le site du club
--                           serait du théâtre.
--   `statut`              — l'état du DOSSIER, ce dont un secrétaire a besoin pour
--                           savoir s'il est en règle. Et « liste_attente » n'a rien de
--                           financier : le masquer casserait la gestion des inscriptions.
--   `mode_paiement`       — dit seulement « chèque » ou « en ligne ». Surtout :
--                           `espace/page.tsx` le lit pour l'adhérent LUI-MÊME. Les
--                           grants par colonne portent sur le rôle `authenticated`, que
--                           les adhérents partagent avec les bénévoles — le révoquer
--                           aurait cassé l'espace adhérent pour protéger un mot.
--
-- RÉSERVÉ AUX RÔLES PORTANT « paiements »
--   `litige_le`             — un paiement contesté. Fait financier et réputationnel.
--   `stripe_payment_intent` — la référence qui permet de déclencher un remboursement.
--   `derniere_relance`      — « cette personne a été relancée pour de l'argent le… ».
--
-- ——— POURQUOI DES GRANTS PAR COLONNE, ET PAS UNE RLS ————————————————————————
--
-- La RLS est ligne à ligne : elle ne sait pas cacher trois colonnes. Et les GRANT par
-- colonne portent sur le rôle Postgres `authenticated`, partagé par TOUS les membres du
-- club — ils ne distinguent pas un président d'un encadrant.
--
-- D'où le motif retenu, déjà employé pour `pieces_adherent` : on retire les colonnes
-- sensibles à `authenticated` (elles deviennent invisibles à toute requête PostgREST
-- directe, pour tout le monde), et le président et le trésorier les lisent par une RPC
-- `SECURITY DEFINER` qui vérifie le rôle. Le contrôle vit alors dans la base, pas dans
-- la page.

begin;

-- ——— Grants par colonne ————————————————————————————————————————————————————
-- Un GRANT au niveau table couvre toutes les colonnes, y compris futures : on ne peut
-- pas en révoquer une seule. Il faut retirer le droit sur la table, puis le rendre
-- colonne par colonne. Toute colonne ajoutée plus tard sera donc invisible par défaut —
-- c'est voulu : on préfère un oubli qui cache à un oubli qui expose.

revoke select on public.adhesions from authenticated;

grant select (
  id,
  organisation_id,
  adherent_id,
  cours_id,
  saison,
  montant_centimes,
  statut,
  created_at,
  mode_paiement
) on public.adhesions to authenticated;

-- `anon` n'a jamais rien eu sur cette table, et ne doit rien avoir.
revoke all on public.adhesions from anon;

-- ——— Lecture financière, par rôle ————————————————————————————————————————————
--
-- La sortie d'une fonction n'est pas soumise aux droits par colonne : c'est ce qui
-- permet au président de lire ce que la table ne laisse plus passer.
--
-- POURQUOI `RETURNS TABLE` ET PAS `SETOF public.adhesions`
-- Avec `setof adhesions` + `select a.*`, TOUTE colonne ajoutée un jour à la table
-- serait automatiquement servie au trésorier, sans que personne ne l'ait décidé. Un
-- `returns table (...)` nommant les colonnes une par une transforme cet oubli
-- silencieux en erreur de compilation le jour où on voudra en ajouter une. On liste
-- donc exactement ce dont les quatre appelants ont besoin, et rien de plus.
--
-- POURQUOI DEUX BRANCHES INDÉPENDANTES POUR LE SUPER-ADMIN
-- La première écriture était :
--   and (a.organisation_id = current_org_id() or is_super_admin())
--   and a_role_asso(array['admin_asso','tresorier'])
-- Elle FONCTIONNE aujourd'hui — `a_role_asso` commence elle-même par
-- `coalesce(is_super_admin(), false) or ...`, donc le super-admin la satisfait. Mais
-- elle ne fonctionne que par ricochet : elle dépend d'un détail interne d'une AUTRE
-- fonction. Le jour où quelqu'un retire le raccourci super-admin de `a_role_asso` —
-- ce qui serait un durcissement raisonnable — cette RPC verrouille silencieusement la
-- console d'administration, et personne ne fera le lien. On l'écrit donc en deux
-- branches explicites : club + rôle, OU super-admin.

create or replace function public.adhesions_finance(p_org uuid)
returns table (
  id uuid,
  organisation_id uuid,
  adherent_id uuid,
  montant_centimes integer,
  litige_le timestamptz,
  stripe_payment_intent text,
  derniere_relance timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select a.id,
         a.organisation_id,
         a.adherent_id,
         a.montant_centimes,
         a.litige_le,
         a.stripe_payment_intent,
         a.derniere_relance
    from public.adhesions a
   where a.organisation_id = p_org
     and (
       -- Membre du club, ET porteur de la permission « paiements ».
       (a.organisation_id = current_org_id() and a_role_asso(array['admin_asso','tresorier']))
       -- Ou super-admin, sans condition d'organisation : son profil n'en porte aucune.
       or is_super_admin()
     )
$$;

comment on function public.adhesions_finance(uuid) is
  'Adhésions avec leurs colonnes financières (litige_le, stripe_payment_intent, derniere_relance), réservées aux rôles portant la permission « paiements ». Doit rester alignée sur MATRICE dans src/lib/roles.ts.';

-- `anon` n'a rien à y faire. `authenticated` en a besoin : c'est la fonction elle-même
-- qui filtre par rôle, et un encadrant qui l'appelle reçoit zéro ligne.
revoke execute on function public.adhesions_finance(uuid) from anon, public;
grant execute on function public.adhesions_finance(uuid) to authenticated;

commit;
