import { supabase } from "./supabase";

export type Profile = {
  id: string;
  organization_id: string;
  role: "agency_admin" | "agency_member" | "client";
  full_name: string;
  email: string | null;
  client_id: string | null;
};

export type Client = {
  id: string; organization_id: string; name: string; contact: string;
  email: string | null; accent: string; initials: string; since: string;
};
export type Project = {
  id: string; organization_id: string; client_id: string; name: string;
  summary: string; status: "on_track" | "at_risk" | "paused" | "delivered";
};
export type Progress = { project_id?: string; client_id?: string; done_count: number; total_count: number; pct: number };
export type Milestone = {
  id: string; project_id: string; client_id: string; title: string;
  due: string | null; done: boolean; position: number;
};
export type Deliverable = {
  id: string; organization_id: string; project_id: string; client_id: string;
  title: string; kind: string; status: "shared" | "approved" | "changes_requested";
  thumb_seed: string; shared_at: string; storage_path: string | null;
};
export type Comment = {
  id: string; deliverable_id: string; author_name: string;
  role: string; body: string; created_at: string;
};

function ok<T>({ data, error }: { data: T | null; error: any }): T {
  if (error) throw error;
  return data as T;
}

/* ------------------------------- profile ---------------------------------- */
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, organization_id, role, full_name, email, client_id")
    .eq("id", userId).single();
  if (error) return null;
  return data as Profile;
}

/* -------------------------------- clients --------------------------------- */
export async function listClients(): Promise<Client[]> {
  return ok(await supabase.from("clients").select("*").order("name"));
}
export async function getClient(id: string): Promise<Client> {
  return ok(await supabase.from("clients").select("*").eq("id", id).single());
}
export async function clientProgress(): Promise<Progress[]> {
  return ok(await supabase.from("client_progress").select("*"));
}

/* -------------------------------- projects -------------------------------- */
export async function listProjects(): Promise<(Project & Progress)[]> {
  const projects = ok<Project[]>(await supabase.from("projects").select("*").order("name"));
  const prog = ok<Progress[]>(await supabase.from("project_progress").select("*"));
  const by = new Map(prog.map((p) => [p.project_id, p]));
  return projects.map((p) => ({ ...p, ...(by.get(p.id) ?? { done_count: 0, total_count: 0, pct: 0 }) }));
}
export async function createProject(input: {
  organizationId: string; clientId: string; name: string; summary?: string; status?: Project["status"];
}): Promise<Project> {
  return ok(await supabase.from("projects").insert({
    organization_id: input.organizationId, client_id: input.clientId,
    name: input.name, summary: input.summary ?? "", status: input.status ?? "on_track",
  }).select().single());
}

/* ------------------------------- milestones ------------------------------- */
export async function listMilestones(projectId: string): Promise<Milestone[]> {
  return ok(await supabase.from("milestones").select("*").eq("project_id", projectId).order("position"));
}
export async function addMilestone(input: {
  organizationId: string; projectId: string; clientId: string; title: string; due?: string | null; position?: number;
}): Promise<Milestone> {
  return ok(await supabase.from("milestones").insert({
    organization_id: input.organizationId, project_id: input.projectId, client_id: input.clientId,
    title: input.title, due: input.due ?? null, position: input.position ?? 0,
  }).select().single());
}
export async function setMilestoneDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from("milestones").update({ done }).eq("id", id);
  if (error) throw error;
}

/* ------------------------------ deliverables ------------------------------ */
export async function listDeliverables(): Promise<Deliverable[]> {
  return ok(await supabase.from("deliverables").select("*").order("shared_at", { ascending: false }));
}
export async function createDeliverable(input: {
  organizationId: string; projectId: string; clientId: string; title: string; kind?: string;
}): Promise<Deliverable> {
  const seed = Math.random().toString(36).slice(2, 9);
  return ok(await supabase.from("deliverables").insert({
    organization_id: input.organizationId, project_id: input.projectId, client_id: input.clientId,
    title: input.title, kind: input.kind ?? "File", thumb_seed: seed, status: "shared",
  }).select().single());
}
export async function setDeliverableStatus(id: string, status: Deliverable["status"]): Promise<Deliverable> {
  return ok(await supabase.schema("app").rpc("set_deliverable_status", { p_deliverable: id, p_status: status }));
}

