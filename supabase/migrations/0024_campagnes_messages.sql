-- Historique réel des messages envoyés par un club à ses adhérents.
--
-- POURQUOI DEUX NOUVELLES TABLES ET PAS `emails_journal`
-- `emails_journal` existe pour empêcher une relance AUTOMATIQUE de partir deux fois :
-- son unicité porte sur (organisation_id, motif, periode) et il fonctionne par bail.
-- C'est exactement l'inverse du besoin d'une campagne manuelle, où un club peut
-- légitimement écrire trois fois dans la même semaine. Les deux mécanismes partageront
-- en revanche le webhook Resend.
--
-- CE QUI N'EST PAS SUIVI, ET POURQUOI
-- Aucune colonne d'ouverture ni de clic. Resend ne les mesure qu'avec un pixel 1x1 et
-- une réécriture de tous les liens, activés AU NIVEAU DU DOMAINE — ce qui traçerait
-- aussi les confirmations d'inscription et les questionnaires de santé. C'est un accès
-- en lecture au terminal du destinataire (art. 82 loi Informatique et Libertés), auprès
-- d'adhérents dont des mineurs. Décision du 30/07/2026 : on s'en tient aux événements
-- serveur à serveur. Une colonne qu'on ne saurait pas remplir honnêtement serait une
-- invitation à inventer une métrique plus tard.
--
-- VOCABULAIRE — la distinction est volontaire et porte tout le reste :
--   accepte   : Resend a accepté la requête. Ce n'est PAS une preuve d'envoi.
--   distribue : le serveur du destinataire a accepté le message. Ce n'est NI une preuve
--               de lecture, NI une garantie d'arrivée en boîte principale.

-- ——— Campagnes ———————————————————————————————————————————————————————————————

create table if not exists public.message_campaigns (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  -- L'auteur reste consultable même si le bénévole quitte le club : on garde la trace
  -- de qui a écrit au nom de l'association.
  auteur_profile_id uuid references public.profiles(id) on delete set null,
  auteur_nom text,
  objet text not null,
  corps text not null,
  -- `groupe` est la clé technique ("tous", "parents", "incomplet" ou un id de cours),
  -- `groupe_libelle` la photographie de ce qu'elle désignait au moment de l'envoi : un
  -- cours renommé ou supprimé ne doit pas rendre l'historique incompréhensible.
  groupe text not null,
  groupe_libelle text not null,
  statut text not null default 'preparation'
    check (statut in ('preparation', 'en_cours', 'envoye', 'partiel', 'echec')),
  nombre_destinataires int not null default 0,
  nombre_acceptes int not null default 0,
  nombre_distribues int not null default 0,
  nombre_retardes int not null default 0,
  nombre_echecs int not null default 0,
  nombre_plaintes int not null default 0,
  derniere_erreur text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_campaigns_org_date
  on public.message_campaigns (organisation_id, created_at desc);

-- ——— Destinataires ————————————————————————————————————————————————————————————

create table if not exists public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.message_campaigns(id) on delete cascade,
  -- `organisation_id` porté ici AUSSI : un événement Resend ne doit jamais pouvoir être
  -- rattaché à un autre club, même en cas d'erreur de jointure.
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  adherent_id uuid references public.adherents(id) on delete set null,
  -- Photographie de l'adresse au moment de l'envoi. `on delete set null` sur l'adhérent
  -- ne suffit PAS à honorer un droit à l'effacement : c'est `anonymiser_destinataires`
  -- (plus bas) qui efface cette colonne, en préservant les compteurs.
  email text,
  provider_message_id text,
  statut text not null default 'prepare'
    check (statut in ('prepare', 'accepte', 'distribue', 'retarde', 'rejete', 'echec', 'plainte', 'supprime')),
  -- Horodatages DISTINCTS : l'état visible est dérivé, jamais écrasé. Un événement
  -- tardif ne peut donc pas faire régresser un destinataire déjà distribué.
  accepted_at timestamptz,
  delivered_at timestamptz,
  delayed_at timestamptz,
  bounced_at timestamptz,
  failed_at timestamptz,
  complained_at timestamptz,
  suppressed_at timestamptz,
  erreur text,
  created_at timestamptz not null default now()
);

