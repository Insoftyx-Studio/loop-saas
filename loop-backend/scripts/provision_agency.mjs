// Product-owner tool: provision a new organization + its owner (agency_admin).
// This is the "admin creates the organization account" step. Run it yourself;
// never expose the service-role key to anyone else.
//
//   npm i @supabase/supabase-js
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/provision_agency.mjs "Agency Name" owner@email.com [password]
//
// If you omit the password, a random one is generated and printed once.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }

const [, , orgName, ownerEmail, passwordArg] = process.argv;
if (!orgName || !ownerEmail) {
  console.error('Usage: node scripts/provision_agency.mjs "Agency Name" owner@email.com [password]');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function randomPassword(len = 14) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(b, (x) => a[x % a.length]).join("");
}

// 1) organization
const { data: org, error: orgErr } = await admin
  .from("organizations")
  .insert({ name: orgName, slug: slugify(orgName) })
  .select("id")
  .single();
if (orgErr) { console.error("org create failed:", orgErr.message); process.exit(1); }

// 2) owner auth user
const password = passwordArg || randomPassword();
const meta = { full_name: orgName + " Owner", role: "agency_admin", organization_id: org.id };
const { data: u, error: uErr } = await admin.auth.admin.createUser({
  email: ownerEmail, password, email_confirm: true, user_metadata: meta, app_metadata: meta,
});
if (uErr) { console.error("owner create failed:", uErr.message); process.exit(1); }

// 3) profile
const { error: pErr } = await admin.from("users").upsert({
  id: u.user.id, organization_id: org.id, role: "agency_admin",
  full_name: meta.full_name, email: ownerEmail,
});
if (pErr) { console.error("profile link failed:", pErr.message); process.exit(1); }

console.log("✓ Organization + owner provisioned");
console.log("  Organization:", orgName, "(", org.id, ")");
console.log("  Owner login: ", ownerEmail, "/", password);
if (!passwordArg) console.log("  (random password shown once — save it)");
