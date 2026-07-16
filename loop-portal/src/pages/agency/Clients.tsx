import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, ArrowUpRight, Loader2 } from "lucide-react";
import { Card, Avatar } from "../../components/ui/primitives";
import { LoopRing } from "../../components/LoopRing";
import { Button } from "../../components/ui/Button";
import { Reveal, Item, fadeUp } from "../../components/motion";
import { PageHead } from "./_head";
import { listClients, clientProgress, type Client, type Progress } from "../../lib/api";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [prog, setProg] = useState<Map<string, Progress>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cs, ps] = await Promise.all([listClients(), clientProgress()]);
        setClients(cs);
        setProg(new Map(ps.map((p) => [p.client_id!, p])));
      } catch { /* empty/RLS */ } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <PageHead
        title="Clients"
        sub="Each client gets their own branded portal."
        action={
          <Link to="/app/accounts">
            <Button><UserPlus size={16} /> New client account</Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-[14px] text-ink-mute"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : clients.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[15px] font-medium">No clients yet</p>
          <p className="mt-1 text-[13.5px] text-ink-mute">Create your first client account to get started.</p>
          <Link to="/app/accounts" className="mt-4 inline-block"><Button><UserPlus size={16} /> New client account</Button></Link>
        </Card>
      ) : (
        <Reveal className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => {
            const p = prog.get(c.id);
            const pct = p?.pct ?? 0;
            return (
              <Item key={c.id} variants={fadeUp}>
                <Link to={`/app/clients/${c.id}`}>
                  <Card interactive className="flex items-center gap-4 p-5">
                    <Avatar initials={c.initials || c.name.slice(0, 2)} accent={c.accent} size={46} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-[15.5px] font-semibold">{c.name}</h3>
                        <ArrowUpRight size={15} className="text-ink-faint" />
                      </div>
                      <p className="truncate text-[13px] text-ink-mute">{c.contact || c.email}</p>
                    </div>
                    <LoopRing pct={Number(pct)} size={44} stroke={4} accent={c.accent}>
                      <span className="tnum text-[10.5px] font-semibold text-ink-soft">{Math.round(Number(pct) * 100)}</span>
                    </LoopRing>
                  </Card>
                </Link>
              </Item>
            );
          })}
        </Reveal>
      )}
    </div>
  );
}
