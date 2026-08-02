-- V6 : enregistrer_questionnaire_sante etait appelable par `anon` avec n'importe quel
-- p_adhesion_id → depot de faux questionnaires de sante (donnee art. 9 RGPD) et de signatures.
-- register_adherent_full : meme surface publique.
-- Depuis le commit b3cce1e, la Server Action d'inscription les appelle en service_role,
-- APRES le garde anti-abus (pot de miel + Turnstile + limitation de debit).
-- Elles n'ont donc plus aucune raison d'etre exposees via /rest/v1/rpc/.

revoke execute on function public.register_adherent_full(text, uuid, text, text, text, text, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.enregistrer_questionnaire_sante(uuid, text, date, jsonb, text, text, text, text) from public, anon, authenticated;

-- create_club reste ouverte a `authenticated` : elle exige auth.uid() et rattache le club
-- au president connecte. Aucune raison de l'exposer a `anon` en revanche.
revoke execute on function public.create_club(text, text, text, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_club(text, text, text, text, text, text, text, text, text, jsonb) to authenticated;