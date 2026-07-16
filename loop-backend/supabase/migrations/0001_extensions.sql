-- ============================================================================
-- 0001 — Extensions & the `app` schema
-- ----------------------------------------------------------------------------
-- `app` holds our SECURITY DEFINER helpers and RPCs so they're namespaced away
-- from the API-exposed `public` tables. Keeping helpers in their own schema
-- also means we can grant EXECUTE narrowly.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;      -- case-insensitive email

create schema if not exists app;

-- Everyone authenticated may resolve helper functions; table access is still
-- governed entirely by RLS on `public`.
grant usage on schema app to anon, authenticated, service_role;
