// Typed data access for Loop. This mirrors the shape of the frontend's mock
// `store`, so wiring the UI is mostly swapping calls like `store.addComment(...)`
// for `api.addComment(...)`. RLS does the tenant filtering server-side, so these
// functions never pass an organization_id/client_id filter — the database
// returns exactly what the signed-in user is allowed to see.

import { supabase } from "./supabase";
import type {
  AgencyOverview,
  Client,
  Comment,
  Deliverable,
  DeliverableStatus,
  Invoice,
  Project,
  ProjectProgress,
  Request,
  RequestStatus,
  Update,
} from "./database.types";

const app = () => supabase.schema("app"); // RPCs live in the `app` schema

function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

/* ----------------------------------- auth ---------------------------------- */

export const auth = {
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  session: () => supabase.auth.getSession(),
  onChange: (cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(cb),
};

/* --------------------------------- agency ---------------------------------- */

// One round trip for the whole dashboard header.
export async function getOverview(): Promise<AgencyOverview> {
  return unwrap(await app().rpc("agency_overview"));
}

export async function listClients(): Promise<Client[]> {
  return unwrap(
    await supabase.from("clients").select("*").order("name")
  );
}

export async function addClient(
  input: Pick<Client, "name" | "contact" | "email" | "accent" | "initials">
): Promise<Client> {
  const org = await currentOrg();
  return unwrap(
    await supabase
      .from("clients")
      .insert({ ...input, organization_id: org })
      .select()
      .single()
  );
}

// Projects joined with their progress in a single request (no N+1).
export async function listProjects(): Promise<(Project & { progress: ProjectProgress })[]> {
  const projects = unwrap<Project[]>(
    await supabase.from("projects").select("*").order("name")
  );
  const progress = unwrap<ProjectProgress[]>(
    await supabase.from("project_progress").select("*")
  );
  const byId = new Map(progress.map((p) => [p.project_id, p]));
  return projects.map((p) => ({ ...p, progress: byId.get(p.id)! }));
}

/* ------------------------------ deliverables ------------------------------- */

export async function listDeliverables(): Promise<Deliverable[]> {
  return unwrap(
    await supabase.from("deliverables").select("*").order("shared_at", { ascending: false })
  );
}

export async function getComments(deliverableId: string): Promise<Comment[]> {
  return unwrap(
    await supabase
      .from("comments")
      .select("*")
      .eq("deliverable_id", deliverableId)
      .order("created_at")
  );
}

// The approval loop. Works for both agency and client — the RPC authorizes.
export async function setDeliverableStatus(
  deliverableId: string,
  status: DeliverableStatus
): Promise<Deliverable> {
  return unwrap(
    await app().rpc("set_deliverable_status", {
      p_deliverable: deliverableId,
      p_status: status,
    })
  );
}

// Client or agency adds a comment; the server stamps org/client/author.
export async function addComment(deliverableId: string, body: string): Promise<Comment> {
  return unwrap(
    await supabase
      .from("comments")
      .insert({ deliverable_id: deliverableId, body })
      .select()
      .single()
  );
}

/* -------------------------------- requests --------------------------------- */

export async function listRequests(): Promise<Request[]> {
  return unwrap(
    await supabase.from("requests").select("*").order("created_at", { ascending: false })
  );
}

export async function addRequest(clientId: string, title: string, detail: string): Promise<Request> {
  return unwrap(
    await supabase
      .from("requests")
      .insert({ client_id: clientId, title, detail })
      .select()
      .single()
  );
}

export async function setRequestStatus(id: string, status: RequestStatus): Promise<Request> {
  return unwrap(
    await supabase.from("requests").update({ status }).eq("id", id).select().single()
  );
}

/* ------------------------------ invoices/updates --------------------------- */

export async function listInvoices(): Promise<Invoice[]> {
  return unwrap(
    await supabase.from("invoices").select("*").order("issued", { ascending: false })
  );
}

export async function listUpdates(): Promise<Update[]> {
  return unwrap(
    await supabase.from("updates").select("*").order("created_at", { ascending: false })
  );
}

export async function addUpdate(clientId: string, title: string, body: string): Promise<Update> {
  return unwrap(
    await supabase
      .from("updates")
      .insert({ client_id: clientId, title, body })
      .select()
      .single()
  );
}

/* ----------------------------- client portal ------------------------------- */

// The entire branded portal in ONE request.
export async function getClientSnapshot(clientId?: string) {
  return unwrap(await app().rpc("client_snapshot", { p_client: clientId ?? null }));
}

/* -------------------------------- realtime --------------------------------- */

// Live approval loop: agency subscribes to deliverable status changes.
// RLS is enforced on the stream too, so callers only receive their own rows.
export function onDeliverableChange(handler: (row: Deliverable) => void) {
  const channel = supabase
    .channel("deliverables")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "deliverables" },
      (payload) => handler(payload.new as Deliverable)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* -------------------------------- helpers ---------------------------------- */

async function currentOrg(): Promise<string> {
  // Read from the profile row the signed-in user can see (their own).
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  const row = unwrap<{ organization_id: string }>(
    await supabase.from("users").select("organization_id").eq("id", uid!).single()
  );
  return row.organization_id;
}
