
create extension if not exists pg_cron;

-- Purge RGPD : supprime les attestations de santé dont la saison sportive est échue.
-- Saison = 1er sept. → 31 août. On supprime tout ce qui a été créé avant le début de la saison courante.
create or replace function public.purger_questionnaires_sante()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season_start date;
  v_deleted integer;
begin
  v_season_start := case
    when extract(month from current_date) >= 9
      then make_date(extract(year from current_date)::int, 9, 1)
    else make_date((extract(year from current_date)::int) - 1, 9, 1)
  end;

  delete from public.questionnaires_sante where created_at < v_season_start;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Réservée au système (cron / postgres). Jamais exposée aux clients.
revoke all on function public.purger_questionnaires_sante() from anon, authenticated;

-- (Re)planification quotidienne à 03:00 UTC.
do $$
begin
  perform cron.unschedule('purge-questionnaires-sante');
exception when others then null;
end $$;

select cron.schedule('purge-questionnaires-sante', '0 3 * * *', $$select public.purger_questionnaires_sante();$$);
