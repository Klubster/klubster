-- Le club décide du nombre maximal de prélèvements ; l'adhérent choisit dans cette limite.
-- 1 = paiement comptant uniquement. 10 = plafond produit.
alter table public.organisations
  add column if not exists echeances_max integer not null default 1;

alter table public.organisations
  drop constraint if exists organisations_echeances_max_valide;

alter table public.organisations
  add constraint organisations_echeances_max_valide
  check (echeances_max between 1 and 10);

comment on column public.organisations.echeances_max is
  'Nombre maximal de mensualites proposees aux adherents (1 = comptant seul, 10 = plafond).';

-- L''USM Boxe proposait deja le 3 fois : on preserve son comportement actuel.
update public.organisations set echeances_max = 3 where slug = 'usmboxe' and echeances_max = 1;