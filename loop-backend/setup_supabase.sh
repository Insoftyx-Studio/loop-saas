#!/usr/bin/env bash
# ============================================================================
# Connect this backend to a live Supabase project — one command.
#
#   1. cp setup.env.example setup.env   &&   fill in the values
#   2. ./setup_supabase.sh
#
# It logs in, links, pushes all migrations, seeds the demo data, creates the
# demo logins, and prints what's left (one dashboard toggle). Your credentials
# never leave this machine — they're read from setup.env, which is git-ignored.
#
# Requirements: Node 20+ (for the Supabase CLI + the demo-user script).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

# ---- load credentials ------------------------------------------------------
if [ ! -f setup.env ]; then
  echo "✗ setup.env not found. Run:  cp setup.env.example setup.env  then fill it in."
  exit 1
fi
set -a; . ./setup.env; set +a

need() { [ -n "${!1:-}" ] || { echo "✗ $1 is empty in setup.env"; exit 1; }; }
need SUPABASE_ACCESS_TOKEN
need SUPABASE_PROJECT_REF
need SUPABASE_DB_PASSWORD
need SUPABASE_URL
need SUPABASE_SERVICE_ROLE_KEY

SB="npx --yes supabase@latest"
export SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD

echo "==> 1/5  Linking to project $SUPABASE_PROJECT_REF"
$SB link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null
echo "    linked."

echo "==> 2/5  Pushing migrations (schema, RLS, functions, indexes, storage, realtime)"
$SB db push
echo "    schema is live."

echo "==> 3/5  Seeding demo data (Northwind Studio + clients + sample data)"
if [ -n "${SUPABASE_DB_URL:-}" ] && command -v psql >/dev/null 2>&1; then
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql >/dev/null
  echo "    seeded via psql."
else
  echo "    ! No SUPABASE_DB_URL (or psql not installed)."
  echo "    ! Open the dashboard SQL Editor and run the contents of supabase/seed.sql,"
  echo "      then re-run steps 4-5 below. Skipping auto-seed."
fi

echo "==> 4/5  Creating demo logins (agency + clients, with passwords)"
if [ ! -d node_modules/@supabase/supabase-js ]; then
  npm i --no-save @supabase/supabase-js >/dev/null 2>&1
fi
node scripts/seed_demo_users.mjs

echo "==> 5/5  Generating TypeScript types from the live schema"
$SB gen types typescript --linked > client/database.types.ts 2>/dev/null \
  && echo "    wrote client/database.types.ts" \
  || echo "    (skipped type generation — not required)"

cat <<EOF

============================================================
✓ Backend connected.

One manual step left (30 seconds), because it's a dashboard toggle:
  Project Settings → API → Exposed schemas → add:  app
  (lets the app.* RPCs be called: agency_overview, client_snapshot,
   set_deliverable_status)

Demo logins:
  Agency  sam@northwind.studio   / loop-demo-agency
  Client  dana@meridian.coffee   / loop-demo-client

Frontend wiring: put these in your app's .env
  VITE_SUPABASE_URL=$SUPABASE_URL
  VITE_SUPABASE_ANON_KEY=<your anon key from Settings → API>
and copy client/* into the app's src/lib/.
============================================================
EOF
