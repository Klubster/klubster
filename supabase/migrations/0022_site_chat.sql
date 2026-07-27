-- Chat public du site vitrine Klubster (visiteur anonyme ↔ Mathieu via Telegram).
-- Accès EXCLUSIVEMENT via server actions / route API en service-role : RLS activée,
-- aucune policy, droits retirés à anon/authenticated. Le client ne touche jamais
-- Supabase directement pour ce chat (tout passe par des server actions).

create table if not exists public.site_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visiteur_id text not null,
  nom text,
  contact text,
  statut text not null default 'ouvert',
  dernier_sender text,
  dernier_at timestamptz not null default now(),
  non_lus_visiteur int not null default 0,
  cree_at timestamptz not null default now()
);
create index if not exists idx_site_chat_conv_visiteur on public.site_chat_conversations(visiteur_id);

create table if not exists public.site_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.site_chat_conversations(id) on delete cascade,
  sender text not null check (sender in ('visiteur','operateur')),
  corps text not null,
  cree_at timestamptz not null default now()
);
create index if not exists idx_site_chat_msg_conv on public.site_chat_messages(conversation_id, cree_at);

alter table public.site_chat_conversations enable row level security;
alter table public.site_chat_messages enable row level security;

-- Aucune policy : seul le service-role (server actions + route /api/chat/reply) accède.
revoke all on public.site_chat_conversations from anon, authenticated;
revoke all on public.site_chat_messages from anon, authenticated;
