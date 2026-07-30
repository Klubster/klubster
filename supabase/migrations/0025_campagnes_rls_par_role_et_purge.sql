-- Durcissement des campagnes : RLS par RÔLE, et purge des adresses.
--
-- POURQUOI CETTE MIGRATION EXISTE
-- La 0024 cloisonnait les campagnes par organisation, mais laissait TOUT membre du club
-- les lire. Or `message_recipients` porte les adresses de tous les adhérents servis :
-- un encadrant ou un accès en lecture seule pouvait donc récupérer le carnet d'adresses
-- complet par une requête directe à PostgREST, sans jamais passer par la page Next.
-- Le contrôle `verifierPermission("messages")` de la page ne protège que la page.
-- (Relevé par Mathieu le 30/07/2026 — même famille de faille que le 4e audit.)
--
-- La permission « messages » appartient au président et au secrétaire
-- (`src/lib/roles.ts`). Les politiques ci-dessous disent exactement la même chose, en
-- base cette fois, pour que les deux ne puissent plus diverger.

begin;

-- ——— Lecture réservée aux rôles qui ont la permission « messages » ————————————

drop policy if exists campaigns_read_same_org on public.message_campaigns;
create policy campaigns_read_role on public.message_campaigns for select to authenticated
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin());

drop policy if exists recipients_read_same_org on public.message_recipients;
create policy recipients_read_role on public.message_recipients for select to authenticated
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin());

-- Aucune politique d'écriture : les campagnes ne naissent que de la Server Action, en
-- service_role, après contrôle de la permission. `authenticated` ne peut donc rien
-- insérer, modifier ni supprimer — pas même sa propre organisation.

-- ——— Conservation des adresses ————————————————————————————————————————————————
--
-- DURÉE RETENUE : 13 MOIS, alignée sur `emails_journal` (une saison pleine + marge).
-- Au-delà, l'adresse n'a plus d'utilité : un club n'a pas besoin de savoir QUI il a
-- servi il y a deux saisons, seulement COMBIEN. La ligne est donc conservée — les
-- compteurs de campagne restent exacts — mais l'adresse et le lien vers l'adhérent
-- sont effacés. C'est de la minimisation (art. 5.1.c), pas de la suppression.
--
-- `provider_message_id` est conservé : il ne désigne personne à lui seul, et il reste
-- utile pour rapprocher un incident d'acheminement du tableau de bord Resend.

create or replace function public.purger_destinataires_campagnes(p_mois int default 13)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_n int;
begin
  update message_recipients
     set email = null, adherent_id = null
   where email is not null
     and created_at < now() - make_interval(months => p_mois);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.purger_destinataires_campagnes(int) from anon, authenticated, public;

comment on function public.purger_destinataires_campagnes(int) is
  'Efface les adresses des destinataires de plus de 13 mois, en conservant les lignes et donc les compteurs. Appelée par le cron d''entretien quotidien, aux côtés de purger_emails_journal.';

commit;
