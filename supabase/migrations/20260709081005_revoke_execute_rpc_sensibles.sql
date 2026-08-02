-- P0 / V1 + V3 + V4 : Postgres accorde EXECUTE a PUBLIC par defaut sur toute fonction.
-- C'est ce qui rendait ces RPC appelables via /rest/v1/rpc/... avec la cle anon.

-- V1 : appelee uniquement par le webhook Stripe (service_role). Personne d'autre.
revoke execute on function public.enregistrer_reglement_webhook(uuid, integer, text) from public, anon, authenticated;

-- V3 : appelee uniquement par pg_cron (contexte interne). Personne d'autre.
revoke execute on function public.purger_questionnaires_sante() from public, anon, authenticated;

-- Trigger sur auth.users : n'a jamais besoin d'etre appelable via l'API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Fonctions du cockpit : reservees aux utilisateurs connectes (le role `authenticated`).
-- La garde d'appartenance a l'organisation est desormais fiable (migration precedente).
revoke execute on function public.enregistrer_reglement(uuid, integer, text, text) from public, anon;
revoke execute on function public.marquer_encaisse(uuid) from public, anon;
revoke execute on function public.marquer_present(uuid) from public, anon;
revoke execute on function public.verifier_adherent(uuid) from public, anon;
revoke execute on function public.cockpit_stats(text) from public, anon;

grant execute on function public.enregistrer_reglement(uuid, integer, text, text) to authenticated;
grant execute on function public.marquer_encaisse(uuid) to authenticated;
grant execute on function public.marquer_present(uuid) to authenticated;
grant execute on function public.verifier_adherent(uuid) to authenticated;
grant execute on function public.cockpit_stats(text) to authenticated;

-- RPC du parcours d'inscription publique : doivent rester ouvertes a anon.
--   create_club (protegee par auth.uid()), register_adherent_full, enregistrer_questionnaire_sante
-- current_org_id() / is_super_admin() : appelees a l'interieur des policies RLS,
--   revoquer EXECUTE casserait la RLS. Laissees en l'etat (elles ne divulguent rien de l'appelant).