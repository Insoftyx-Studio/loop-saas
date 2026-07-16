# Loop — Production Go-Live Checklist

Work top to bottom. Replace `app.yourdomain.com` with your real frontend domain.

## 1. Deploy the frontend
- Host: Vercel (recommended — `vercel.json` is included with SPA routing + security headers).
- Import the `loop-portal` repo/folder. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
- Set environment variables in the host:
  - `VITE_SUPABASE_URL` = your Project URL
  - `VITE_SUPABASE_ANON_KEY` = your **Publishable** key (`sb_publishable_…`)
- Deploy, note the production URL (e.g. `https://app.yourdomain.com`).
- If you use Netlify instead of Vercel, `public/_redirects` already handles SPA routing.

## 2. Point Supabase Auth at the production domain
Dashboard → Authentication → URL Configuration:
- **Site URL** = `https://app.yourdomain.com`
- **Redirect URLs** = add `https://app.yourdomain.com/**`
- Keep `http://localhost:5173/**` too if you still develop locally.

## 3. Update the Edge Function for production
In `loop-backend`, redeploy with the hardened function and set secrets:
```
npx supabase functions deploy create-client
npx supabase secrets set \
  INVITE_MODE=password \
  APP_URL=https://app.yourdomain.com \
  ALLOWED_ORIGIN=https://app.yourdomain.com \
  RESEND_API_KEY=re_your_key \
  MAIL_FROM="Loop <noreply@yourdomain.com>"
```
- `APP_URL` — the login link in client emails points here.
- `ALLOWED_ORIGIN` — locks the function's CORS to your site (no longer `*`). Comma-separate if you have more than one origin.

## 4. Verify a sending domain in Resend
- Resend → Domains → add `yourdomain.com` → add the DNS records it shows (SPF/DKIM) at your registrar → wait for "Verified".
- Set `MAIL_FROM` to an address on that domain (step 3). Until verified, Resend only delivers to your own signup email; after verification it delivers to any client.
- Consider also setting Supabase Auth → SMTP to Resend so *auth* emails (password recovery) send reliably at scale (the default Supabase email is rate-limited).

## 5. Auth security settings
Dashboard → Authentication:
- **Sign-ups**: keep public sign-up **disabled** (only agencies you provision + clients the agency creates). Providers → Email → turn off open sign-up if present.
- **Passwords** → enable **Leaked password protection** (blocks known-breached passwords).
- **Password min length** → 8+.
- Optionally enable **MFA** for agency accounts.
- Email confirmations: for the emailed-password flow you can leave confirmations off (accounts are created pre-confirmed by the function).

## 6. Data security (verify — already configured)
- **RLS** is enabled on every table (the schema does this). Spot-check: Table Editor → any table → RLS = on.
- **Storage** `deliverables` bucket is **private**; access is path-scoped by org/client.
- **Service role / secret key** lives only in server contexts (the provisioning scripts + function secrets) — never in the frontend. If the secret key was ever exposed, rotate it: Settings → API Keys → roll the secret key, then update any script/CI that uses it.

## 7. Reliability
- **Backups**: Supabase runs automatic daily backups on paid plans — confirm your plan covers your RPO. Consider periodic `pg_dump` exports for extra safety.
- **Monitoring**: watch Dashboard → Logs (Postgres, Auth, Edge Functions) and your host's logs/analytics.
- **Rate limits**: the `create-client` function is agency-only (checks role), so it isn't publicly abusable; Supabase applies platform rate limits on auth.

## 8. Post-deploy smoke test (on the live URL)
1. Agency owner signs in.
2. Create a client account → client receives the email (with login link to your domain) → signs in → changes password.
3. Agency shares a deliverable with a file → client downloads it.
4. Client files a request; agency moves it across the board.
5. Agency posts an update + an invoice; client sees both. Toggle invoice to Paid.
6. Client approves a deliverable → agency's Deliverables page reflects it (realtime).

## Rollback notes
- Frontend: redeploy the previous build in your host.
- Function: `npx supabase functions deploy create-client` from a previous copy.
- DB: migrations are additive; restore from a Supabase backup if needed.
