import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Card, Avatar } from "../../components/ui/primitives";
import { Input, Textarea, FieldLabel } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Reveal, Item, fadeUp } from "../../components/motion";
import { timeAgo } from "../../lib/data";
import { PageHead } from "./_head";
import { listUpdates, listClients, addUpdate, type Update, type Client } from "../../lib/api";

export default function Updates() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  async function load() {
    try {
      const [us, cs] = await Promise.all([listUpdates(), listClients()]);
      setUpdates(us); setClients(cs);
      if (!clientId && cs[0]) setClientId(cs[0].id);
    } catch { /* empty */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function post() {
    if (!title.trim() || !clientId) return;
    setBusy(true);
    try { await addUpdate(clientId, title.trim(), body.trim()); setTitle(""); setBody(""); await load(); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHead title="Updates" sub="Post a note to a client's portal feed." />
      <Card className="p-5">
        <div className="grid gap-3">
          <div>
            <FieldLabel>Client</FieldLabel>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-md border border-edge bg-sunk px-3 py-2.5 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><FieldLabel>Title</FieldLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Packaging round 2 is ready" /></div>
          <div><FieldLabel>Message</FieldLabel><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="A short note for your client…" /></div>
          <div className="flex justify-end">
            <Button onClick={post} disabled={busy || !title.trim() || !clientId}>{busy ? <Loader2 size={16} className="animate-spin" /> : <><Send size={15} /> Post update</>}</Button>
          </div>
        </div>
      </Card>

      <h2 className="mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Recent updates</h2>
      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-ink-mute"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <Reveal className="mt-3 space-y-2.5">
          {updates.map((u) => {
            const c = clientById.get(u.client_id);
            return (
              <Item key={u.id} variants={fadeUp}>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Avatar initials={c?.initials || c?.name?.slice(0, 2) || "··"} accent={c?.accent} size={26} />
                    <span className="text-[12.5px] text-ink-mute">{c?.name}</span>
                    <span className="text-[11px] text-ink-faint">· {timeAgo(u.created_at)}</span>
                  </div>
                  <p className="mt-2 text-[14.5px] font-semibold">{u.title}</p>
                  {u.body && <p className="mt-0.5 text-[13.5px] text-ink-mute">{u.body}</p>}
                </Card>
              </Item>
            );
          })}
          {updates.length === 0 && <p className="text-[14px] text-ink-mute">No updates yet.</p>}
        </Reveal>
      )}
    </div>
  );
}
