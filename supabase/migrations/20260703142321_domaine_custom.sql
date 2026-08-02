-- Domaine propre par club (ex. usmboxeanglaise.fr → vitrine du club).
alter table public.organisations
  add column if not exists domaine_custom text;

create unique index if not exists organisations_domaine_custom_key
  on public.organisations (lower(domaine_custom))
  where domaine_custom is not null;