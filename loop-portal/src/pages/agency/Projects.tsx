import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Check, Circle } from "lucide-react";
import { Card } from "../../components/ui/primitives";
import { LoopRing } from "../../components/LoopRing";
import { ProjectPill } from "../../components/status";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { Modal } from "../../components/ui/Modal";
import { Input, FieldLabel } from "../../components/ui/Field";
import { Reveal, Item, fadeUp } from "../../components/motion";
import { PageHead } from "./_head";
import { useAuth } from "../../lib/auth";
import {
  listProjects, listClients, listMilestones, addMilestone, setMilestoneDone, createProject,
  type Project, type Progress, type Client, type Milestone,
} from "../../lib/api";

export default function Projects() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<(Project & Progress)[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState<(Project & Progress) | null>(null);
  const [ms, setMs] = useState<Milestone[]>([]);
  const [newMs, setNewMs] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [np, setNp] = useState({ clientId: "", name: "" });
  const [busy, setBusy] = useState(false);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  async function load() {
    setLoading(true);
    try {
      const [ps, cs] = await Promise.all([listProjects(), listClients()]);
      setProjects(ps); setClients(cs);
    } catch { /* empty */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function openProject(p: Project & Progress) {
    setActive(p); setMs(await listMilestones(p.id));
  }
  async function addMs() {
    if (!newMs.trim() || !active || !profile) return;
    await addMilestone({ organizationId: profile.organization_id, projectId: active.id, clientId: active.client_id, title: newMs.trim(), position: ms.length });
    setNewMs(""); setMs(await listMilestones(active.id)); await load();
  }
  async function toggle(m: Milestone) {
    await setMilestoneDone(m.id, !m.done);
    if (active) { setMs(await listMilestones(active.id)); await load(); }
  }
  async function submitProject() {
    if (!np.name.trim() || !np.clientId || !profile) return;
    setBusy(true);
    try {
      await createProject({ organizationId: profile.organization_id, clientId: np.clientId, name: np.name.trim() });
      setNp({ clientId: "", name: "" }); setNewOpen(false); await load();
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHead title="Projects" sub="Every engagement in motion, across all clients."
        action={<Button onClick={() => setNewOpen(true)}><Plus size={16} /> New project</Button>} />

      {loading ? (
        <div className="flex items-center gap-2 text-ink-mute"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-[15px] font-medium">No projects yet</p><p className="mt-1 text-[13.5px] text-ink-mute">Create one and add milestones to track progress.</p></Card>
      ) : (
        <Reveal className="space-y-3">
          {projects.map((p) => {
            const c = clientById.get(p.client_id);
            return (
              <Item key={p.id} variants={fadeUp}>
                <Card interactive className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center" onClick={() => openProject(p)}>
                  <LoopRing pct={Number(p.pct)} size={54} stroke={4.5} accent={c?.accent}>
                    <span className="tnum text-[11px] font-semibold text-ink-soft">{Math.round(Number(p.pct) * 100)}</span>
                  </LoopRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5"><h3 className="text-[16px] font-semibold">{p.name}</h3><ProjectPill status={p.status} /></div>
                    <p className="mt-0.5 text-[13px] text-ink-mute">{c?.name} · {p.done_count}/{p.total_count} milestones</p>
                  </div>
                  <span className="text-[12.5px] text-accent">Manage →</span>
                </Card>
              </Item>
            );
          })}
        </Reveal>
      )}

      {/* Milestones drawer */}
      <Drawer open={!!active} onClose={() => setActive(null)} title={active?.name}>
        {active && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <LoopRing pct={Number(active.pct)} size={44} stroke={4}>
                <span className="tnum text-[10.5px] font-semibold text-ink-soft">{Math.round(Number(active.pct) * 100)}</span>
              </LoopRing>
              <p className="text-[13px] text-ink-mute">{clientById.get(active.client_id)?.name}</p>
            </div>
            <div className="space-y-2">
              {ms.map((m) => (
                <button key={m.id} onClick={() => toggle(m)} className="flex w-full items-center gap-3 rounded-lg border border-edge bg-raised p-3 text-left hover:bg-sunk">
                  {m.done ? <Check size={18} className="text-green-500" /> : <Circle size={18} className="text-ink-faint" />}
                  <span className={m.done ? "text-[14px] text-ink-mute line-through" : "text-[14px]"}>{m.title}</span>
                </button>
              ))}
              {ms.length === 0 && <p className="text-[13.5px] text-ink-mute">No milestones yet.</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <Input value={newMs} onChange={(e) => setNewMs(e.target.value)} placeholder="Add a milestone" onKeyDown={(e) => e.key === "Enter" && addMs()} />
              <Button onClick={addMs} disabled={!newMs.trim()}><Plus size={16} /></Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* New project modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New project">
        <div className="space-y-3">
          <div>
            <FieldLabel>Client</FieldLabel>
            <select value={np.clientId} onChange={(e) => setNp({ ...np, clientId: e.target.value })} className="w-full rounded-md border border-edge bg-sunk px-3 py-2.5 text-sm">
              <option value="">Select a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><FieldLabel>Project name</FieldLabel><Input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="Website redesign" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={submitProject} disabled={busy || !np.name.trim() || !np.clientId}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
