import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  seed,
  type DB,
  type DeliverableStatus,
  type RequestStatus,
  type Role,
} from "./data";

/* Session: who is looking. Agency admin sees everything; a client sees
 * only their own rows. This is the RLS boundary, enforced in selectors. */
export type Session =
  | { kind: "agency"; name: string }
  | { kind: "client"; clientId: string; name: string };

type StoreCtx = {
  db: DB;
  session: Session | null;
  signInAgency: () => void;
  signInClient: (clientId: string) => void;
  signOut: () => void;
  setSession: (s: Session | null) => void;

  addClient: (name: string, contact: string, email: string, accent: string) => void;
  setDeliverableStatus: (id: string, status: DeliverableStatus) => void;
  addComment: (deliverableId: string, body: string, role: Role, author: string) => void;
  addRequest: (clientId: string, title: string, detail: string) => void;
  setRequestStatus: (id: string, status: RequestStatus) => void;
  addUpdate: (clientId: string, title: string, body: string) => void;
  reset: () => void;
};

const Ctx = createContext<StoreCtx | null>(null);
const KEY = "loop-db-v1";
const SKEY = "loop-session-v1";

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return clone(seed);
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SKEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

const uid = () => Math.random().toString(36).slice(2, 9);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDB] = useState<DB>(loadDB);
  const [session, setSession] = useState<Session | null>(loadSession);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }, [db]);

  useEffect(() => {
    try {
      if (session) localStorage.setItem(SKEY, JSON.stringify(session));
      else localStorage.removeItem(SKEY);
    } catch {
      /* ignore */
    }
  }, [session]);

  const signInAgency = useCallback(
    () => setSession({ kind: "agency", name: "Sam Rourke" }),
    [],
  );
  const signInClient = useCallback(
    (clientId: string) => {
      const c = db.clients.find((x) => x.id === clientId);
      setSession({ kind: "client", clientId, name: c?.contact ?? "Client" });
    },
    [db.clients],
  );
  const signOut = useCallback(() => setSession(null), []);

  const addClient = useCallback(
    (name: string, contact: string, email: string, accent: string) => {
      const initials =
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("") || "C";
      setDB((prev) => ({
        ...prev,
        clients: [
          ...prev.clients,
          {
            id: "cl_" + uid(),
            name,
            contact,
            email,
            accent,
            initials,
            since: new Date().toISOString(),
          },
        ],
      }));
    },
    [],
  );

  const setDeliverableStatus = useCallback((id: string, status: DeliverableStatus) => {
    setDB((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d) => (d.id === id ? { ...d, status } : d)),
    }));
  }, []);

  const addComment = useCallback(
    (deliverableId: string, body: string, role: Role, author: string) => {
      setDB((prev) => ({
        ...prev,
        comments: [
          ...prev.comments,
          { id: uid(), deliverableId, author, role, body, at: new Date().toISOString() },
        ],
      }));
    },
    [],
  );

  const addRequest = useCallback((clientId: string, title: string, detail: string) => {
    setDB((prev) => ({
      ...prev,
      requests: [
        { id: uid(), clientId, title, detail, status: "open", at: new Date().toISOString() },
        ...prev.requests,
      ],
    }));
  }, []);

  const setRequestStatus = useCallback((id: string, status: RequestStatus) => {
    setDB((prev) => ({
      ...prev,
      requests: prev.requests.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
  }, []);

  const addUpdate = useCallback((clientId: string, title: string, body: string) => {
    setDB((prev) => ({
      ...prev,
      updates: [
        { id: uid(), clientId, title, body, at: new Date().toISOString() },
        ...prev.updates,
      ],
    }));
  }, []);

  const reset = useCallback(() => {
    setDB(clone(seed));
  }, []);

  const value = useMemo(
    () => ({
      db,
      session,
      setSession,
      signInAgency,
      signInClient,
      signOut,
      addClient,
      setDeliverableStatus,
      addComment,
      addRequest,
      setRequestStatus,
      addUpdate,
      reset,
    }),
    [db, session, setSession, signInAgency, signInClient, signOut, addClient, setDeliverableStatus, addComment, addRequest, setRequestStatus, addUpdate, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/* ---- selectors ---- */

export function useClient(clientId: string) {
  const { db } = useStore();
  return db.clients.find((c) => c.id === clientId);
}

export function projectProgress(db: DB, projectId: string) {
  const ms = db.milestones.filter((m) => m.projectId === projectId);
  const done = ms.filter((m) => m.done).length;
  return { done, total: ms.length, pct: ms.length ? done / ms.length : 0 };
}

export function clientProgress(db: DB, clientId: string) {
  const projs = db.projects.filter((p) => p.clientId === clientId);
  const ms = db.milestones.filter((m) => projs.some((p) => p.id === m.projectId));
  const done = ms.filter((m) => m.done).length;
  return { done, total: ms.length, pct: ms.length ? done / ms.length : 0 };
}
