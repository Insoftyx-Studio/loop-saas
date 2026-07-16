import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, ArrowLeft } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      await changePassword(pw);
      setDone(true);
    } catch (e: any) {
      setErr(e?.message ?? "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <button onClick={() => nav(-1)} className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-ink-mute hover:text-ink">
        <ArrowLeft size={15} /> Back
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">Change your password</h1>
      <p className="mt-2 text-[14px] text-ink-mute">Pick a new password for your account.</p>

      {done ? (
        <div className="mt-8 flex items-center gap-2 rounded-lg border border-edge bg-raised p-4 text-[14px]">
          <Check size={18} className="text-green-500" /> Password updated.
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password"
            className="w-full rounded-lg border border-edge bg-raised px-3.5 py-2.5 text-[14px] outline-none focus:border-accent" />
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full rounded-lg border border-edge bg-raised px-3.5 py-2.5 text-[14px] outline-none focus:border-accent" />
          {err && <p className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-500">{err}</p>}
          <button onClick={submit} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[14px] font-semibold text-paper hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Update password"}
          </button>
        </div>
      )}
    </main>
  );
}
