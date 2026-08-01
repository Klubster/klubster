-- Les cales Supabase — ce qu'un PostgreSQL nu ne fournit pas, et que les migrations
-- utilisent.
--
-- ═══ POURQUOI UN POSTGRES NU PLUTÔT QUE SUPABASE LOCAL ═══════════════════════════
--
-- `supabase start` exige Docker. Sur cette machine il n'y a ni Docker, ni Docker
-- Desktop, ni Podman, ni Colima — vérifié par `which -a docker podman colima nerdctl`
-- et `ls /Applications/Docker.app`. Le harnais devait donc tenir sur un PostgreSQL
-- installé directement.
--
-- Ce n'est acceptable qu'à une condition, posée par le cahier des charges : PROUVER que
-- le Postgres nu reproduit tout ce que les migrations utilisent. La surface a été
-- relevée exhaustivement sur `supabase/migrations/*.sql` :
--
--     45 × auth.uid()            → cale ci-dessous
--      1 × auth.users            → cale ci-dessous
--     24 × storage.objects       → cale ci-dessous
--     15 × storage.foldername()  → cale ci-dessous
--      4 rôles : anon, authenticated, service_role, postgres
--     17 × gen_random_uuid()     → natif depuis PostgreSQL 13, aucune cale
--      0 × create extension      → aucune extension requise
--
-- `tests/db/00-cales.test.sql` REJOUE ce relevé sur les fichiers de migration et échoue
-- si une référence apparaît sans cale correspondante. La preuve n'est donc pas une
-- affirmation datée : elle se refait à chaque exécution.
--
-- ═══ CE QUE CES CALES NE SONT PAS ════════════════════════════════════════════════
--
-- Elles ne reproduisent PAS Supabase. Pas de GoTrue, pas d'API Storage, pas de Realtime,
-- pas de PostgREST. Elles reproduisent uniquement la SURFACE SQL dont dépendent les
-- migrations — c'est-à-dire ce qui est nécessaire pour exercer les RLS, les RPC et les
-- triggers. Les limites sont listées dans `docs/finalisation-klubster/harness-postgres.md`.

-- ——— Les rôles ————————————————————————————————————————————————————————————————
-- `nologin` : ces rôles ne servent qu'à `set role`, jamais à se connecter.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

-- ——— Le schéma `auth` —————————————————————————————————————————————————————————

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

/**
 * `auth.users` — la table des comptes.
 *
 * Seules les colonnes réellement lues par les migrations sont reproduites. En ajouter
 * d'autres donnerait l'illusion d'une fidélité qui n'est pas vérifiée.
 */
create table if not exists auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  created_at timestamptz not null default now()
);

/**
 * `auth.uid()` — l'utilisateur de la session courante.
 *
 * Chez Supabase, elle lit la revendication `sub` du JWT, déposée par PostgREST dans le
 * paramètre de session `request.jwt.claims`. La cale fait EXACTEMENT cela : les tests
 * posent `set local request.jwt.claims = '{"sub":"…","role":"authenticated"}'`, comme
 * PostgREST le ferait. C'est ce qui permet d'exercer les RLS avec de vrais contextes de
 * rôle, sans contourner quoi que ce soit.
 *
 * `nullif(…, '')` : sans utilisateur, la fonction rend `null` — et non une erreur de
 * conversion. C'est le comportement de Supabase, et les politiques s'appuient dessus.
 */
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

/** `auth.role()` — non utilisée par les migrations, fournie pour les tests de session. */
create or replace function auth.role() returns text
language sql stable
as $$
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'anon'
  )
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

-- ——— Le schéma `storage` ——————————————————————————————————————————————————————

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id     text primary key,
  name   text not null,
  public boolean not null default false
);

/**
 * `storage.objects` — les fichiers.
 *
 * Les politiques du produit s'appuient sur `bucket_id`, `name` et `id` ; `owner` et
 * `metadata` complètent la forme réelle sans être lus par les migrations.
 */
create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets(id),
  name       text,
  owner      uuid,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

/**
 * `storage.foldername(text)` — les segments du chemin, SANS le nom de fichier.
 *
 * C'est la fonction sur laquelle repose tout le cloisonnement des pièces : les
 * politiques comparent `(storage.foldername(name))[1]` à l'identifiant de
 * l'organisation. Une cale qui rendrait le mauvais segment ferait passer des tests
 * d'isolation qui devraient échouer — c'est la cale la plus sensible du fichier.
 *
 * Comportement de Supabase, reproduit ici : « org-1/pieces/x.pdf » rend
 * `{org-1, pieces}`. Le dernier segment, le fichier, est écarté.
 */
create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable
as $$
declare parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1:array_length(parts, 1) - 1];
end $$;

grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- Les quatre buckets du produit, relevés dans les migrations.
insert into storage.buckets (id, name, public) values
  ('logos',      'logos',      true),
  ('sections',   'sections',   true),
  ('actualites', 'actualites', true),
  ('pieces',     'pieces',     false)
on conflict (id) do nothing;
