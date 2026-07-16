// Creates the four demo logins on a HOSTED Supabase project, with passwords and
// the app_metadata the RLS fast-path reads. Run AFTER supabase/seed.sql (the
// org + clients must exist so the profile trigger can attach each user).
//
//   npm i @supabase/supabase-js
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_demo_users.mjs
//
// Uses the service_role (or new secret) key. Safe to re-run: it deletes an
// existing user with the same email first. Never expose the key in a browser.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const ORG = "10000000-0000-0000-0000-000000000001";
const users = [
  { email: "sam@northwind.studio", password: "loop-demo-agency",
    meta: { full_name: "Sam Rourke", role: "agency_admin", organization_id: ORG } },
  { email: "dana@meridian.coffee", password: "loop-demo-client",
    meta: { full_name: "Dana Whitfield", role: "client", organization_id: ORG,
            client_id: "20000000-0000-0000-0000-000000000001" } },
  { email: "marco@atlasfit.com", password: "loop-demo-client",
    meta: { full_name: "Marco Reyes", role: "client", organization_id: ORG,
            client_id: "20000000-0000-0000-0000-000000000002" } },
  { email: "priya@verdanthome.co", password: "loop-demo-client",
    meta: { full_name: "Priya Anand", role: "client", organization_id: ORG,
            client_id: "20000000-0000-0000-0000-000000000003" } },
];

// Map existing emails -> id so we can make this idempotent.
async function existingByEmail() {
  const map = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data.users) map.set(u.email, u.id);
    if (data.users.length < 200) break;
    page++;
  }
  return map;
}

const existing = await existingByEmail();
let ok = 0;

for (const u of users) {
  if (existing.has(u.email)) {
    await admin.auth.admin.deleteUser(existing.get(u.email)).catch(() => {});
  }
  const { error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    app_metadata: u.meta,   // -> RLS fast path (zero table I/O)
    user_metadata: u.meta,  // -> profile trigger
  });
  if (error) {
    const detail = error.message || error.code || JSON.stringify(error);
    console.log(`X ${u.email}: [${error.status ?? "?"}] ${detail}`);
  } else {
    console.log(`OK ${u.email}`);
    ok++;
  }
}

console.log(`\n${ok}/${users.length} users created.`);
if (ok === users.length) {
  console.log("Demo logins:");
  console.log("  Agency  sam@northwind.studio / loop-demo-agency");
  console.log("  Client  dana@meridian.coffee / loop-demo-client");
} else {
  console.log("If you see a database error above, run supabase/seed.sql first (it creates the org + clients the profile trigger needs), then re-run this.");
}
