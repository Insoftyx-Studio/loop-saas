import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Inbox, Loader2 } from "lucide-react";
import type { CSSProperties } from "react";
import { Avatar } from "../../components/ui/primitives";
import { easeOut } from "../../components/motion";
import { PageHead } from "./_head";
import { timeAgo } from "../../lib/data";
import { listRequests, listClients, setRequestStatus, type Request, type Client } from "../../lib/api";

const columns: { key: Request["status"]; label: string; tint: string; next?: Request["status"]; nextLabel?: string }[] = [
  { key: "open", label: "To do", tint: "var(--todo)", next: "in_progress", nextLabel: "Start" },
  { key: "in_progress", label: "In progress", tint: "var(--progress)", next: "done", nextLabel: "Mark done" },
  { key: "done", label: "Completed", tint: "var(--done)" },
];

export default function Requests() {
  const [reqs, setReqs] = useState<Request[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  async function load() {
    try {
      const [rs, cs] = await Promise.all([listRequests(), listClients()]);
      setReqs(rs); setClients(cs);
    } catch { /* empty */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function advance(r: Request, to: Request["status"]) {
    await setRequestStatus(r.id, to); await load();
  }

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-mute"><Loader2 className="animate-spin" size={18} /> Loading…</div>;

  return (
    <div>
      <PageHead title="Requests" sub="Everything clients have asked for — pinned to the board." />

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((col) => {
          const items = reqs.filter((r) => r.status === col.key);
          return (
            <div key={col.key}>
              <div className="mb-3.5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: `rgb(${col.tint})` }} />
                <h2 className="text-[14px] font-semibold">{col.label}</h2>
                <span className="tnum text-[12.5px] text-ink-faint">{items.length}</span>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {items.map((r, i) => {
                    const c = clientById.get(r.client_id);
                    return (
                      <motion.div
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 10, rotate: -1.5 }}
                        animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.8 : -0.8 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.32, ease: easeOut }}
                        className="note p-4"
                        style={{ ["--note" as any]: col.tint } as CSSProperties}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar initials={c?.initials || c?.name?.slice(0, 2) || "··"} accent={c?.accent} size={24} />
                            <span className="text-[12.5px] text-ink-mute">{c?.name}</span>
                          </div>
                          <span className="text-[11px] text-ink-faint">{timeAgo(r.created_at)}</span>
                        </div>
                        <p className="mt-3 text-[15px] font-semibold leading-snug">{r.title}</p>
                        {r.detail && <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">{r.detail}</p>}
                        {col.next && (
                          <div className="mt-3 flex justify-end">
                            <button onClick={() => advance(r, col.next!)}
                              className="inline-flex items-center gap-1 rounded-md border border-edge bg-raised/60 px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-ink">
                              {col.nextLabel} <ArrowRight size={13} />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {items.length === 0 && (
                  <div className="grid place-items-center rounded-2xl border border-dashed border-edge py-14 text-center">
                    <Inbox size={22} className="text-ink-faint" />
                    <p className="mt-2 text-[13px] text-ink-faint">Nothing pinned here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
