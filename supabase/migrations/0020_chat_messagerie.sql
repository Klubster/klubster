-- 0020 — Messagerie « Écrire à Mathieu » (chat live président ↔ éditeur).
--
-- Un club = une conversation ; l'éditeur (super_admin) est l'opérateur unique. Le président
-- écrit depuis son cockpit, l'éditeur répond depuis /admin. Temps réel via la publication
-- supabase_realtime. Même doctrine RLS que 0006/0019 (current_org_id() + is_super_admin()),
-- grants explicites (0013/0015/0019). La Server Action vérifie EN PLUS l'appartenance ;
-- la policy n'est jamais la seule garde.

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null unique references public.organisations(id) on delete cascade,
  statut text not null default 'ouvert' check (statut in ('ouvert','clos')),
  dernier_message_at timestamptz,
  dernier_sender text check (dernier_sender in ('club','operateur')),
  dernier_apercu text,
  non_lus_operateur int not null default 0,
  non_lus_club int not null default 0,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender text not null check (sender in ('club','operateur')),
  corps text not null,
  auteur uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index chat_messages_conv_created on public.chat_messages (conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- Conversation : le club voit/gère la sienne ; l'éditeur voit tout.
create policy chat_conv_select on public.chat_conversations for select to authenticated
  using (organisation_id = public.current_org_id() or public.is_super_admin());
create policy chat_conv_insert on public.chat_conversations for insert to authenticated
  with check (organisation_id = public.current_org_id() or public.is_super_admin());
create policy chat_conv_update on public.chat_conversations for update to authenticated
  using (organisation_id = public.current_org_id() or public.is_super_admin())
  with check (organisation_id = public.current_org_id() or public.is_super_admin());

-- Messages : lecture si la conversation est la mienne (ou super_admin). Insertion contrainte
-- au rôle — un club ne poste que « club », l'éditeur que « operateur ».
create policy chat_msg_select on public.chat_messages for select to authenticated
  using (exists (
    select 1 from public.chat_conversations c
    where c.id = conversation_id
      and (c.organisation_id = public.current_org_id() or public.is_super_admin())
  ));
create policy chat_msg_insert on public.chat_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and (c.organisation_id = public.current_org_id() or public.is_super_admin())
    )
    and (
      (public.is_super_admin() and sender = 'operateur')
      or ((not public.is_super_admin()) and sender = 'club')
    )
  );

-- Grants explicites : jamais s'en remettre aux défauts.
revoke all on table public.chat_conversations from anon, authenticated, public;
revoke all on table public.chat_messages from anon, authenticated, public;
grant select, insert, update on table public.chat_conversations to authenticated;
grant select, insert on table public.chat_messages to authenticated;

-- Temps réel : président et éditeur reçoivent les nouveaux messages sans rechargement.
alter publication supabase_realtime add table public.chat_conversations;
alter publication supabase_realtime add table public.chat_messages;
