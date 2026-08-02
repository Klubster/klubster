-- 12 mensualites : permet le prelevement mensuel sur toute une saison.
alter table public.organisations drop constraint if exists organisations_echeances_max_valide;

alter table public.organisations
  add constraint organisations_echeances_max_valide
  check (echeances_max between 1 and 12);

comment on column public.organisations.echeances_max is
  'Nombre maximal de mensualites proposees aux adherents (1 = comptant seul, 12 = mensuel sur la saison).';