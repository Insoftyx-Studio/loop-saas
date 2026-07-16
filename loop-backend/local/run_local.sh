#!/usr/bin/env bash
# Reproduces the full backend against a throwaway local Postgres — no Supabase
# account needed. Applies the auth shim, every migration, the seed, then runs
# the RLS test suite. Requires a running Postgres you can reach; set the vars
# below or export them first.
#
#   PGBIN  — dir with psql/pg_ctl (e.g. /usr/lib/postgresql/16/bin)
#   PGPORT — port (default 5433)
#   PGHOST — host or socket dir (default /tmp)
#
# Example (matches how this project was validated):
#   PGBIN=/usr/lib/postgresql/16/bin PGPORT=5433 PGHOST=/tmp ./local/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGPORT="${PGPORT:-5433}"
PGHOST="${PGHOST:-/tmp}"
PSQL="$PGBIN/psql -p $PGPORT -h $PGHOST -v ON_ERROR_STOP=1 -q"

echo "==> (re)creating database 'loop'"
$PGBIN/psql -p "$PGPORT" -h "$PGHOST" -c "drop database if exists loop;" -c "create database loop;"

echo "==> applying local auth shim"
$PSQL -d loop -f local/00_auth_shim.sql

echo "==> applying migrations"
for f in supabase/migrations/*.sql; do
  echo "    - $(basename "$f")"
  $PSQL -d loop -f "$f"
done

echo "==> seeding demo data"
$PSQL -d loop -f supabase/seed.sql

echo "==> running RLS test suite"
PGBIN="$PGBIN" ./supabase/tests/rls_test.sh

echo "==> done."
