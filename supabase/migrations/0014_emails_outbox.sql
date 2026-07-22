-- 0014 — `emails_journal` devient une vraie outbox (P1 du 4e audit).
--
-- Deux lacunes réelles du modèle précédent :
--   1. Crash entre la réservation et l'appel à Resend : la ligne de réservation restait,
--      l'email était réputé « traité » et ne partait jamais. Pas de reprise.
--   2. Emails de CLUB (adherent_id NULL — récap hebdo, fin d'essai) : l'index unique
--      `(adherent_id, motif) where adherent_id is not null` ne les couvrait pas. Deux
--      crons concurrents pouvaient envoyer deux récapitulatifs.
--
-- Modèle outbox : chaque ligne porte un STATUT et un BAIL. Une réservation `en_cours`
-- dont le bail a expiré (worker mort avant l'envoi) est reprenable au tour suivant ; une
-- ligne `envoye` ne repart jamais ; une ligne `echoue` est reprise. Les emails de club
-- reçoivent une unicité `(organisation_id, motif, periode)` — une période = une semaine
-- ISO (récap) ou la date de fin d'essai (fin d'essai).

alter table public.emails_journal
  add column if not exists statut text not null default 'envoye'
    check (statut in ('en_cours','envoye','echoue')),
  add column if not exists lease_until timestamptz,
  add column if not exists tentatives int not null default 0,
  add column if not exists provider_message_id text,
  add column if not exists derniere_erreur text,
  add column if not exists periode text;
-- Les lignes existantes datent de l'ancien modèle « insert puis envoi » : elles
-- représentent des emails effectivement partis → statut 'envoye' (valeur par défaut).

-- Unicité des emails de CLUB : une seule fois par (club, motif, période).
create unique index if not exists emails_journal_unique_club
  on public.emails_journal (organisation_id, motif, periode)
  where adherent_id is null;

-- Reprise : retrouver vite les réservations mortes (en_cours, bail expiré).
create index if not exists emails_journal_lease
  on public.emails_journal (statut, lease_until);

-- ————————————————————————————————————————————————————————————————
-- Réservation atomique d'un email (adhérent OU club).
--   'reserve'      → à envoyer (id retourné) ;
--   'deja_envoye'  → un envoi a déjà eu lieu, ne rien faire ;
--   'occupe'       → un autre worker le tient, bail encore valide.
-- ————————————————————————————————————————————————————————————————
create or replace function public.reserver_email(
  p_org uuid, p_adherent uuid, p_destinataire text, p_motif text,
  p_periode text default null, p_lease_seconds int default 120
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid; v_statut text;
begin
  if p_adherent is not null then
    -- Un email d'adhérent : unicité (adherent_id, motif). On (re)prend si la ligne
    -- n'existe pas, a échoué, ou tient d'un bail expiré.
    insert into emails_journal (organisation_id, adherent_id, destinataire, motif, periode, statut, lease_until, tentatives)
    values (p_org, p_adherent, p_destinataire, p_motif, p_periode, 'en_cours', now() + make_interval(secs => p_lease_seconds), 1)
    on conflict (adherent_id, motif) where adherent_id is not null
      do update set statut = 'en_cours',
                    lease_until = now() + make_interval(secs => p_lease_seconds),
                    tentatives = emails_journal.tentatives + 1,
                    destinataire = excluded.destinataire
      where emails_journal.statut = 'echoue'
         or (emails_journal.statut = 'en_cours' and coalesce(emails_journal.lease_until, to_timestamp(0)) < now())
    returning id into v_id;
  else
    -- Un email de club : unicité (organisation_id, motif, periode).
    insert into emails_journal (organisation_id, adherent_id, destinataire, motif, periode, statut, lease_until, tentatives)
    values (p_org, null, p_destinataire, p_motif, p_periode, 'en_cours', now() + make_interval(secs => p_lease_seconds), 1)
    on conflict (organisation_id, motif, periode) where adherent_id is null
      do update set statut = 'en_cours',
                    lease_until = now() + make_interval(secs => p_lease_seconds),
                    tentatives = emails_journal.tentatives + 1,
                    destinataire = excluded.destinataire
      where emails_journal.statut = 'echoue'
         or (emails_journal.statut = 'en_cours' and coalesce(emails_journal.lease_until, to_timestamp(0)) < now())
    returning id into v_id;
  end if;

  if v_id is not null then
    return jsonb_build_object('statut', 'reserve', 'id', v_id);
  end if;

  -- Pas de ligne renvoyée : soit déjà envoyée, soit tenue par un bail encore valide.
  if p_adherent is not null then
    select statut into v_statut from emails_journal where adherent_id = p_adherent and motif = p_motif;
  else
    select statut into v_statut from emails_journal where organisation_id = p_org and motif = p_motif and periode is not distinct from p_periode and adherent_id is null;
  end if;
  if v_statut = 'envoye' then return jsonb_build_object('statut', 'deja_envoye'); end if;
  return jsonb_build_object('statut', 'occupe');
end;
$function$;
revoke execute on function public.reserver_email(uuid, uuid, text, text, text, int) from anon, authenticated, public;

create or replace function public.marquer_email_envoye(p_id uuid, p_provider_id text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update emails_journal
     set statut = 'envoye', lease_until = null, provider_message_id = p_provider_id, envoye_le = now()
   where id = p_id;
end;
$function$;
revoke execute on function public.marquer_email_envoye(uuid, text) from anon, authenticated, public;

create or replace function public.liberer_email(p_id uuid, p_erreur text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Statut 'echoue' plutôt que suppression : la ligne reste reprenable au tour suivant,
  -- et l'erreur est conservée pour diagnostic.
  update emails_journal
     set statut = 'echoue', lease_until = null, derniere_erreur = left(coalesce(p_erreur, ''), 500)
   where id = p_id;
end;
$function$;
revoke execute on function public.liberer_email(uuid, text) from anon, authenticated, public;
