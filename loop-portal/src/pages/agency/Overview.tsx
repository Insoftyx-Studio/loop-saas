import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card } from "../../components/ui/primitives";
import { Thumb, DeliverablePill } from "../../components/status";
import { Reveal, Item, fadeUp } from "../../components/motion";
import { money, timeAgo } from "../../lib/data";
import { PageHead } from "./_head";
import { getOverview, listDeliverables, listClients, type Overview as OverviewT, type Deliverable, type Client } from "../../lib/api";

function Stat({ label, value, focal }: { label: string; value: string; focal?: boolean }) {
  return (
    <Item variants={fadeUp}>
      <Card className={focal ? "relative overflow-hidden border-accent/30 bg-accent/[0.05] p-5 shadow-glow" : "p-5"}>
        {focal && <div aria-hidden className="bloom -right-6 -top-6 h-28 w-28" style={{ background: "rgb(var(--accent) / 0.4)" }} />}
        <p className="text-[12.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="mt-2 text-[28px] font-semibold tracking-tight tnum">{value}</p>
      </Card>
    </Item>
  );
}

export default function Overview() {
  const [ov, setOv] = useState<OverviewT | null>(null);
  const [pending, setPending] = useState<Deliverable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, ds, cs] = await Promise.all([getOverview(), listDeliverables(), listClients()]);
        setOv(o); setClients(cs);
        setPending(ds.filter((d) => d.status === "shared"));
      } catch { /* empty */ } finally { setLoading(false); }
    })();
  }, []);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-mute"><Loader2 className="animate-spin" size={18} /> Loading…</div>;

  return (
    <div>
      <PageHead title="Overview" sub="Your studio at a glance." />

      <Reveal className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clients" value={String(ov?.clients ?? 0)} />
        <Stat label="Active projects" value={String(ov?.active_projects ?? 0)} />
        <Stat label="Pending approvals" value={String(ov?.pending_approvals ?? 0)} focal />
        <Stat label="Open requests" value={String(ov?.open_requests ?? 0)} />
      </Reveal>

      <div className="mt-3">
        <Reveal className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Outstanding" value={money((ov?.outstanding_cents ?? 0) / 100)} />
        </Reveal>
      </div>

      <h2 className="mt-9 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Waiting on clients</h2>
      {pending.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-mute">Nothing is awaiting client review.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {pending.map((d) => (
            <Link key={d.id} to="/app/deliverables">
              <Card interactive className="flex items-center gap-3 p-3">
                <Thumb seed={d.thumb_seed} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{d.title}</p>
                  <p className="text-[12.5px] text-ink-mute">{clientName(d.client_id)} · shared {timeAgo(d.shared_at)}</p>
                </div>
                <DeliverablePill status={d.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
