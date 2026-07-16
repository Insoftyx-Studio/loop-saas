-- ============================================================================
-- LOCAL VALIDATION SHIM  (NOT part of the Supabase deployment)
-- ----------------------------------------------------------------------------
-- Supabase provides an `auth` schema, the `anon`/`authenticated`/`service_role`
-- roles, and helper functions (auth.uid(), auth.role(), auth.jwt()). Plain
-- Postgres does not. This shim recreates just enough of that surface so the
-- real migrations apply unchanged and RLS can be exercised locally by setting
-- `request.jwt.claims`, exactly like PostgREST does in production.
--
-- On real Supabase you SKIP this file — the platform already provides it.
-- ============================================================================

-- Roles PostgREST switches into per request.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login password 'authenticator';
  end if;
end $$;

grant anon, authenticated, service_role to authenticator;

create schema if not exists auth;

-- Minimal auth.users to mirror Supabase (the real one has many more columns).
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- The three helpers RLS relies on. They read the request JWT claims GUC that
-- PostgREST sets on every request; identical behavior to hosted Supabase.
create or replace function auth.jwt() returns jsonb
  language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb
$$;

create or replace function auth.uid() returns uuid
  language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
  language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', 'anon')
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;
