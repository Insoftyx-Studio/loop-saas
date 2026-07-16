-- Loop backend — consolidated schema for a FRESH Supabase project.
-- Paste this whole file into the Supabase SQL Editor and Run.
-- Contains: extensions, tables, functions, indexes, RLS, views, storage, realtime.
-- Deliberately OMITS the auth.users trigger (that was the signup blocker).


-- ============ 0001_extensions ============
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

-- ============ 0002_schema ============
-- ============================================================================
-- 0002 — Schema: enums + tables
-- ----------------------------------------------------------------------------
-- Multi-tenant design decisions that make RLS both correct and FAST:
--
--  1. Every tenant table carries `organization_id` directly (denormalized).
--     RLS can then check a single column on the same row — no joins up the
--     tree per row, which is the #1 cause of slow RLS.
--
--  2. Client-scoped tables also carry `client_id` directly, so a client's
--     "only my rows" policy is likewise a single-column equality.
--
--  3. Denormalized keys can't drift, because they're anchored by COMPOSITE
--     foreign keys back to a UNIQUE(id, organization_id) on the parent. A
--     child row physically cannot reference a parent in another org.
--
--  4. Money is stored as integer cents (never float).
-- ============================================================================

-- ---- enums ----------------------------------------------------------------
create type app.user_role         as enum ('agency_admin', 'agency_member', 'client');
create type app.project_status    as enum ('on_track', 'at_risk', 'paused', 'delivered');
create type app.deliverable_status as enum ('shared', 'approved', 'changes_requested');
create type app.request_status    as enum ('open', 'in_progress', 'done');
create type app.invoice_status    as enum ('paid', 'pending', 'overdue');

-- ---- organizations (the agency) -------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 120),
  slug        citext unique not null,
  logo_url    text,
  accent      text not null default '99 91 255',   -- "r g b"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---- clients (a company the agency serves) --------------------------------
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(name) between 1 and 120),
  contact         text not null default '',
  email           citext,
  accent          text not null default '99 91 255',
  initials        text not null default '',
  since           date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id)   -- anchor for composite FKs below
);

-- ---- users (profile row; 1:1 with auth.users) -----------------------------
-- A client user is pinned to exactly one client company via client_id.
-- Agency users have client_id = null.
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role            app.user_role not null,
  full_name       text not null default '',
  email           citext,
  client_id       uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- client_id must belong to the SAME org, and must be present iff role=client
  foreign key (client_id, organization_id)
    references public.clients(id, organization_id) on delete cascade,
  constraint client_users_have_a_client
    check ((role = 'client') = (client_id is not null))
);

-- ---- projects -------------------------------------------------------------
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id       uuid not null,
  name            text not null check (length(name) between 1 and 160),
  summary         text not null default '',
  status          app.project_status not null default 'on_track',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (client_id, organization_id)
    references public.clients(id, organization_id) on delete cascade
);

-- ---- milestones -----------------------------------------------------------
create table public.milestones (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id      uuid not null,
  client_id       uuid not null,
  title           text not null check (length(title) between 1 and 200),
  due             date,
  done            boolean not null default false,
  position        int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (client_id, organization_id)
    references public.clients(id, organization_id) on delete cascade
);

-- ---- deliverables ---------------------------------------------------------
create table public.deliverables (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id      uuid not null,
  client_id       uuid not null,
  title           text not null check (length(title) between 1 and 200),
  kind            text not null default 'File',
  status          app.deliverable_status not null default 'shared',
  storage_path    text,                 -- object key in the `deliverables` bucket
  thumb_seed      text not null default '',
  shared_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (client_id, organization_id)
    references public.clients(id, organization_id) on delete cascade
);

