import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Upload, Download, Paperclip } from "lucide-react";
import { Card } from "../../components/ui/primitives";
import { Thumb, DeliverablePill } from "../../components/status";
import { Drawer } from "../../components/ui/Drawer";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { Reveal, Item, fadeUp } from "../../components/motion";
import { PageHead } from "./_head";
import { cn } from "../../lib/cn";
import { timeAgo } from "../../lib/data";
import { useAuth } from "../../lib/auth";
import {
  listDeliverables, listClients, listComments, addComment, onDeliverableChange,
  uploadDeliverableFile, getDeliverableDownloadUrl,
  type Deliverable, type Client, type Comment,
} from "../../lib/api";

type Filter = "all" | Deliverable["status"];

export default function Deliverables() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Deliverable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const [active, setActive] = useState<Deliverable | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reply, setReply] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  async function load() {
    try {
      const [ds, cs] = await Promise.all([listDeliverables(), listClients()]);
      setItems(ds); setClients(cs);
    } catch { /* empty */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  // live approval loop — refetch when any deliverable changes (e.g. client approves)
  useEffect(() => onDeliverableChange(load), []);

  async function open(d: Deliverable) {
    setActive(d); setComments(await listComments(d.id));
  }
  async function send() {
    if (!reply.trim() || !active) return;
    await addComment(active.id, reply.trim());
    setReply(""); setComments(await listComments(active.id));
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    setUploading(true);
    try {
      const path = await uploadDeliverableFile(active, file);
      setActive({ ...active, storage_path: path });
      await load();
    } catch (err: any) {
      alert(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function download(path: string) {
    try { window.open(await getDeliverableDownloadUrl(path), "_blank"); }
    catch (err: any) { alert(err?.message ?? "Could not open file"); }
  }

  const counts = {
    all: items.length,
    shared: items.filter((d) => d.status === "shared").length,
    changes_requested: items.filter((d) => d.status === "changes_requested").length,
    approved: items.filter((d) => d.status === "approved").length,
  };
  const list = filter === "all" ? items : items.filter((d) => d.status === filter);
  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" }, { key: "shared", label: "In review" },
    { key: "changes_requested", label: "Changes" }, { key: "approved", label: "Approved" },
  ];

  return (
    <div>
      <PageHead title="Deliverables" sub="Everything you've shared, and where it stands." />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              filter === t.key ? "bg-ink text-paper" : "bg-raised text-ink-mute hover:text-ink")}>
            {t.label} <span className="tnum opacity-60">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink-mute"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-[15px] font-medium">Nothing here yet</p><p className="mt-1 text-[13.5px] text-ink-mute">Share a deliverable from a client's page.</p></Card>
      ) : (
        <Reveal className="space-y-2">
          {list.map((d) => {
            const c = clientById.get(d.client_id);
            return (
              <Item key={d.id} variants={fadeUp}>
                <Card interactive className="flex items-center gap-3.5 p-3.5" onClick={() => open(d)}>
                  <Thumb seed={d.thumb_seed} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{d.title}</p>
                    <p className="text-[12.5px] text-ink-mute">{c?.name} · {d.kind} · {timeAgo(d.shared_at)}</p>
                  </div>
                  <DeliverablePill status={d.status} />
                </Card>
              </Item>
            );
          })}
        </Reveal>
      )}

      <Drawer open={!!active} onClose={() => setActive(null)} title={active?.title}>
        {active && (
          <div>
            <Thumb seed={active.thumb_seed} size={280} />
            <div className="mt-4 flex items-center justify-between">
              <DeliverablePill status={active.status} />
              <span className="text-[12.5px] text-ink-mute">{clientById.get(active.client_id)?.name}</span>
            </div>

            <p className="mt-4 text-[12.5px] text-ink-mute">The client approves or requests changes from their portal. You'll see the status update here.</p>

            <div className="mt-5 rounded-lg border border-edge bg-raised p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
                  <Paperclip size={14} /> {active.storage_path ? "File attached" : "No file yet"}
                </span>
                <div className="flex gap-2">
                  {active.storage_path && (
                    <Button variant="secondary" onClick={() => download(active.storage_path!)}><Download size={14} /> Download</Button>
                  )}
                  <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <><Upload size={14} /> {active.storage_path ? "Replace" : "Upload file"}</>}
                  </Button>
                </div>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} />
            </div>

            <h3 className="mt-7 text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint">Conversation</h3>
            <div className="mt-3 space-y-2.5">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-edge bg-raised p-3">
                  <p className="text-[12px] font-semibold text-ink-soft">{c.author_name || (c.role === "client" ? "Client" : "You")}</p>
                  <p className="text-[13.5px]">{c.body}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">{timeAgo(c.created_at)}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-[13.5px] text-ink-mute">No comments yet.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" onKeyDown={(e) => e.key === "Enter" && send()} />
              <Button onClick={send} disabled={!reply.trim()}><Send size={15} /></Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
