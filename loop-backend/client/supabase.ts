import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_. For Next.js use NEXT_PUBLIC_*.
const url =
  import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env and fill VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
  );
}

// One client for the whole app. The anon key is safe in the browser — RLS is
// what actually protects the data, and every request carries the user's JWT.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
  // `app` is where our RPCs live; expose it so supabase.schema('app').rpc(...) works.
  db: { schema: "public" },
});