-- ---- comments (the approval-loop conversation) ----------------------------
create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deliverable_id  uuid not null,
  client_id       uuid not null,
  author_id       uuid references public.users(id) on delete set null,
  author_name     text not null default '',
  role            app.user_role not null,
  body            text not null check (length(body) between 1 and 4000),
  created_at      timestamptz not null default now(),
  foreign key (deliverable_id, organization_id)
    references public.deliverables(id, organization_id) on delete cascade,
  foreign key (client_id, organization_id)
    references public.clients(id, organization_id) on delete cascade
);

-- ---- requests -------------------------------------------------------------
create table public.requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id       uuid not null,
  title           text not null check (length(title) between 1 and 200),
  detail          text not null default '',
  status          app.request_status not null default 'open',
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (client_id, organization_id)
    references public.clients(id, organization_id) on delete cascade
);

-- ---- invoices (display-only in the demo) ----------------------------------
create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id       uuid not null,
  number          text not null,
  amount_cents    bigint not null check (amount_cents >= 0),
  currency        text not null default 'USD',
  status          app.invoice_status not null,
  issued          date not null default current_date,
  due             date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, number),
  foreign key (client_id, organization_id)
    references public.clients(id, organization_id) on delete cascade
);

-- ---- updates (agency → client feed) ---------------------------------------
create table public.updates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id       uuid not null,
  title           text not null check (length(title) between 1 and 200),
  body            text not null default '',
  author_id       uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (client_id, organization_id)
    references public.clients(id, organization_id) on delete cascade
);

-- ============ 0003_functions ============
-- ============================================================================
-- 0003 — Helper functions & RPCs
-- ----------------------------------------------------------------------------
-- The tenant helpers are the hot path: every RLS policy calls them. Three
-- optimizations:
--
--   * FAST PATH — if the JWT carries app_metadata.{organization_id,role,
--     client_id} (populate it with a Supabase custom-claims auth hook), the
--     helpers read straight from the token with ZERO table I/O.
--   * FALLBACK — otherwise they read the caller's profile once. Marked STABLE
--     and, because policies call them as `(select app.current_org())`, the
--     planner evaluates them a single time per query (an InitPlan), not once
--     per row.
--   * SECURITY DEFINER with a locked, empty search_path so the fallback SELECT
--     on public.users bypasses users-table RLS (no recursion) and can't be
--     hijacked via search_path.
-- ============================================================================

create or replace function app.current_org()
  returns uuid
  language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid,
    (select u.organization_id from public.users u where u.id = auth.uid())
  )
$$;

create or replace function app.current_role()
  returns app.user_role
  language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::app.user_role,
    (select u.role from public.users u where u.id = auth.uid())
  )
$$;

create or replace function app.current_client_id()
  returns uuid
  language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'client_id', '')::uuid,
    (select u.client_id from public.users u where u.id = auth.uid())
  )
$$;

create or replace function app.is_agency()
  returns boolean
  language sql stable security definer set search_path = ''
as $$
  select app.current_role() in ('agency_admin', 'agency_member')
$$;

grant execute on function
  app.current_org(), app.current_role(), app.current_client_id(), app.is_agency()
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at bump
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Stamp helpers — let the client send a minimal payload while the server
-- fills tenant keys authoritatively (defense in depth alongside RLS).
-- ---------------------------------------------------------------------------

-- comments: caller sends { deliverable_id, body }. We derive org/client from
-- the deliverable and author from the JWT.
create or replace function app.stamp_comment()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.deliverables%rowtype;
begin
  select * into d from public.deliverables where id = new.deliverable_id;
  if not found then raise exception 'deliverable % not found', new.deliverable_id; end if;
  new.organization_id := d.organization_id;
  new.client_id       := d.client_id;
  new.author_id       := coalesce(new.author_id, auth.uid());
  new.role            := coalesce(new.role, app.current_role());
  new.author_name     := coalesce(nullif(new.author_name, ''),
                            (select full_name from public.users where id = auth.uid()), '');
  return new;
end $$;

