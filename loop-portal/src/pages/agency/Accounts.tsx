import { useEffect, useState } from "react";
import { Loader2, UserPlus, Check, Mail } from "lucide-react";
import { listClients, createClientAccount } from "../../lib/api";
import { Avatar } from "../../components/ui/primitives";

export default function Accounts() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try { setClients(await listClients()); } catch { /* RLS/empty */ } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function submit() {
    setErr(null); setMsg(null);
    if (!clientName || !email) return setErr("Client name and email are required.");
    setBusy(true);
    try {
      const res = await createClientAccount({ clientName, contactName, email });
      setMsg(res.warning ?? `Account created — a login was emailed to ${email}.`);
      setClientName(""); setContactName(""); setEmail("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Client accounts</h1>
          <p className="mt-1 text-[14px] text-ink-mute">Create a client login. A password is emailed to them; you never see it.</p>
        </div>
        <button onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-[13.5px] font-semibold text-paper hover:opacity-90">
          <UserPlus size={16} /> New client account
        </button>
      </div>

      {open && (
        <div className="mt-6 rounded-xl border border-edge bg-raised p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-mute">Client / company name</label>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Meridian Coffee"
                className="w-full rounded-lg border border-edge bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-accent" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-mute">Contact name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Dana Whitfield"
                className="w-full rounded-lg border border-edge bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-accent" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-mute">Client email (their login)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dana@meridian.coffee"
                className="w-full rounded-lg border border-edge bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-accent" />
            </div>
          </div>
          {err && <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-500">{err}</p>}
          {msg && <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-[13px] text-green-600"><Check size={15} /> {msg}</p>}
          <div className="mt-4">
            <button onClick={submit} disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={16} /> Create & email login</>}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Clients</h2>
        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-[14px] text-ink-mute"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : clients.length === 0 ? (
          <p className="mt-4 text-[14px] text-ink-mute">No clients yet. Create your first account above.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-edge bg-raised p-3">
                <Avatar initials={c.initials || c.name?.slice(0, 2)} accent={c.accent} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{c.name}</p>
                  <p className="truncate text-[12.5px] text-ink-mute">{c.contact} · {c.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
