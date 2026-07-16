// Verifies the demo logins actually work by signing in with the public anon
// key — exactly what the frontend will do. If this prints a session + role,
// the users are real and the [500] from the admin script was cosmetic.
//
//   npm i @supabase/supabase-js
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/test_login.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  process.exit(1);
}

const sb = createClient(url, anon, { auth: { persistSession: false } });

const logins = [
  ["sam@northwind.studio", "loop-demo-agency"],
  ["dana@meridian.coffee", "loop-demo-client"],
];

for (const [email, password] of logins) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    console.log(`X ${email}: ${error.message}`);
    continue;
  }
  // read the profile the session can now see (RLS lets a user read their own row)
  const { data: prof } = await sb
    .from("users")
    .select("role, organization_id, client_id")
    .eq("id", data.user.id)
    .single();
  console.log(`OK ${email} -> role=${prof?.role ?? "?"} org=${prof?.organization_id ? "yes" : "no"}`);
  await sb.auth.signOut();
}