-- requests: caller sends { client_id, title, detail }. Fill org + created_by.
create or replace function app.stamp_request()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.clients%rowtype;
begin
  select * into c from public.clients where id = new.client_id;
  if not found then raise exception 'client % not found', new.client_id; end if;
  new.organization_id := c.organization_id;
  new.created_by      := coalesce(new.created_by, auth.uid());
  return new;
end $$;

-- updates: caller sends { client_id, title, body }. Fill org + author.
create or replace function app.stamp_update()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.clients%rowtype;
begin
  select * into c from public.clients where id = new.client_id;
  if not found then raise exception 'client % not found', new.client_id; end if;
  new.organization_id := c.organization_id;
  new.author_id       := coalesce(new.author_id, auth.uid());
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Approval-loop RPC — clients change ONLY status via this SECURITY DEFINER
-- function, so we never grant them UPDATE on the deliverables table (they
-- couldn't be trusted to leave other columns alone). Authorization is explicit.
-- ---------------------------------------------------------------------------
create or replace function app.set_deliverable_status(
  p_deliverable uuid,
  p_status app.deliverable_status
) returns public.deliverables
  language plpgsql security definer set search_path = ''
as $$
declare d public.deliverables%rowtype;
begin
  select * into d from public.deliverables where id = p_deliverable;
  if not found then raise exception 'deliverable not found' using errcode = 'no_data_found'; end if;

  -- must be same-org agency, or the client that owns this deliverable
  if not (
       (app.is_agency() and d.organization_id = app.current_org())
    or (d.client_id = app.current_client_id())
  ) then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  update public.deliverables
     set status = p_status, updated_at = now()
   where id = p_deliverable
   returning * into d;
  return d;
end $$;

grant execute on function app.set_deliverable_status(uuid, app.deliverable_status)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Auth provisioning — when a new auth user is created, mirror a profile row
-- from the signup metadata. On real Supabase this fires on auth.users insert.
-- ---------------------------------------------------------------------------
create or replace function app.handle_new_user()
  returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, organization_id, role, full_name, email, client_id)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'organization_id')::uuid,
    coalesce((new.raw_user_meta_data ->> 'role')::app.user_role, 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'client_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ============ 0004_triggers ============
-- ============================================================================
-- 0004 — Triggers
-- ============================================================================

-- updated_at on every mutable table
create trigger t_org_touch    before update on public.organizations
  for each row execute function app.touch_updated_at();
create trigger t_client_touch before update on public.clients
  for each row execute function app.touch_updated_at();
create trigger t_user_touch   before update on public.users
  for each row execute function app.touch_updated_at();
create trigger t_project_touch before update on public.projects
  for each row execute function app.touch_updated_at();
create trigger t_milestone_touch before update on public.milestones
  for each row execute function app.touch_updated_at();
create trigger t_deliverable_touch before update on public.deliverables
  for each row execute function app.touch_updated_at();
create trigger t_request_touch before update on public.requests
  for each row execute function app.touch_updated_at();
create trigger t_invoice_touch before update on public.invoices
  for each row execute function app.touch_updated_at();

-- server-authoritative tenant stamping on insert
create trigger t_stamp_comment before insert on public.comments
  for each row execute function app.stamp_comment();
create trigger t_stamp_request before insert on public.requests
  for each row execute function app.stamp_request();
create trigger t_stamp_update  before insert on public.updates
  for each row execute function app.stamp_update();

-- (auth.users provisioning trigger intentionally omitted; profiles are linked via SQL)

-- ============ 0005_indexes ============
-- ============================================================================
-- 0005 — Indexes
-- ----------------------------------------------------------------------------
-- Rule of thumb applied here: index every column referenced by an RLS policy,
-- every foreign key, and every column used to filter/order a listing. Postgres
-- does NOT auto-index foreign keys, so we do it explicitly. Composite and
-- PARTIAL indexes target the specific hot queries the UI issues.
-- ============================================================================

-- users: helper fallback hits the PK (id); these serve joins/listing.
create index idx_users_org        on public.users (organization_id);
create index idx_users_client     on public.users (client_id) where client_id is not null;

-- clients: agency lists by org; client self-access hits the PK.
create index idx_clients_org      on public.clients (organization_id);

-- projects
create index idx_projects_org     on public.projects (organization_id);
create index idx_projects_client  on public.projects (client_id);

-- milestones: fetched per project; RLS filters by client/org.
create index idx_milestones_project on public.milestones (project_id, position);
create index idx_milestones_client  on public.milestones (client_id);
create index idx_milestones_org     on public.milestones (organization_id);

-- deliverables: several access paths.
create index idx_deliverables_org       on public.deliverables (organization_id);
create index idx_deliverables_client    on public.deliverables (client_id, shared_at desc);
create index idx_deliverables_project   on public.deliverables (project_id);
-- HOT: agency "pending approvals" queue + overview count. Partial keeps it tiny.
create index idx_deliverables_pending
  on public.deliverables (organization_id, shared_at desc)
  where status = 'shared';

-- comments: the thread, ordered, per deliverable.
create index idx_comments_deliverable on public.comments (deliverable_id, created_at);
create index idx_comments_org         on public.comments (organization_id);
create index idx_comments_client      on public.comments (client_id);

-- requests: agency board filters by status; client lists their own newest.
create index idx_requests_org_status  on public.requests (organization_id, status);
create index idx_requests_client      on public.requests (client_id, created_at desc);
-- HOT: open-request count for the overview badge.
create index idx_requests_open
  on public.requests (organization_id)
  where status = 'open';

-- invoices: summary tiles group by status; client lists their own.
create index idx_invoices_org_status  on public.invoices (organization_id, status);
create index idx_invoices_client      on public.invoices (client_id);

-- updates: feeds ordered newest-first.
create index idx_updates_org      on public.updates (organization_id, created_at desc);
create index idx_updates_client   on public.updates (client_id, created_at desc);

-- ============ 0006_rls ============
-- ============================================================================
-- 0006 — Row-Level Security  (the multi-tenancy guarantee)
-- ----------------------------------------------------------------------------
-- Model:
--   * Agency users (agency_admin | agency_member) may act on ANY row in their
--     organization.
--   * Client users may READ only rows tied to their own client_id, and may
--     INSERT comments and requests for themselves. Everything else is denied.
--
-- Performance:
--   * Every policy is scoped `TO authenticated`, so it's never evaluated for
--     the anon role.
--   * Helper calls are wrapped as `(select app.…())` so Postgres runs them once
--     per query (InitPlan) instead of once per row — the single biggest RLS
--     speedup, and the reason every predicate below uses that form.
--   * Predicates touch only same-row columns (organization_id / client_id),
--     each of which is indexed.
--
-- RLS is ENABLED (not FORCED): the table owner and service_role bypass it, so
-- migrations, seeds, and trusted server code work; PostgREST's anon/authenticated
-- roles are fully governed.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','clients','users','projects','milestones',
    'deliverables','comments','requests','invoices','updates'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---- organizations --------------------------------------------------------
create policy org_read on public.organizations
  for select to authenticated
  using (id = (select app.current_org()));

create policy org_admin_update on public.organizations
  for update to authenticated
  using (id = (select app.current_org()) and (select app.current_role()) = 'agency_admin')
  with check (id = (select app.current_org()) and (select app.current_role()) = 'agency_admin');

-- ---- users ----------------------------------------------------------------
create policy users_read on public.users
  for select to authenticated
  using (
    organization_id = (select app.current_org())
    and ((select app.is_agency()) or id = (select auth.uid()))
  );

create policy users_admin_write on public.users
  for all to authenticated
  using (organization_id = (select app.current_org()) and (select app.current_role()) = 'agency_admin')
  with check (organization_id = (select app.current_org()) and (select app.current_role()) = 'agency_admin');

-- ---- clients --------------------------------------------------------------
create policy clients_agency_all on public.clients
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy clients_client_read on public.clients
  for select to authenticated
  using (organization_id = (select app.current_org()) and id = (select app.current_client_id()));

-- ---- projects -------------------------------------------------------------
create policy projects_agency_all on public.projects
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy projects_client_read on public.projects
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ---- milestones -----------------------------------------------------------
create policy milestones_agency_all on public.milestones
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy milestones_client_read on public.milestones
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ---- deliverables ---------------------------------------------------------
-- Clients never UPDATE directly; they flip status via app.set_deliverable_status().
create policy deliverables_agency_all on public.deliverables
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy deliverables_client_read on public.deliverables
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ---- comments -------------------------------------------------------------
create policy comments_agency_all on public.comments
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy comments_client_read on public.comments
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- client may add a comment to their own deliverable (trigger stamps the keys)
create policy comments_client_insert on public.comments
  for insert to authenticated
  with check (
    organization_id = (select app.current_org())
    and client_id = (select app.current_client_id())
    and author_id = (select auth.uid())
  );

-- ---- requests -------------------------------------------------------------
create policy requests_agency_all on public.requests
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy requests_client_read on public.requests
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

create policy requests_client_insert on public.requests
  for insert to authenticated
  with check (
    organization_id = (select app.current_org())
    and client_id = (select app.current_client_id())
    and created_by = (select auth.uid())
  );

-- ---- invoices -------------------------------------------------------------
create policy invoices_agency_all on public.invoices
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy invoices_client_read on public.invoices
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ---- updates --------------------------------------------------------------
create policy updates_agency_all on public.updates
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy updates_client_read on public.updates
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ============ 0007_views ============
-- ============================================================================
-- 0007 — Aggregation views & RPCs
-- ----------------------------------------------------------------------------
-- Progress is computed in the database, not by shipping every milestone to the
-- browser and counting there. Views use security_invoker so the caller's RLS
-- still applies (a client only ever aggregates their own rows).
--
-- The two snapshot RPCs collapse a whole screen's worth of queries into ONE
-- round trip — a real latency win over the public internet.
-- ============================================================================

-- ---- progress views -------------------------------------------------------
create view public.project_progress
  with (security_invoker = true) as
select
  p.id              as project_id,
  p.organization_id,
  p.client_id,
  count(m.*) filter (where m.done)                             as done_count,
  count(m.*)                                                   as total_count,
  case when count(m.*) > 0
       then round(count(m.*) filter (where m.done)::numeric / count(m.*), 4)
       else 0 end                                             as pct
from public.projects p
left join public.milestones m on m.project_id = p.id
group by p.id;

create view public.client_progress
  with (security_invoker = true) as
select
  c.id              as client_id,
  c.organization_id,
  count(m.*) filter (where m.done)                             as done_count,
  count(m.*)                                                   as total_count,
  case when count(m.*) > 0
       then round(count(m.*) filter (where m.done)::numeric / count(m.*), 4)
       else 0 end                                             as pct
from public.clients c
left join public.milestones m on m.client_id = c.id
group by c.id;

grant select on public.project_progress, public.client_progress to authenticated;

-- ---- agency overview (one call for the dashboard header) ------------------
create or replace function app.agency_overview()
  returns jsonb
  language sql stable security invoker set search_path = public, app
as $$
  select jsonb_build_object(
    'clients',           (select count(*) from clients),
    'active_projects',   (select count(*) from projects where status <> 'delivered'),
    'pending_approvals', (select count(*) from deliverables where status = 'shared'),
    'open_requests',     (select count(*) from requests where status = 'open'),
    'outstanding_cents', (select coalesce(sum(amount_cents), 0) from invoices where status <> 'paid')
  )
$$;
grant execute on function app.agency_overview() to authenticated;

-- ---- client portal snapshot (one call for the whole branded portal) -------
-- p_client defaults to the caller's own client. RLS guarantees a client can
-- only ever see their own data even if another id is supplied.
create or replace function app.client_snapshot(p_client uuid default null)
  returns jsonb
  language sql stable security invoker set search_path = public, app
as $$
  with cid as (select coalesce(p_client, app.current_client_id()) as id)
  select jsonb_build_object(
    'client',   (select to_jsonb(c) from clients c, cid where c.id = cid.id),
    'progress', (select to_jsonb(cp) from client_progress cp, cid where cp.client_id = cid.id),
    'projects', (
      select coalesce(jsonb_agg(to_jsonb(pp) order by pp.name), '[]')
      from (
        select p.*, pr.done_count, pr.total_count, pr.pct
        from projects p
        join project_progress pr on pr.project_id = p.id
        , cid where p.client_id = cid.id
      ) pp
    ),
    'deliverables', (
      select coalesce(jsonb_agg(to_jsonb(d) order by d.shared_at desc), '[]')
      from deliverables d, cid where d.client_id = cid.id
    ),
    'invoices', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.issued desc), '[]')
      from invoices i, cid where i.client_id = cid.id
    ),
    'updates', (
      select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at desc), '[]')
      from updates u, cid where u.client_id = cid.id
    ),
    'requests', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]')
      from requests r, cid where r.client_id = cid.id
    )
  )