/* -------------------------------- comments -------------------------------- */
export async function listComments(deliverableId: string): Promise<Comment[]> {
  return ok(await supabase.from("comments").select("*").eq("deliverable_id", deliverableId).order("created_at"));
}
export async function addComment(deliverableId: string, body: string): Promise<Comment> {
  return ok(await supabase.from("comments").insert({ deliverable_id: deliverableId, body }).select().single());
}

/* ------------------------------ realtime ---------------------------------- */
// Fires the callback whenever any deliverable this user can see changes.
export function onDeliverableChange(cb: () => void) {
  const ch = supabase
    .channel("deliverables-agency")
    .on("postgres_changes", { event: "*", schema: "public", table: "deliverables" }, cb)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

/* -------------------------- account provisioning -------------------------- */
export async function createClientAccount(input: {
  clientName: string; contactName: string; email: string; accent?: string;
}) {
  const { data, error } = await supabase.functions.invoke("create-client", { body: input });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; clientId: string; userId: string; warning?: string };
}

/* ------------------------------- client portal ---------------------------- */
export async function getClientSnapshot() {
  return ok(await supabase.schema("app").rpc("client_snapshot", { p_client: null })) as any;
}

/* -------------------------------- password -------------------------------- */
export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/* -------------------------------- overview -------------------------------- */
export type Overview = {
  clients: number; active_projects: number; pending_approvals: number;
  open_requests: number; outstanding_cents: number;
};
export async function getOverview(): Promise<Overview> {
  return ok(await supabase.schema("app").rpc("agency_overview"));
}

/* -------------------------------- requests -------------------------------- */
export type Request = {
  id: string; client_id: string; title: string; detail: string;
  status: "open" | "in_progress" | "done"; created_at: string;
};
export async function listRequests(): Promise<Request[]> {
  return ok(await supabase.from("requests").select("*").order("created_at", { ascending: false }));
}
export async function setRequestStatus(id: string, status: Request["status"]): Promise<void> {
  const { error } = await supabase.from("requests").update({ status }).eq("id", id);
  if (error) throw error;
}
// Client files a request for their own client (trigger stamps org + created_by).
export async function addRequest(clientId: string, title: string, detail: string): Promise<Request> {
  return ok(await supabase.from("requests").insert({ client_id: clientId, title, detail }).select().single());
}

/* --------------------------------- updates -------------------------------- */
export type Update = { id: string; client_id: string; title: string; body: string; created_at: string };
export async function listUpdates(): Promise<Update[]> {
  return ok(await supabase.from("updates").select("*").order("created_at", { ascending: false }));
}
// Agency posts an update to a client (trigger stamps org + author).
export async function addUpdate(clientId: string, title: string, body: string): Promise<Update> {
  return ok(await supabase.from("updates").insert({ client_id: clientId, title, body }).select().single());
}

/* -------------------------------- invoices -------------------------------- */
export type Invoice = {
  id: string; client_id: string; number: string; amount_cents: number;
  currency: string; status: "paid" | "pending" | "overdue"; issued: string; due: string | null;
};
export async function listInvoices(): Promise<Invoice[]> {
  return ok(await supabase.from("invoices").select("*").order("issued", { ascending: false }));
}
export async function createInvoice(input: {
  organizationId: string; clientId: string; number: string; amountCents: number;
  status: Invoice["status"]; issued: string; due?: string | null;
}): Promise<Invoice> {
  return ok(await supabase.from("invoices").insert({
    organization_id: input.organizationId, client_id: input.clientId, number: input.number,
    amount_cents: input.amountCents, status: input.status, issued: input.issued, due: input.due ?? null,
  }).select().single());
}

/* --------------------------- deliverable files ---------------------------- */
const BUCKET = "deliverables";

// Agency uploads a file; path follows the storage RLS convention:
// {org}/{client}/{deliverable}/{filename}. Saves the path on the deliverable.
export async function uploadDeliverableFile(d: Deliverable, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${d.organization_id}/${d.client_id}/${d.id}/${safeName}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (up.error) throw up.error;
  const { error } = await supabase.from("deliverables").update({ storage_path: path }).eq("id", d.id);
  if (error) throw error;
  return path;
}

// Anyone allowed by storage RLS (agency or owning client) gets a temp URL.
export async function getDeliverableDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 300, { download: true });
  if (error) throw error;
  return data.signedUrl;
}

/* -------------------------- invoice status update ------------------------- */
export async function setInvoiceStatus(id: string, status: Invoice["status"]): Promise<void> {
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
  if (error) throw error;
}
