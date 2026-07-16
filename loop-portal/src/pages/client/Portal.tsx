import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock3, LogOut, Plus, Send } from "lucide-react";
import { useStore, projectProgress, clientProgress } from "../../lib/store";
import { Card, Avatar, Pill } from "../../components/ui/primitives";
import { LoopRing } from "../../components/LoopRing";
import { Button } from "../../components/ui/Button";
import { Input, Textarea, FieldLabel } from "../../components/ui/Field";
import { Drawer } from "../../components/ui/Drawer";
import { DeliverableReview } from "../../components/DeliverableReview";
import { Thumb, DeliverablePill, InvoicePill, RequestPill } from "../../components/status";
import { ThemeToggle } from "../../components/ThemeToggle";
import { Reveal, Item, fadeUp, easeOut } from "../../components/motion";
import { money, fmtDate, timeAgo, dueLabel, type Deliverable } from "../../lib/data";

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.12em] text-ink-faint">
      {children}
    </h2>
  );
}

export default function Portal() {
  const { db, session, signOut } = useStore();
  const nav = useNavigate();
  const [active, setActive] = useState<Deliverable | null>(null);
  const [reqTitle, setReqTitle] = useState("");
  const [reqDetail, setReqDetail] = useState("");
  const { addRequest } = useStore();

  const clientId = session?.kind === "client" ? session.clientId : "";
  const client = db.clients.find((c) => c.id === clientId);

  const data = useMemo(() => {
    if (!client) return null;
    return {
      projects: db.projects.filter((p) => p.clientId === client.id),
      deliverables: db.deliverables
        .filter((d) => d.clientId === client.id)
        .sort((a, b) => +new Date(b.sharedAt) - +new Date(a.sharedAt)),
      invoices: db.invoices.filter((i) => i.clientId === client.id),
      updates: db.updates
        .filter((u) => u.clientId === client.id)
        .sort((a, b) => +new Date(b.at) - +new Date(a.at)),
      requests: db.requests
        .filter((r) => r.clientId === client.id)
        .sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    };
  }, [db, client]);

  if (!client || !data) return null;

  const progress = clientProgress(db, client.id);
  const toReview = data.deliverables.filter((d) => d.status === "shared");
  const liveActive = active ? db.deliverables.find((d) => d.id === active.id) ?? null : null;
  const firstName = session?.name?.split(" ")[0] ?? "there";

  // Override the accent token so the whole portal adopts the client's brand.
  const themed = { ["--accent" as any]: client.accent } as CSSProperties;

  const submitRequest = () => {
    if (!reqTitle.trim()) return;
    addRequest(client.id, reqTitle.trim(), reqDetail.trim());
    setReqTitle("");
    setReqDetail("");
  };

  return (
    <motion.main
      style={themed}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen w-full"
    >
      {/* Branded header */}
      <header className="sticky top-0 z-30 border-b border-edge bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <Avatar initials={client.initials} accent={client.accent} size={30} />
            <div className="leading-tight">
              <p className="text-[13.5px] font-semibold">{client.name}</p>
              <p className="text-[11px] text-ink-faint">Client portal · Northwind Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => {
                signOut();
                nav("/login");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-edge px-3 text-[13px] text-ink-mute transition-colors hover:border-edge-strong hover:text-ink"
            >
              <LogOut size={15} /> Leave
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <div
          aria-hidden
          className="bloom -top-6 right-0 h-72 w-72"
          style={{ background: `rgb(${client.accent} / 0.22)` }}
        />
        {/* Status hero */}
        <Reveal className="mb-10">
          <Item variants={fadeUp}>
            <p className="text-[14px] text-ink-mute">Welcome back, {firstName}.</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-6">
              <h1 className="max-w-lg font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02]">
                Everything's moving. Here's where things stand.
              </h1>
              <LoopRing pct={progress.pct} size={104} stroke={7} accent={client.accent}>
                <div className="text-center">
                  <div className="tnum text-[22px] font-semibold" style={{ color: `rgb(${client.accent})` }}>
                    {Math.round(progress.pct * 100)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-faint">complete</div>
                </div>
              </LoopRing>
            </div>
          </Item>
        </Reveal>

        {/* To review — the client-side loop */}
        {toReview.length > 0 && (
          <Reveal className="mb-10">
            <Item variants={fadeUp}>
              <SectionTitle>Waiting on you</SectionTitle>
            </Item>
            <Item variants={fadeUp} className="space-y-2.5">
              {toReview.map((d) => (
                <Card
                  key={d.id}
                  interactive
                  as="button"
                  onClick={() => setActive(d)}
                  className="flex w-full items-center gap-4 p-4 text-left"
                >
                  <Thumb seed={d.thumbSeed} size={60} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{d.title}</p>
                    <p className="text-[12.5px] text-ink-mute">
                      {d.kind} · shared {timeAgo(d.sharedAt)}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium text-white"
                    style={{ background: `rgb(${client.accent})` }}
                  >
                    <Check size={15} /> Review
                  </span>
                </Card>
              ))}
            </Item>
          </Reveal>
        )}

        {/* Projects */}
        <Reveal className="mb-10">
          <Item variants={fadeUp}>
            <SectionTitle>Your projects</SectionTitle>
          </Item>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {data.projects.map((p) => {
              const prog = projectProgress(db, p.id);
              const next = db.milestones
                .filter((m) => m.projectId === p.id && !m.done)
                .sort((a, b) => +new Date(a.due) - +new Date(b.due))[0];
              const nd = next ? dueLabel(next.due) : null;
              return (
                <Item key={p.id} variants={fadeUp}>
                  <Card className="flex h-full items-center gap-4 p-5">
                    <LoopRing pct={prog.pct} size={54} stroke={5} accent={client.accent}>
                      <span className="tnum text-[11px] font-semibold text-ink-soft">
                        {prog.done}/{prog.total}
                      </span>
                    </LoopRing>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-semibold">{p.name}</p>
                      {next ? (
                        <p className="mt-0.5 text-[12.5px] text-ink-mute">
                          Next: {next.title}
                          <span className={"ml-1 " + (nd?.overdue ? "text-overdue" : "text-ink-faint")}>
                            · {nd?.label}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[12.5px] text-approved">All milestones done</p>
                      )}
                    </div>
                  </Card>
                </Item>
              );
            })}
          </div>
        </Reveal>

        {/* Deliverables history */}
        <Reveal className="mb-10">
          <Item variants={fadeUp}>
            <SectionTitle>Deliverables</SectionTitle>
          </Item>
          <Item variants={fadeUp}>
            <Card className="divide-y divide-edge">
              {data.deliverables.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActive(d)}
                  className="flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-sunk/50"
                >
                  <Thumb seed={d.thumbSeed} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{d.title}</p>
                    <p className="text-[12px] text-ink-faint">{d.kind} · {timeAgo(d.sharedAt)}</p>
                  </div>
                  <DeliverablePill status={d.status} />
                </button>
              ))}
            </Card>
          </Item>
        </Reveal>

        {/* Two-up: Updates + Invoices */}
        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Item variants={fadeUp}>
              <SectionTitle>Latest updates</SectionTitle>
            </Item>
            <Item variants={fadeUp} className="space-y-2.5">
              {data.updates.map((u) => (
                <Card key={u.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-medium">{u.title}</p>
                    <span className="text-[11.5px] text-ink-faint">{timeAgo(u.at)}</span>
                  </div>
                  {u.body && <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">{u.body}</p>}
                </Card>
              ))}
              {data.updates.length === 0 && (
                <p className="text-[13px] text-ink-mute">No updates yet.</p>
              )}
            </Item>
          </Reveal>

          <Reveal>
            <Item variants={fadeUp}>
              <SectionTitle>Invoices</SectionTitle>
            </Item>
            <Item variants={fadeUp}>
              <Card className="divide-y divide-edge">
                {data.invoices.map((i) => (
                  <div key={i.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="mono text-[12.5px] text-ink-soft">{i.number}</p>
                      <p className="text-[11.5px] text-ink-faint">Due {fmtDate(i.due)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tnum text-[14px] font-medium">{money(i.amount)}</span>
                      <InvoicePill status={i.status} />
                    </div>
                  </div>
                ))}
                {data.invoices.length === 0 && (
                  <p className="p-4 text-[13px] text-ink-mute">No invoices yet.</p>
                )}
              </Card>
            </Item>
          </Reveal>
        </div>

        {/* Requests */}
        <Reveal className="mb-6">
          <Item variants={fadeUp}>
            <SectionTitle>Requests</SectionTitle>
          </Item>
          <div className="grid gap-2.5 lg:grid-cols-[1fr_1fr]">
            <Item variants={fadeUp}>
              <Card className="p-5">
                <FieldLabel>What do you need?</FieldLabel>
                <Input
                  className="mb-3"
                  placeholder="A holiday banner for the homepage"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                />
                <Textarea
                  rows={3}
                  className="mb-3"
                  placeholder="Any details that help…"
                  value={reqDetail}
                  onChange={(e) => setReqDetail(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={submitRequest}
                    disabled={!reqTitle.trim()}
                    style={{ background: `rgb(${client.accent})`, color: "#fff" }}
                  >
                    <Plus size={15} /> Submit request
                  </Button>
                </div>
              </Card>
            </Item>

            <Item variants={fadeUp} className="space-y-2.5">
              <AnimatePresence initial={false}>
                {data.requests.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: easeOut }}
                  >
                    <Card className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[14px] font-medium">{r.title}</p>
                        <RequestPill status={r.status} />
                      </div>
                      {r.detail && (
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">{r.detail}</p>
                      )}
                      <p className="mt-1.5 text-[11.5px] text-ink-faint">{timeAgo(r.at)}</p>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              {data.requests.length === 0 && (
                <p className="text-[13px] text-ink-mute">No requests yet.</p>
              )}
            </Item>
          </div>
        </Reveal>
      </div>

      <Drawer open={!!active} onClose={() => setActive(null)} title="Review">
        {liveActive && (
          <DeliverableReview
            deliverable={liveActive}
            role="client"
            author={session?.name ?? client.contact}
            accent={client.accent}
          />
        )}
      </Drawer>
    </motion.main>
  );
}
