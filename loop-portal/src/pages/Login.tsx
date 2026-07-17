import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      nav("/app"); // guards route agency -> /app, client -> /portal by role
    } catch (e: any) {
      setErr(e?.message ?? "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen w-full lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(50% 55% at 20% 15%, rgb(var(--accent) / 0.32), transparent 60%)" }}
        />
        <Link to="/" className="relative text-paper">
          <span className="inline-flex items-center gap-2.5">
            <svg width={22} height={22} viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="3" opacity="0.32" />
              <path d="M16 5 a11 11 0 0 1 9.5 5.5" stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-[17px] font-semibold tracking-tightest">Loop</span>
          </span>
        </Link>
        <div className="relative">
          <p className="font-display text-[clamp(2rem,3vw,3rem)] leading-[1.05]">
            Everything your clients need, in one calm place.
          </p>
          <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-paper/60">
            Agencies run every engagement from one dashboard. Each client signs in to their own
            branded portal.
          </p>
        </div>
        <p className="relative text-[12.5px] text-paper/45">Loop · client portal</p>
      </aside>

      <section className="relative flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-mute transition-colors hover:text-ink lg:hidden">
            <ArrowLeft size={15} /> Back
          </Link>
          <div className="hidden lg:block"><Logo showText={false} /></div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-[14px] text-ink-mute">Use the email and password for your account.</p>

            <div className="mt-8 space-y-3">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-mute">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-edge bg-raised px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-mute">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-edge bg-raised px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-accent"
                />
              </div>

              {err && (
                <p className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-500">{err}</p>
              )}

              <button
                onClick={submit}
                disabled={busy || !email || !password}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[14px] font-semibold text-paper transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <>Sign in <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>}
              </button>
            </div>

            <p className="mt-6 text-[12.5px] text-ink-faint">
              Clients: your login was emailed to you when your account was created. You can change
              your password after signing in.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
