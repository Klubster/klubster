-- Dates de saison configurables par le club : servent à borner les totaux de trésorerie.
-- NULL = non configuré (on retombe alors sur toute la période).
alter table public.organisations
  add column if not exists saison_debut date,
  add column if not exists saison_fin date;