$$;
grant execute on function app.client_snapshot(uuid) to authenticated;

-- ============ 0008_storage ============
-- ============================================================================
-- 0008 — Storage (deliverable files)
-- ----------------------------------------------------------------------------
-- Files live in a PRIVATE bucket under the path convention:
--     {organization_id}/{client_id}/{deliverable_id}/{filename}
-- Storage RLS parses those path segments so the same tenant rules apply to
-- bytes as to rows: agency sees its org; a client sees only its own folder.
--
-- Guarded with an existence check so this migration is a harmless no-op on the
-- plain-Postgres validation harness (which has no `storage` schema).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) then
    raise notice 'storage schema absent — skipping bucket/policies (local validation)';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('deliverables', 'deliverables', false)
  on conflict (id) do nothing;

  -- read: agency in the org, or the owning client
  execute $p$
    create policy deliverable_files_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'deliverables'
        and (storage.foldername(name))[1] = (select app.current_org())::text
        and (
          (select app.is_agency())
          or (storage.foldername(name))[2] = (select app.current_client_id())::text
        )
      );
  $p$;

  -- write (upload/update/delete): agency only, within its org folder
  execute $p$
    create policy deliverable_files_write on storage.objects
      for all to authenticated
      using (
        bucket_id = 'deliverables'
        and (select app.is_agency())
        and (storage.foldername(name))[1] = (select app.current_org())::text
      )
      with check (
        bucket_id = 'deliverables'
        and (select app.is_agency())
        and (storage.foldername(name))[1] = (select app.current_org())::text
      );
  $p$;
end $$;

-- ============ 0009_realtime ============
-- ============================================================================
-- 0009 — Realtime
-- ----------------------------------------------------------------------------
-- The approval loop should feel instant: when a client approves, the agency's
-- board flips without a refresh. We add exactly the tables the UI subscribes to
-- into Supabase's realtime publication. REPLICA IDENTITY FULL lets subscribers
-- receive the previous row on UPDATE/DELETE (needed for reliable client-side
-- reconciliation and for RLS-filtered change streams).
--
-- Guarded so it's a no-op where the publication doesn't exist (local harness).
-- ============================================================================

do $$
begin
  alter table public.deliverables replica identity full;
  alter table public.comments     replica identity full;
  alter table public.requests     replica identity full;
  alter table public.updates      replica identity full;
  alter table public.milestones   replica identity full;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.deliverables, public.comments, public.requests,
      public.updates, public.milestones;
  else
    raise notice 'supabase_realtime publication absent — skipping (local validation)';
  end if;
end $$;