-- Le rattachement d'un événement passe par cet index : il doit être unique, sinon deux
-- destinataires pourraient revendiquer le même identifiant Resend.
create unique index if not exists idx_recipients_provider
  on public.message_recipients (provider_message_id) where provider_message_id is not null;

create index if not exists idx_recipients_campaign on public.message_recipients (campaign_id);
create index if not exists idx_recipients_org on public.message_recipients (organisation_id);

-- ——— Idempotence des webhooks Resend ——————————————————————————————————————————
-- Même modèle que `claim_stripe_event` (migration 0005) : une seule instruction
-- atomique, un seul appelant obtient le bail. L'identité vient de `svix-id`, que Svix
-- garantit stable entre deux tentatives de livraison.

create table if not exists public.resend_events (
  svix_id text primary key,
  type text,
  recu_le timestamptz not null default now(),
  statut text not null default 'en_cours',
  tentatives int not null default 1,
  derniere_erreur text,
  traite_le timestamptz,
  verrou_expire timestamptz
);

create or replace function public.claim_resend_event(
  p_svix_id text, p_type text, p_lease_seconds int default 120)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_statut text;
begin
  insert into resend_events (svix_id, type, statut, tentatives, verrou_expire)
  values (p_svix_id, p_type, 'en_cours', 1, now() + make_interval(secs => p_lease_seconds))
  on conflict (svix_id) do update
    set statut = 'en_cours',
        tentatives = resend_events.tentatives + 1,
        verrou_expire = now() + make_interval(secs => p_lease_seconds)
    where resend_events.statut = 'echoue'
       or (resend_events.statut = 'en_cours' and coalesce(resend_events.verrou_expire, to_timestamp(0)) < now())
  returning statut into v_statut;

  if found then return 'nouveau'; end if;

  select statut into v_statut from resend_events where svix_id = p_svix_id;
  if v_statut = 'traite' then return 'traite'; end if;
  return 'occupe';
end;
$$;

revoke execute on function public.claim_resend_event(text, text, int) from anon, authenticated, public;

-- ——— Application d'un événement ————————————————————————————————————————————————
--
-- Toute la logique anti-double-comptage vit ici, dans une seule instruction par
-- horodatage : `where <colonne> is null`. Un événement rejoué ne trouve plus la colonne
-- nulle, n'écrit rien, et le compteur n'est donc jamais incrémenté deux fois.
--
-- L'ordre d'arrivée n'a pas d'importance : chaque événement pose SON horodatage, et le
-- statut visible est recalculé par précédence décroissante de gravité.

create or replace function public.appliquer_evenement_resend(
  p_provider_message_id text, p_type text, p_erreur text default null)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rec record;
  v_touche boolean := false;
