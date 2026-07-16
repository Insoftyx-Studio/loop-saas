import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, Avatar } from "../../components/ui/primitives";
import { Modal } from "../../components/ui/Modal";
import { Input, FieldLabel } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Reveal, Item, fadeUp } from "../../components/motion";
import { money, fmtDate } from "../../lib/data";
import { PageHead } from "./_head";
import { useAuth } from "../../lib/auth";
import { listInvoices, listClients, createInvoice, setInvoiceStatus, type Invoice, type Client } from "../../lib/api";

export default function Invoices() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ clientId: "", number: "", amount: "", status: "pending" as Invoice["status"], issued: new Date().toISOString().slice(0, 10), due: "" });
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  async function load() {
    try {
      const [is, cs] = await Promise.all([listInvoices(), listClients()]);
      setInvoices(is); setClients(cs);
      if (!form.clientId && cs[0]) setForm((f) => ({ ...f, clientId: cs[0].id }));
    } catch { /* empty */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const sum = (s: string) => invoices.filter((i) => i.status === s).reduce((t, i) => t + i.amount_cents, 0) / 100;
  const tiles = [
    { label: "Paid", value: sum("paid"), tone: "text-approved" },
    { label: "Pending", value: sum("pending"), tone: "text-ink" },
    { label: "Overdue", value: sum("overdue"), tone: "text-overdue" },
  ];

  async function submit() {
    if (!form.clientId || !form.number.trim() || !form.amount || !profile) return;
    setBusy(true);
    try {
      await createInvoice({
        organizationId: profile.organization_id, clientId: form.clientId, number: form.number.trim(),
        amountCents: Math.round(parseFloat(form.amount) * 100), status: form.status,
        issued: form.issued, due: form.due || null,
      });
      setForm((f) => ({ ...f, number: "", amount: "", due: "" })); setOpen(false); await load();
    } catch (e: any) { alert(e?.message ?? "Could not create invoice"); }
    finally { setBusy(false); }
  }

  async function changeStatus(id: string, status: Invoice["status"]) {
    await setInvoiceStatus(id, status); await load();
  }

  return (
    <div>
      <PageHead title="Invoices" sub="Status at a glance — clients see these read-only."
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New invoice</Button>} />

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-[12.5px] font-medium uppercase tracking-wide text-ink-faint">{t.label}</p>
            <p className={`mt-2 text-[24px] font-semibold tnum ${t.tone}`}>{money(t.value)}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-ink-mute"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <Reveal className="mt-6 space-y-2">
          {invoices.map((i) => {
            const c = clientById.get(i.client_id);
            return (
              <Item key={i.id} variants={fadeUp}>
                <Card className="flex items-center gap-3 p-3.5">
                  <Avatar initials={c?.initials || c?.name?.slice(0, 2) || "··"} accent={c?.accent} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{i.number}</p>
                    <p className="text-[12.5px] text-ink-mute">{c?.name} · issued {fmtDate(i.issued)}</p>
                  </div>
                  <span className="tnum text-[14px] font-semibold">{money(i.amount_cents / 100)}</span>
                  <select value={i.status} onChange={(e) => changeStatus(i.id, e.target.value as Invoice["status"])}
                    className="rounded-md border border-edge bg-sunk px-2 py-1 text-[12.5px] capitalize outline-none focus:border-accent">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </Card>
              </Item>
            );
          })}
          {invoices.length === 0 && <p className="text-[14px] text-ink-mute">No invoices yet.</p>}
        </Reveal>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New invoice">
        <div className="space-y-3">
          <div>
            <FieldLabel>Client</FieldLabel>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full rounded-md border border-edge bg-sunk px-3 py-2.5 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Number</FieldLabel><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="NW-1052" /></div>
            <div><FieldLabel>Amount (USD)</FieldLabel><Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="4800" inputMode="decimal" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Status</FieldLabel>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Invoice["status"] })} className="w-full rounded-md border border-edge bg-sunk px-3 py-2.5 text-sm">
                <option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
              </select>
            </div>
            <div><FieldLabel>Due date</FieldLabel><Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy || !form.number.trim() || !form.amount}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Create invoice"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
