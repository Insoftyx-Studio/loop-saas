#!/usr/bin/env bash
set -uo pipefail
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PORT="${PGPORT:-5433}"
HOST="${PGHOST:-/tmp}"
PSQL="$PGBIN/psql -p $PORT -h $HOST -d loop -tAX"
[ -n "${PGUSER:-}" ] && PSQL="$PSQL -U $PGUSER"
AGENCY='30000000-0000-0000-0000-000000000001'
MERIDIAN='30000000-0000-0000-0000-0000000000a1'
ATLAS='30000000-0000-0000-0000-0000000000a2'
DELIV_MERIDIAN_SHARED='50000000-0000-0000-0000-000000000001'
DELIV_ATLAS_SHARED='50000000-0000-0000-0000-000000000004'
CLIENT_MERIDIAN='20000000-0000-0000-0000-000000000001'
CLIENT_ATLAS='20000000-0000-0000-0000-000000000002'
ORG='10000000-0000-0000-0000-000000000001'
pass=0; fail=0

raw() { # uid, sql, [appmeta] -> full psql output
  local uid="$1"; local sql="$2"; local meta="${3:-}"; local claims
  if [ -n "$meta" ]; then claims="{\"sub\":\"$uid\",\"role\":\"authenticated\",\"app_metadata\":$meta}"
  else claims="{\"sub\":\"$uid\",\"role\":\"authenticated\"}"; fi
  local f=/tmp/loop_q.sql
  { echo "begin;"
    echo "set local role authenticated;"
    printf "do \$\$ begin perform set_config('request.jwt.claims', '%s', true); end \$\$;\n" "$claims"
    echo "$sql"
    echo "commit;"; } > "$f"; chmod 644 "$f"
  $PSQL -f "$f" 2>&1
}
run() { # -> scalar (last data line, tags filtered)
  raw "$@" | grep -vE '^(BEGIN|SET|DO|COMMIT|ROLLBACK|START TRANSACTION|INSERT [0-9]|UPDATE [0-9]|DELETE [0-9])' | grep -v '^$' | tail -n1
}

check() { if [ "$2" = "$3" ]; then echo "  OK  $1 ($2)"; pass=$((pass+1)); else echo "  XX  $1 — expected [$3] got [$2]"; fail=$((fail+1)); fi; }
expect_error() { local out; out=$(raw "$1" "$2"); if echo "$out" | grep -qiE 'ERROR|not authorized|denied|violates|insufficient'; then echo "  OK  $3 (blocked)"; pass=$((pass+1)); else echo "  XX  $3 — expected error, got [$(echo "$out"|tail -n1)]"; fail=$((fail+1)); fi; }

echo "AGENCY ADMIN sees the whole org:"
check "clients visible"      "$(run $AGENCY 'select count(*) from clients;')"       "3"
check "projects visible"     "$(run $AGENCY 'select count(*) from projects;')"      "4"
check "deliverables visible" "$(run $AGENCY 'select count(*) from deliverables;')"  "5"
check "pending approvals"    "$(run $AGENCY "select (app.agency_overview()->>'pending_approvals');")" "2"
check "outstanding cents"    "$(run $AGENCY "select (app.agency_overview()->>'outstanding_cents');")" "900000"

echo "MERIDIAN CLIENT sees only their own slice:"
check "clients visible"      "$(run $MERIDIAN 'select count(*) from clients;')"      "1"
check "own client id"        "$(run $MERIDIAN 'select id from clients;')"            "$CLIENT_MERIDIAN"
check "projects visible"     "$(run $MERIDIAN 'select count(*) from projects;')"     "2"
check "deliverables visible" "$(run $MERIDIAN 'select count(*) from deliverables;')" "3"
check "invoices visible"     "$(run $MERIDIAN 'select count(*) from invoices;')"     "2"
check "cannot see Atlas rows" "$(run $MERIDIAN "select count(*) from deliverables where client_id='$CLIENT_ATLAS';")" "0"
check "requests visible (own)" "$(run $MERIDIAN 'select count(*) from requests;')"   "1"

echo "APPROVAL LOOP:"
check "client approves own deliverable" "$(run $MERIDIAN "select status from app.set_deliverable_status('$DELIV_MERIDIAN_SHARED','approved');")" "approved"
check "agency now sees it approved"     "$(run $AGENCY "select status from deliverables where id='$DELIV_MERIDIAN_SHARED';")" "approved"
expect_error $MERIDIAN "select app.set_deliverable_status('$DELIV_ATLAS_SHARED','approved');" "client cannot approve another client's deliverable"

echo "WRITE ISOLATION:"
expect_error $MERIDIAN "insert into requests (client_id,title,detail) values ('$CLIENT_ATLAS','x','y');" "client cannot file a request for another client"
check "client CAN file own request"     "$(run $MERIDIAN "insert into requests (client_id,title,detail) values ('$CLIENT_MERIDIAN','New flyer','A5 please') returning 'ok';")" "ok"
expect_error $MERIDIAN "insert into comments (deliverable_id,body) values ('$DELIV_ATLAS_SHARED','sneaky');" "client cannot comment on another client's deliverable"
check "client CAN comment on own deliverable" "$(run $MERIDIAN "insert into comments (deliverable_id,body) values ('$DELIV_MERIDIAN_SHARED','Looks great!') returning 'ok';")" "ok"

echo "FAST PATH (JWT app_metadata, zero table I/O):"
check "atlas via JWT claims sees only own deliverables" "$(run $ATLAS 'select count(*) from deliverables;' "{\"organization_id\":\"$ORG\",\"role\":\"client\",\"client_id\":\"$CLIENT_ATLAS\"}")" "1"

echo ""
echo "RESULT: $pass passed, $fail failed"
[ "$fail" = "0" ]
