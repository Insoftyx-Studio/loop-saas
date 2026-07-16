import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, KeyRound, Check, MessageSquare, Send, Download } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { getClientSnapshot, setDeliverableStatus, addRequest, getDeliverableDownloadUrl } from "../../lib/api";
import { LoopRing } from "../../components/LoopRing";

export default function PortalReal() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const [snap, setSnap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reqTitle, setReqTitle] = useState("");
  const [reqDetail, setReqDetail] = useState("");
  const [reqBusy, setReqBusy] = useState(false);

  async function load() {
    setLoading(true);
    try { setSnap(await getClientSnapshot()); setErr(null); }
    catch (e: any) { setErr(e?.message ?? "Could not load your portal."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // apply the client's brand accent
  useEffect(() => {
    const accent = snap?.client?.accent;
    if (accent) document.documentElement.style.setProperty("--accent", accent);
    return () => { document.documentElement.style.removeProperty("--accent"); };
  }, [snap]);

  const firstName = (profile?.full_name ?? "there").split(" ")[0];

  async function decide(id: string, status: "approved" | "changes_requested") {
    await setDeliverableStatus(id, status);
    await load();
  }

  async function submitRequest() {
    if (!reqTitle.trim() || !profile?.client_id) return;
    setReqBusy(true);
    try {
      await addRequest(profile.client_id, reqTitle.trim(), reqDetail.trim());
      setReqTitle(""); setReqDetail("");
      await load();
    } finally { setReqBusy(false); }
  }

  async function download(path: string) {
    try { window.open(await getDeliverableDownloadUrl(path), "_blank"); }
    catch (e: any) { alert(e?.message ?? "Could not open file"); }
  }

  if (loading)
    return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-ink-mute" /></div>;

  if (err)
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-[14px] text-red-500">{err}</p>
        <button onClick={() => signOut().then(() => nav("/login"))} className="mt-4 text-[13px] text-ink-mute underline">Sign out</button>
      </div>
    );

  const client = snap?.client;
  const projects = snap?.projects ?? [];
  const deliverables = snap?.deliverables ?? [];
  const invoices = snap?.invoices ?? [];
  const updates = snap?.updates ?? [];
  const pending = deliverables.filter((d: any) => d.status === "shared");

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg text-white" style={{ background: "rgb(var(--accent))" }}>
            {(client?.initials ?? client?.name?.slice(0, 2) ?? "··").toString()}
          </span>
          <div>
            <p className="text-[15px] font-semibold">{client?.name}</p>
            <p className="text-[12.5px] text-ink-mute">Your portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav("/change-password")} className="inline-flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1.5 text-[12.5px] text-ink-mute hover:text-ink">
            <KeyRound size={14} /> Password
          </button>
          <button onClick={() => signOut().then(() => nav("/login"))} className="inline-flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1.5 text-[12.5px] text-ink-mute hover:text-ink">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <h1 className="mt-8 font-display text-[clamp(1.6rem,3vw,2.2rem)]">Welcome back, {firstName}.</h1>

      {/* Approvals */}
      <section className="mt-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Waiting on you</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-mute">Nothing to review right now.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {pending.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border border-edge bg-raised p-3.5">
                <MessageSquare size={18} className="text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{d.title}</p>
                  <p className="text-[12.5px] text-ink-mute">{d.kind}</p>
                </div>
                {d.storage_path && (
                  <button onClick={() => download(d.storage_path)} className="inline-flex items-center gap-1 rounded-md border border-edge px-2.5 py-1.5 text-[12.5px] hover:bg-sunk"><Download size={13} /> Download</button>
                )}
                <button onClick={() => decide(d.id, "changes_requested")} className="rounded-md border border-edge px-2.5 py-1.5 text-[12.5px] hover:bg-sunk">Request changes</button>
                <button onClick={() => decide(d.id, "approved")} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-2.5 py-1.5 text-[12.5px] font-semibold text-paper hover:opacity-90">
                  <Check size={14} /> Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Projects */}
      <section className="mt-10">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Projects</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {projects.map((p: any) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-edge bg-raised p-4">
              <LoopRing pct={Number(p.pct ?? 0)} size={46} />
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold">{p.name}</p>
                <p className="text-[12.5px] text-ink-mute">{p.done_count}/{p.total_count} milestones</p>
              </div>
            </div>
          ))}
          {projects.length === 0 && <p className="text-[14px] text-ink-mute">No projects yet.</p>}
        </div>
      </section>

      {/* Invoices + updates */}
      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Invoices</h2>
          <div className="mt-3 space-y-2">
            {invoices.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between rounded-lg border border-edge bg-raised p-3 text-[13.5px]">
                <span>{i.number}</span>
                <span className="tnum">${(i.amount_cents / 100).toLocaleString()}</span>
                <span className="text-ink-mute">{i.status}</span>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-[14px] text-ink-mute">No invoices.</p>}
          </div>
        </div>
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Updates</h2>
          <div className="mt-3 space-y-2">
            {updates.map((u: any) => (
              <div key={u.id} className="rounded-lg border border-edge bg-raised p-3">
                <p className="text-[13.5px] font-semibold">{u.title}</p>
                <p className="text-[12.5px] text-ink-mute">{u.body}</p>
              </div>
            ))}
            {updates.length === 0 && <p className="text-[14px] text-ink-mute">No updates yet.</p>}
          </div>
        </div>
      </section>

      {/* All deliverables (with downloads) */}
      <section className="mt-10">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Deliverables</h2>
        <div className="mt-3 space-y-2">
          {deliverables.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border border-edge bg-raised p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{d.title}</p>
                <p className="text-[12px] text-ink-mute capitalize">{d.kind} · {String(d.status).replace("_", " ")}</p>
              </div>
              {d.storage_path ? (
                <button onClick={() => download(d.storage_path)} className="inline-flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1.5 text-[12.5px] hover:bg-sunk"><Download size={14} /> Download</button>
              ) : (
                <span className="text-[12px] text-ink-faint">No file</span>
              )}
            </div>
          ))}
          {deliverables.length === 0 && <p className="text-[14px] text-ink-mute">Nothing shared yet.</p>}
        </div>
      </section>

      {/* Requests */}
      <section className="mt-10 mb-16">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Requests</h2>
        <div className="mt-3 rounded-xl border border-edge bg-raised p-4">
          <input
            value={reqTitle}
            onChange={(e) => setReqTitle(e.target.value)}
            placeholder="What would you like to ask for?"
            className="w-full rounded-lg border border-edge bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
          />
          <textarea
            value={reqDetail}
            onChange={(e) => setReqDetail(e.target.value)}
            placeholder="Any details… (optional)"
            className="mt-2 w-full rounded-lg border border-edge bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
            rows={2}
          />
          <div className="mt-2 flex justify-end">
            <button onClick={submitRequest} disabled={reqBusy || !reqTitle.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper hover:opacity-90 disabled:opacity-50">
              {reqBusy ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> Send request</>}
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {(snap?.requests ?? []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-edge bg-raised p-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold">{r.title}</p>
                {r.detail && <p className="truncate text-[12.5px] text-ink-mute">{r.detail}</p>}
              </div>
              <span className="ml-3 shrink-0 rounded-full border border-edge px-2 py-0.5 text-[11.5px] capitalize text-ink-mute">{String(r.status).replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
