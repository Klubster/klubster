alter table public.organisations
  add column if not exists accroche text,
  add column if not exists presentation text,
  add column if not exists infos_pratiques text;