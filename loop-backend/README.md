# Loop — Backend (Supabase / Postgres)

The data layer for the Loop client portal: schema, auth, **Row-Level Security
multi-tenancy**, storage, realtime, and a typed client for the frontend. Built
so an agency user and a client user log in and see completely different — and
completely correct — slices of the same database, with the query performance to
back it up.

Everything here has been applied and tested against a real PostgreSQL 16
instance. The RLS suite is **20/20 green**.

---

## Layout

```
supabase/
  migrations/
    0001_extensions.sql   pgcrypto, citext, the `app` schema
    0002_schema.sql       enums + tables (denormalized tenant keys, composite FKs)
    0003_functions.sql    tenant helpers, stamping fns, approval RPC, new-user hook
    0004_triggers.sql     updated_at, insert-stamping, auth provisioning
    0005_indexes.sql      FK / RLS / listing indexes incl. partial indexes
    0006_rls.sql          enable RLS + all tenant-isolation policies
    0007_views.sql        progress views + overview/portal snapshot RPCs
    0008_storage.sql      private deliverables bucket + path-scoped policies
    0009_realtime.sql     approval-loop tables on the realtime publication
  seed.sql                Northwind Studio + 3 clients + a full slice of data
  tests/rls_test.sh       isolation & authorization assertions (20 checks)
  config.toml             Supabase project config (exposes `app`, pooler, auth)
local/
  00_auth_shim.sql        recreates Supabase's auth surface on vanilla Postgres
  run_local.sh            one command: create db → migrate → seed → test
scripts/
  seed_demo_users.mjs     create the demo logins on a hosted project (service role)
client/
  supabase.ts             browser client
  database.types.ts       generated-style TS types
  api.ts                  typed data access mirroring the frontend store
.env.example
```

---

## Run it locally (no Supabase account)

The `local/00_auth_shim.sql` file recreates just enough of Supabase's `auth`
surface (the `auth` schema, the `anon`/`authenticated`/`service_role` roles, and
`auth.uid()` / `auth.role()` / `auth.jwt()`) that the **real, unmodified
migrations** apply on a stock Postgres and RLS can be exercised by setting a
request JWT — exactly how PostgREST does it in production.

```bash
# point at any Postgres 16 you can reach
PGBIN=/usr/lib/postgresql/16/bin PGPORT=5433 PGHOST=/tmp ./local/run_local.sh
```

That applies the shim, all nine migrations, the seed, and then runs the RLS
suite. Expected tail:

```
RESULT: 20 passed, 0 failed
```

## Run it on Supabase

```bash
supabase init            # if you don't already have a project linked
supabase start           # local stack, or `supabase link` to a hosted project
supabase db push         # applies supabase/migrations/* in order
# business data:
supabase db execute -f supabase/seed.sql          # or `supabase db reset` (runs seed.sql)
# demo logins with passwords (hosted): expose the service role key to this shell
node scripts/seed_demo_users.mjs
```

Then set **Database → Exposed schemas** to include `app` (already declared in
`config.toml`) so the RPCs are callable, and you're done.

**Demo logins**

| Role   | Email                  | Password           |
| ------ | ---------------------- | ------------------ |
| Agency | sam@northwind.studio   | `loop-demo-agency` |
| Client | dana@meridian.coffee   | `loop-demo-client` |

---

## Why it's fast — the optimization notes

The multi-tenancy is the impressive part *and* the part that's easy to make
slow. The design keeps it correct and cheap:

**Denormalized tenant keys + composite FKs.** Every tenant table carries
`organization_id` (and, where relevant, `client_id`) directly on the row, so an
RLS check is a single-column equality on the same row — never a join up the
project→client→org tree per row. Those keys can't drift because they're anchored
by composite foreign keys back to a `UNIQUE(id, organization_id)` on the parent:
a child physically cannot reference a parent in another org.

**Policies that plan as InitPlans.** Every policy calls its helper as
`(select app.current_org())` rather than `app.current_org()`. Postgres then
evaluates it **once per query** (an InitPlan / one-time filter) instead of once
per row. `EXPLAIN` confirms it — the helpers show up as `$0/$1/$2` params and a
`One-Time Filter`, and a client's deliverables query rides `idx_deliverables_client`.

**A JWT fast path with zero table I/O.** The tenant helpers first read
`app_metadata.{organization_id,role,client_id}` straight from the token (populate
it with a Supabase custom-claims auth hook) and only fall back to a one-row
profile lookup if the claim is absent. With the hook enabled, RLS touches no
tables at all to establish tenancy. Both paths are tested.

**`SECURITY DEFINER` helpers with a locked search_path.** The helpers own the
profile lookup, so they bypass `users` RLS (no recursion) and can't be hijacked
via `search_path` (`set search_path = ''`, everything schema-qualified).

**Indexes matched to real queries**, including partial indexes for the hot
counts: `idx_deliverables_pending (… where status='shared')` powers the "pending
approvals" queue and overview badge; `idx_requests_open` powers the open-request
count. Feeds are covered by `(client_id, created_at desc)` composites.

**Aggregation in the database.** `project_progress` / `client_progress` are
`security_invoker` views (so RLS still applies), and `app.agency_overview()` and
`app.client_snapshot()` each collapse a whole screen's worth of queries into one
round trip — a real latency win over the public internet.

**`TO authenticated` everywhere**, so no policy is ever evaluated for anonymous
requests. **Transaction-mode pooler** (`config.toml`) is the right default for
serverless/edge callers.

**Least privilege on the approval loop.** Clients are never granted `UPDATE` on
`deliverables`; they flip status through `app.set_deliverable_status()`, a
`SECURITY DEFINER` RPC that authorizes the caller explicitly and touches only the
status column. Inserts (comments, requests) are server-stamped by triggers, so
the client sends a minimal payload and can't forge tenant keys.

---

## What RLS guarantees (and the tests prove)

- An agency user sees **every** row in their organization; a client sees **only**
  rows tied to their own `client_id`.
- A client cannot read, approve, comment on, or file requests against another
  client's data — verified as hard failures, not empty results.
- The approval loop is authorized server-side and the status flip is visible to
  the agency immediately.
- The JWT fast path and the table fallback return identical results.

See `supabase/tests/rls_test.sh` for the exact assertions.

---

## Wiring the frontend

The included Vite frontend currently uses an in-memory `store` persisted to
localStorage. Moving it onto this backend is a swap, not a rewrite:

1. `npm i @supabase/supabase-js`, copy `client/*` into the app's `src/lib/`, and
   copy `.env.example` to `.env` with your project URL + anon key.
2. Replace the demo sign-in with `api.auth.signIn(email, password)` and gate the
   agency/client routes on the session's role.
3. Swap store selectors/actions for `api.*`: `getOverview`, `listClients`,
   `addClient`, `listProjects`, `listDeliverables`, `getComments`,
   `setDeliverableStatus`, `addComment`, `listRequests` / `addRequest` /
   `setRequestStatus`, `listInvoices`, `listUpdates` / `addUpdate`. The client
   portal can load in one call via `api.getClientSnapshot()`.
4. For the live approval loop, subscribe with `api.onDeliverableChange(...)` and
   update local state on the payload.

Because RLS does the filtering, none of these calls pass an org/client id — the
database returns exactly what the signed-in user is allowed to see. The per-client
brand accent for the branded portal comes straight off `clients.accent`.

## Regenerating types

```bash
supabase gen types typescript --local > client/database.types.ts
```
