// Hand-authored to mirror `supabase gen types typescript`. Regenerate with:
//   supabase gen types typescript --local > client/database.types.ts

export type UserRole = "agency_admin" | "agency_member" | "client";
export type ProjectStatus = "on_track" | "at_risk" | "paused" | "delivered";
export type DeliverableStatus = "shared" | "approved" | "changes_requested";
export type RequestStatus = "open" | "in_progress" | "done";
export type InvoiceStatus = "paid" | "pending" | "overdue";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  accent: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  contact: string;
  email: string | null;
  accent: string;
  initials: string;
  since: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  organization_id: string;
  project_id: string;
  client_id: string;
  title: string;
  due: string | null;
  done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  organization_id: string;
  project_id: string;
  client_id: string;
  title: string;
  kind: string;
  status: DeliverableStatus;
  storage_path: string | null;
  thumb_seed: string;
  shared_at: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  organization_id: string;
  deliverable_id: string;
  client_id: string;
  author_id: string | null;
  author_name: string;
  role: UserRole;
  body: string;
  created_at: string;
}

export interface Request {
  id: string;
  organization_id: string;
  client_id: string;
  title: string;
  detail: string;
  status: RequestStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  client_id: string;
  number: string;
  amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  issued: string;
  due: string | null;
  created_at: string;
  updated_at: string;
}

export interface Update {
  id: string;
  organization_id: string;
  client_id: string;
  title: string;
  body: string;
  author_id: string | null;
  created_at: string;
}

export interface ProjectProgress {
  project_id: string;
  organization_id: string;
  client_id: string;
  done_count: number;
  total_count: number;
  pct: number;
}

export interface AgencyOverview {
  clients: number;
  active_projects: number;
  pending_approvals: number;
  open_requests: number;
  outstanding_cents: number;
}
