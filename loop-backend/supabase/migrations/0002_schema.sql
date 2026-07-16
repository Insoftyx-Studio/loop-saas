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
