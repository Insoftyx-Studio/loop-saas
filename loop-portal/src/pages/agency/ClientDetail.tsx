import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Loader2, FolderPlus, Paperclip } from "lucide-react";
import { Card, Avatar } from "../../components/ui/primitives";
import { LoopRing } from "../../components/LoopRing";
import { Button } from "../../components/ui/Button";
import { ProjectPill, Thumb, DeliverablePill } from "../../components/status";
import { Modal } from "../../components/ui/Modal";
import { Input, Textarea, FieldLabel } from "../../components/ui/Field";
import { useAuth } from "../../lib/auth";
import {
  getClient, listProjects, listDeliverables, createProject, createDeliverable, uploadDeliverableFile,
  type Client, type Project, type Progress, type Deliverable,
} from "../../lib/api";
import { timeAgo } from "../../lib/data";

export default function ClientDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<(Project & Progress)[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  const [projOpen, setProjOpen] = useState(false);
  const [pName, setPName] = useState(""); const [pSummary, setPSummary] = useState("");
  const [delivOpen, setDelivOpen] = useState(false);
  const [dTitle, setDTitle] = useState(""); const [dKind, setDKind] = useState("File"); const [dProject, setDProject] = useState("");
  const [dFile, setDFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [c, ps, ds] = await Promise.all([getClient(id), listProjects(), listDeliverables()]);
      setClient(c);
      setProjects(ps.filter((p) => p.client_id === id));
      setDeliverables(ds.filter((d) => d.client_id === id));
    } catch { /* not found / RLS */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  async function submitProject() {
    if (!pName.trim() || !profile || !id) return;
    setBusy(true);
    try {
      await createProject({ organizationId: profile.organization_id, clientId: id, name: pName.trim(), summary: pSummary.trim() });
      setPName(""); setPSummary(""); setProjOpen(false); await load();
    } finally { setBusy(false); }
  }
  async function submitDeliverable() {
    if (!dTitle.trim() || !dProject || !profile || !id) return;
    setBusy(true);
    try {
      const created = await createDeliverable({ organizationId: profile.organization_id, projectId: dProject, clientId: id, title: dTitle.trim(), kind: dFile ? (dFile.name.split(".").pop()?.toUpperCase() || dKind) : dKind });
      if (dFile) await uploadDeliverableFile(created, dFile);
      setDTitle(""); setDFile(null); setDelivOpen(false); await load();
    } finally { setBusy(false); }
  }

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-mute"><Loader2 className="animate-spin" size={18} /> Loading…</div>;
  if (!client) return (
    <div className="py-20 text-center">
      <p className="text-[15px] font-medium">Client not found</p>
      <Link to="/app/clients" className="mt-2 inline-block text-[13px] text-accent">Back to clients</Link>
    </div>
  );

  return (
    <div>
      <Link to="/app/clients" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-ink-mute hover:text-ink"><ArrowLeft size={15} /> Clients</Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar initials={client.initials || client.name.slice(0, 2)} accent={client.accent} size={54} />
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">{client.name}</h1>
            <p className="text-[13.5px] text-ink-mute">{client.contact} · {client.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setProjOpen(true)}><FolderPlus size={16} /> New project</Button>
          <Button onClick={() => setDelivOpen(true)} disabled={projects.length === 0}><Plus size={16} /> Share deliverable</Button>
        </div>
      </div>

      {/* Projects */}
      <h2 className="mt-9 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Projects</h2>
      {projects.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-mute">No projects yet. Create the first one.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id} className="flex items-center gap-4 p-4">
              <LoopRing pct={Number(p.pct)} size={48} stroke={4} accent={client.accent}>
                <span className="tnum text-[10.5px] font-semibold text-ink-soft">{Math.round(Number(p.pct) * 100)}</span>
              </LoopRing>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><h3 className="truncate text-[15px] font-semibold">{p.name}</h3><ProjectPill status={p.status} /></div>
                <p className="text-[12.5px] text-ink-mute">{p.done_count}/{p.total_count} milestones</p>
              </div>
              <Link to={`/app/projects`} className="text-[12.5px] text-accent">Open</Link>
            </Card>
          ))}
        </div>
      )}

      {/* Deliverables */}
      <h2 className="mt-9 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Deliverables</h2>
      {deliverables.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-mute">Nothing shared yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {deliverables.map((d) => (
            <Card key={d.id} className="flex items-center gap-3 p-3">
              <Thumb seed={d.thumb_seed} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{d.title}</p>
                <p className="text-[12px] text-ink-mute">{d.kind} · shared {timeAgo(d.shared_at)}</p>
              </div>
              <DeliverablePill status={d.status} />
            </Card>
          ))}
        </div>
      )}

      {/* New project modal */}
      <Modal open={projOpen} onClose={() => setProjOpen(false)} title="New project">
        <div className="space-y-3">
          <div><FieldLabel>Name</FieldLabel><Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Brand refresh" /></div>
          <div><FieldLabel>Summary</FieldLabel><Textarea value={pSummary} onChange={(e) => setPSummary(e.target.value)} placeholder="What is this project about?" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setProjOpen(false)}>Cancel</Button>
            <Button onClick={submitProject} disabled={busy || !pName.trim()}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Create project"}</Button>
          </div>
        </div>
      </Modal>

      {/* Share deliverable modal */}
      <Modal open={delivOpen} onClose={() => setDelivOpen(false)} title="Share a deliverable">
        <div className="space-y-3">
          <div>
            <FieldLabel>Project</FieldLabel>
            <select value={dProject} onChange={(e) => setDProject(e.target.value)} className="w-full rounded-md border border-edge bg-sunk px-3 py-2.5 text-sm">
              <option value="">Select a project…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><FieldLabel>Title</FieldLabel><Input value={dTitle} onChange={(e) => setDTitle(e.target.value)} placeholder="Homepage concepts — round 1" /></div>
          <div><FieldLabel>Kind</FieldLabel><Input value={dKind} onChange={(e) => setDKind(e.target.value)} placeholder="Figma / PDF / PNG" /></div>
          <div>
            <FieldLabel>File (optional)</FieldLabel>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-edge bg-sunk px-3 py-2.5 text-[13px] text-ink-mute hover:text-ink">
              <Paperclip size={15} /> {dFile ? dFile.name : "Attach a file for the client to download"}
              <input type="file" className="hidden" onChange={(e) => setDFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setDelivOpen(false)}>Cancel</Button>
            <Button onClick={submitDeliverable} disabled={busy || !dTitle.trim() || !dProject}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Share"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
