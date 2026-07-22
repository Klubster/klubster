-- 0016 — Rétention du journal d'emails + limitation de débit distribuée (P1 « déjà
-- assumés » du 4e audit).
--
-- 1. RÉTENTION. `emails_journal` accumulait les traces d'envoi sans borne. On fixe une
--    durée de conservation de 13 mois (une saison pleine + marge), après quoi la trace
--    est purgée. Sûr vis-à-vis de la déduplication : les motifs de relance ne se
--    déclenchent que dans une fenêtre d'âge (30–44 j, etc.) ou par période (récap,
--    fin d'essai) ; une ligne d'il y a plus d'un an ne peut plus provoquer de renvoi.
--
-- 2. RATE LIMIT DISTRIBUÉ. La limitation de débit vivait en mémoire, donc par instance
--    serverless : inefficace dès qu'il y a plusieurs instances. Une table partagée +
--    une RPC atomique la rendent effective à l'échelle de la plateforme. Turnstile reste
--    la défense principale ; ceci en est le complément, désormais réel.

-- ————————————————————————————————————————————————————————————————
-- 1. Rétention du journal d'emails
-- ————————————————————————————————————————————————————————————————
create or replace function public.purger_emails_journal()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_deleted integer;
begin
  delete from public.emails_journal where envoye_le < now() - interval '13 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;
revoke execute on function public.purger_emails_journal() from anon, authenticated, public;

-- ————————————————————————————————————————————————————————————————
-- 2. Limitation de débit partagée
-- ————————————————————————————————————————————————————————————————
create table if not exists public.rate_limit (
  cle text primary key,
  compteur int not null default 0,
  fenetre_fin timestamptz not null
);
alter table public.rate_limit enable row level security;
-- Aucune policy : la table n'est jamais lue/écrite via PostgREST. Seule la RPC
-- (SECURITY DEFINER) et la service_role y touchent.

-- Incrémente le compteur d'une clé (IP, association…) sur une fenêtre glissante et
-- indique si le plafond est dépassé. Atomique : deux requêtes concurrentes ne peuvent
-- pas s'attribuer le même « slot ».
create or replace function public.incrementer_rate_limit(p_cle text, p_fenetre_secondes int, p_max int)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_compteur int;
begin
  insert into public.rate_limit (cle, compteur, fenetre_fin)
  values (p_cle, 1, now() + make_interval(secs => p_fenetre_secondes))
  on conflict (cle) do update
    set compteur = case when public.rate_limit.fenetre_fin < now() then 1 else public.rate_limit.compteur + 1 end,
        fenetre_fin = case when public.rate_limit.fenetre_fin < now() then now() + make_interval(secs => p_fenetre_secondes) else public.rate_limit.fenetre_fin end
  returning compteur into v_compteur;
  return v_compteur > p_max;
end;
$function$;
revoke execute on function public.incrementer_rate_limit(text, int, int) from anon, authenticated, public;

-- Purge des fenêtres expirées (appelée par la tâche quotidienne).
create or replace function public.purger_rate_limit()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_deleted integer;
begin
  delete from public.rate_limit where fenetre_fin < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;
revoke execute on function public.purger_rate_limit() from anon, authenticated, public;