begin
  select * into v_rec from message_recipients
   where provider_message_id = p_provider_message_id for update;

  -- Identifiant inconnu : ce n'est pas une erreur. Resend achemine aussi les emails
  -- transactionnels et les relances, qui ne sont pas des campagnes. On l'ignore.
  if not found then return false; end if;

  if p_type = 'email.delivered' and v_rec.delivered_at is null then
    update message_recipients set delivered_at = now() where id = v_rec.id;
    update message_campaigns set nombre_distribues = nombre_distribues + 1 where id = v_rec.campaign_id;
    v_touche := true;
  elsif p_type = 'email.delivery_delayed' and v_rec.delayed_at is null then
    update message_recipients set delayed_at = now() where id = v_rec.id;
    update message_campaigns set nombre_retardes = nombre_retardes + 1 where id = v_rec.campaign_id;
    v_touche := true;
  elsif p_type = 'email.bounced' and v_rec.bounced_at is null then
    update message_recipients set bounced_at = now(), erreur = p_erreur where id = v_rec.id;
    update message_campaigns set nombre_echecs = nombre_echecs + 1 where id = v_rec.campaign_id;
    v_touche := true;
  elsif p_type = 'email.failed' and v_rec.failed_at is null then
    update message_recipients set failed_at = now(), erreur = p_erreur where id = v_rec.id;
    update message_campaigns set nombre_echecs = nombre_echecs + 1 where id = v_rec.campaign_id;
    v_touche := true;
  elsif p_type = 'email.complained' and v_rec.complained_at is null then
    update message_recipients set complained_at = now() where id = v_rec.id;
    update message_campaigns set nombre_plaintes = nombre_plaintes + 1 where id = v_rec.campaign_id;
    v_touche := true;
  elsif p_type = 'email.suppressed' and v_rec.suppressed_at is null then
    update message_recipients set suppressed_at = now() where id = v_rec.id;
    v_touche := true;
  elsif p_type = 'email.sent' and v_rec.accepted_at is null then
    update message_recipients set accepted_at = now() where id = v_rec.id;
    v_touche := true;
  end if;

  if not v_touche then return false; end if;

  -- Statut dérivé, par gravité décroissante. Une plainte ou un rejet prime sur une
  -- distribution : ce sont des faits plus tardifs ET plus importants pour le club.
  update message_recipients set statut = case
      when complained_at is not null then 'plainte'
      when bounced_at is not null then 'rejete'
      when failed_at is not null then 'echec'
      when suppressed_at is not null then 'supprime'
      when delivered_at is not null then 'distribue'
      when delayed_at is not null then 'retarde'
      when accepted_at is not null then 'accepte'
      else 'prepare'
    end
   where id = v_rec.id;

  return true;
end;
$$;

revoke execute on function public.appliquer_evenement_resend(text, text, text) from anon, authenticated, public;

-- ——— Effacement RGPD ———————————————————————————————————————————————————————————
--
-- `on delete set null` sur `adherent_id` coupe le lien mais LAISSE l'adresse en clair.
-- Cette fonction efface l'adresse tout en conservant la ligne : le club garde le droit
-- de savoir que sa campagne comptait 186 destinataires dont 3 rejets, sans conserver
-- l'identité de la personne qui a demandé son effacement.

create or replace function public.anonymiser_destinataires_campagnes(p_adherent_id uuid)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_n int;
begin
  update message_recipients
     set email = null, adherent_id = null
   where adherent_id = p_adherent_id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.anonymiser_destinataires_campagnes(uuid) from anon, authenticated, public;

-- ——— RLS ———————————————————————————————————————————————————————————————————————
-- Lecture réservée à l'organisation propriétaire. Aucune écriture pour `authenticated` :
-- les campagnes ne sont créées que par la Server Action, en service_role, après contrôle
-- de la permission `messages`. Un président ne peut donc pas forger une campagne
-- portant l'organisation d'un autre club.

alter table public.message_campaigns enable row level security;
alter table public.message_recipients enable row level security;
alter table public.resend_events enable row level security;

drop policy if exists campaigns_read_same_org on public.message_campaigns;
create policy campaigns_read_same_org on public.message_campaigns
  for select to authenticated
  using (organisation_id = current_org_id() or is_super_admin());

drop policy if exists recipients_read_same_org on public.message_recipients;
create policy recipients_read_same_org on public.message_recipients
  for select to authenticated
  using (organisation_id = current_org_id() or is_super_admin());

-- `resend_events` n'intéresse personne d'autre que le serveur : aucune politique de
-- lecture, donc aucune ligne visible pour anon ni authenticated.

revoke all on public.message_campaigns from anon;
revoke all on public.message_recipients from anon;
revoke all on public.resend_events from anon, authenticated;
grant select on public.message_campaigns to authenticated;
grant select on public.message_recipients to authenticated;
