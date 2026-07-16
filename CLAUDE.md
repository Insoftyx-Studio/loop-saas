# Loop — Agency Client Portal

Two-sided SaaS: an agency manages clients/projects/deliverables; each client signs
in to their own branded portal. Live on Supabase.

## Repo layout

```
loop/
  loop-portal/    frontend — Vite + React 18 + TS + Tailwind v3 + framer-motion
  loop-backend/   Supabase — SQL schema, Edge Function, admin scripts
```

## Stack

- **Frontend**: Vite, React 18, TypeScript, Tailwind v3, framer-motion, react-router-dom,
  lucide-react, @supabase/supabase-js. Fonts: Clash Display (display) + Satoshi (UI).
- **Backend**: Supabase — Postgres + Auth + RLS + Storage + Realtime + Edge Functions.
- **Email**: Resend, called from the `create-client` Edge Function.
- **Host**: Vercel (`vercel.json` has SPA rewrites + security headers).

## Commands

```bash
# frontend (run from loop-portal/)
npm install
npm run dev            # http://localhost:5173
npm run build          # tsc -b && vite build — MUST pass before shipping

# backend (run from loop-backend/)
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase functions deploy create-client
npx supabase secrets set KEY=value
```

Environment (Windows/PowerShell is the user's shell — no bash, no `sudo`):
- `loop-portal/.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key)
- Never commit `.env` or `setup.env`. Both are gitignored.

## Architecture — the important parts

### Multi-tenancy (the core guarantee)
Every tenant table carries `organization_id` (and client-scoped tables carry
`client_id`) **denormalized on the row**, so each RLS check is a single-column
equality — no per-row joins. Integrity is held by composite FKs to
`UNIQUE(id, organization_id)` parents: a child physically cannot reference a
parent in another org.

RLS policies are all `TO authenticated` and wrap helpers as `(select app.current_org())`
so Postgres evaluates them **once per query** (InitPlan), not per row. Verified with
EXPLAIN: helpers appear as One-Time Filter / `$0,$1,$2`.

Helpers live in the `app` schema (`current_org`, `current_role`, `current_client_id`,
`is_agency`), are `SECURITY DEFINER` with `set search_path = ''`, and read
`app_metadata` from the JWT first (zero table I/O) with a users-table fallback.

### `app` schema RPCs
- `app.agency_overview()` → one-call dashboard stats
- `app.client_snapshot(uuid)` → the whole client portal in one call
- `app.set_deliverable_status(uuid, status)` → the approval loop; clients are never
  granted UPDATE on deliverables, they go through this RPC which authorizes explicitly

**The `app` schema must be exposed in the dashboard** (Settings → Data API → Exposed
schemas) or every RPC 404s.

### ⚠️ NO TRIGGER ON `auth.users` — do not add one
An `after insert` trigger on `auth.users` that wrote to `public.users` caused
**"Database error creating new user"** on every signup (hosted GoTrue runs in a context
subject to RLS, with no logged-in user at signup). Hours were lost to this. The schema
is deliberately trigger-free; profiles are provisioned explicitly:
- agency owner → `scripts/provision_agency.mjs` (service role)
- client → the `create-client` Edge Function (service role, upserts the profile)

If a future feature seems to want that trigger, don't. Provision in the server-side
path that already has service-role access.

### Account flows (by design — no public sign-up)
1. **Product owner** provisions an org + owner:
   `node scripts/provision_agency.mjs "Agency Name" owner@email.com`
2. **Agency admin** creates a client via the **Accounts** page → the `create-client`
   Edge Function: verifies the caller is agency, creates the client company row,
   creates the auth user with a **random password**, emails it (Resend) with a link
   to `${APP_URL}/login`, upserts the profile. The agency never sees the password.
3. **Client** signs in and can change their password (`/change-password`).

`INVITE_MODE` secret switches the function between `password` (emailed password,
current) and `invite` (Supabase invite link, client sets own password).

### Storage
Private `deliverables` bucket. Path convention **`{org}/{client}/{deliverable}/{file}`** —
storage RLS parses those segments, so a client can only download their own files.
Agency uploads; client downloads via short-lived signed URLs.

### Realtime
`deliverables`, `comments`, `requests`, `updates`, `milestones` are in the
`supabase_realtime` publication. The agency Deliverables page subscribes so a client's
approval flips status live.

## Frontend conventions

- `src/lib/auth.tsx` — `AuthProvider`: real Supabase session + profile; mirrors into the
  legacy `store` session so older components keep working. Route guards by role:
  `RequireAgency`, `RequireClient`, `RequireAuth`.
- `src/lib/api.ts` — all data access. **RLS does the filtering**, so these calls never
  pass an org/client filter; the DB returns only what the user may see.
- `src/lib/supabase.ts` — browser client.
- Pages are lazy-loaded in `App.tsx` (code-split per route).
- Client brand accent comes from `clients.accent` ("r g b") and overrides the `--accent`
  CSS var in the portal.
- **Only the client approves.** The agency deliverable drawer intentionally has no
  approve/request-changes buttons — status + comments only.
- Design language: quiet/editorial. `.note` = sticky-note card (Requests board),
  `.glass`, `.bloom`, `LoopRing` = animated progress ring.

## State of play

Live on Supabase: Login, Accounts, Clients, ClientDetail, Projects + milestones,
Deliverables + approval loop + file upload/download, Requests board, Invoices
(+ status updates), Updates, Overview stats, client portal (snapshot RPC, downloads,
request form, change password).

Nothing is on mock data anymore. `src/lib/store.tsx` still exists for the session
bridge; `src/lib/data.ts` still provides `money`/`timeAgo`/`fmtDate` helpers.

## Gotchas learned the hard way

- Supabase's newer key names: **publishable** = old anon (frontend), **secret** = old
  service_role (server only, bypasses RLS — never in the browser).
- `config.toml` `db.major_version` must match the project's Postgres version or
  `db push` refuses to run.
- Edge Function CORS must allow `authorization, x-client-info, apikey, content-type`
  or the browser preflight fails. `ALLOWED_ORIGIN` secret locks it to the real domain.
- Resend only delivers to your own signup address until a domain is verified.
- `npm run build` is the gate — TypeScript errors are caught there, not by `dev`.
