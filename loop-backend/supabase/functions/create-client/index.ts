// Supabase Edge Function: create-client
// ---------------------------------------------------------------------------
// An agency admin calls this to onboard a client. It:
//   1. verifies the CALLER is an agency_admin (from their JWT), and finds their org
//   2. creates (or reuses) the client company row in that org
//   3. creates the client's auth user with a RANDOM password
//   4. emails the password to the client (the agency never sees it)
//   5. writes the client's profile row (role=client, linked to org + client)
//
// The service-role key stays server-side here — never in the browser.
//
// Env (Project Settings -> Edge Functions -> Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-injected by Supabase)
//   INVITE_MODE = "password" (default) | "invite"
//   RESEND_API_KEY, MAIL_FROM   (needed for password mode email)
// ---------------------------------------------------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lock CORS to your site(s) in production: set ALLOWED_ORIGIN to a comma-separated
// list (e.g. "https://app.yourdomain.com"). Falls back to "*" if unset.
const ALLOWED = (Deno.env.get("ALLOWED_ORIGIN") ?? "*").split(",").map((s) => s.trim());
function corsFor(origin: string | null) {
  const allow = ALLOWED.includes("*") ? "*" : (origin && ALLOWED.includes(origin) ? origin : ALLOWED[0]);
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function randomPassword(len = 14) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  const cors = corsFor(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, cors);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const mode = (Deno.env.get("INVITE_MODE") ?? "password").toLowerCase();

  // Admin client (bypasses RLS) for privileged work.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- 1. authenticate the caller & confirm they're an agency admin ----------
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "missing Authorization bearer token" }, 401, cors);

  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes.user) return json({ error: "invalid session" }, 401, cors);

  const { data: caller, error: profErr } = await admin
    .from("users")
    .select("role, organization_id")
    .eq("id", userRes.user.id)
    .single();
  if (profErr || !caller) return json({ error: "no profile for caller" }, 403, cors);
  if (caller.role !== "agency_admin" && caller.role !== "agency_member")
    return json({ error: "only agency users can create client accounts" }, 403, cors);

  const orgId = caller.organization_id;

  // --- 2. read + validate input ---------------------------------------------
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid JSON body" }, 400, cors); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const clientName = String(body.clientName ?? "").trim();
  const contactName = String(body.contactName ?? "").trim();
  const accent = String(body.accent ?? "99 91 255");
  if (!email || !clientName)
    return json({ error: "email and clientName are required" }, 400, cors);

  // --- 3. create (or reuse) the client company in the caller's org ----------
  let clientId: string | undefined = body.clientId;
  if (!clientId) {
    const initials = clientName.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const { data: newClient, error: cErr } = await admin
      .from("clients")
      .insert({ organization_id: orgId, name: clientName, contact: contactName, email, accent, initials })
      .select("id")
      .single();
    if (cErr) return json({ error: `could not create client: ${cErr.message}` }, 400, cors);
    clientId = newClient.id;
  }

  const meta = {
    full_name: contactName || clientName,
    role: "client",
    organization_id: orgId,
    client_id: clientId,
  };

  // --- 4. create the auth user ----------------------------------------------
  let userId: string;
  let tempPassword: string | null = null;

  if (mode === "invite") {
    // Supabase sends a built-in invite email; the client sets their own password.
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: meta });
    if (error) return json({ error: `invite failed: ${error.message}` }, 400, cors);
    userId = data.user.id;
  } else {
    // Random password, emailed to the client. The agency never receives it.
    tempPassword = randomPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: meta,
      app_metadata: meta,
    });
    if (error) return json({ error: `create user failed: ${error.message}` }, 400, cors);
    userId = data.user.id;

    const appUrl = Deno.env.get("APP_URL") ?? "";
    const sent = await sendPasswordEmail(email, tempPassword, clientName, appUrl);
    if (!sent.ok) {
      // account exists but email couldn't go out — surface clearly
      return json({
        ok: true,
        warning: `Account created but the email could not be sent (${sent.reason}). ` +
                 `Configure RESEND_API_KEY + MAIL_FROM, or use the client's "forgot password".`,
        clientId, userId,
      }, 200, cors);
    }
  }

  // --- 5. ensure the profile row exists (service role bypasses RLS) ----------
  const { error: upErr } = await admin.from("users").upsert({
    id: userId,
    organization_id: orgId,
    role: "client",
    full_name: meta.full_name,
    email,
    client_id: clientId,
  });
  if (upErr) return json({ error: `profile link failed: ${upErr.message}` }, 400, cors);

  return json({ ok: true, clientId, userId, mode }, 200, cors);
});

async function sendPasswordEmail(to: string, password: string, clientName: string, appUrl: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM");
  if (!key || !from) return { ok: false, reason: "email not configured" };

  const loginUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/login` : "";
  const button = loginUrl
    ? `<p style="margin:24px 0"><a href="${loginUrl}" style="background:#5b5bff;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;display:inline-block">Go to your login</a></p>`
    : "";
  const linkLine = loginUrl ? `<p style="font-size:13px;color:#666">Or paste this link: ${loginUrl}</p>` : "";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `Your ${clientName} portal login`,
        html:
          `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#111">` +
          `<h2 style="margin:0 0 8px">Welcome to your ${clientName} portal</h2>` +
          `<p>An account has been created for you. Use these details to sign in:</p>` +
          `<div style="background:#f5f5f7;border-radius:10px;padding:16px;margin:16px 0">` +
          `<p style="margin:0 0 6px"><b>Email:</b> ${to}</p>` +
          `<p style="margin:0"><b>Temporary password:</b> <code style="font-size:15px">${password}</code></p>` +
          `</div>` +
          button +
          linkLine +
          `<p style="color:#444">For your security, please change your password after your first sign-in ` +
          `(top-right of your portal &rarr; Password).</p>` +
          `</div>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: `resend ${res.status} ${body}`.slice(0, 300) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
