-- 0021 — Abonnements Web Push (notifications de l'éditeur sur mobile/desktop).
--
-- Un appareil = une ligne (endpoint unique). La table est écrite ET lue UNIQUEMENT par le
-- client service-role (lib/push) : la Server Action d'abonnement vérifie d'abord le rôle
-- super_admin, puis passe par le service-role. Aucun accès anon/authenticated : RLS activée
-- sans aucune policy = deny par défaut ; seul le service-role la traverse, par conception.

create table public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  label text,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated, public;
-- Volontairement AUCUNE policy : la table n'est jamais touchée avec la clé anon.
