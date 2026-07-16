/* ------------------------------------------------------------------ *
 * Loop — demo data. Mirrors the roadmap's multi-tenant model, but
 * frontend-only: seeded in memory, mutated through the store, persisted
 * to localStorage so the demo survives a reload.
 * ------------------------------------------------------------------ */

export type Role = "agency_admin" | "client";

export type DeliverableStatus = "shared" | "approved" | "changes_requested";
export type RequestStatus = "open" | "in_progress" | "done";
export type InvoiceStatus = "paid" | "pending" | "overdue";
export type ProjectStatus = "on_track" | "at_risk" | "paused" | "delivered";

export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  accent: string; // the client's brand accent, shown in their portal
  initials: string;
  since: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  due: string;
  done: boolean;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  status: ProjectStatus;
  summary: string;
  started: string;
}

export interface Comment {
  id: string;
  deliverableId: string;
  author: string;
  role: Role;
  body: string;
  at: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  clientId: string;
  title: string;
  kind: string;
  status: DeliverableStatus;
  sharedAt: string;
  thumbSeed: string;
}

export interface Request {
  id: string;
  clientId: string;
  title: string;
  detail: string;
  status: RequestStatus;
  at: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  number: string;
  amount: number;
  status: InvoiceStatus;
  due: string;
  issued: string;
}

export interface Update {
  id: string;
  clientId: string;
  title: string;
  body: string;
  at: string;
}

export interface DB {
  agency: { name: string; tagline: string; accent: string };
  clients: Client[];
  projects: Project[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  comments: Comment[];
  requests: Request[];
  invoices: Invoice[];
  updates: Update[];
}

const now = new Date("2026-07-07T10:00:00");
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 86400000).toISOString();
const daysAhead = (n: number) =>
  new Date(now.getTime() + n * 86400000).toISOString();

export const seed: DB = {
  agency: {
    name: "Northwind Studio",
    tagline: "Design & marketing, kept in the loop.",
    accent: "91 87 230",
  },
  clients: [
    {
      id: "cl_meridian",
      name: "Meridian Coffee",
      contact: "Dana Whitfield",
      email: "dana@meridian.coffee",
      accent: "196 108 58",
      initials: "MC",
      since: daysAgo(220),
    },
    {
      id: "cl_atlas",
      name: "Atlas Fitness",
      contact: "Rafael Nunes",
      email: "raf@atlasfit.co",
      accent: "36 132 120",
      initials: "AF",
      since: daysAgo(96),
    },
    {
      id: "cl_verdant",
      name: "Verdant Home",
      contact: "Priya Anand",
      email: "priya@verdanthome.com",
      accent: "104 132 58",
      initials: "VH",
      since: daysAgo(41),
    },
  ],
  projects: [
    {
      id: "pr_meridian_rebrand",
      clientId: "cl_meridian",
      name: "Brand refresh & packaging",
      status: "on_track",
      summary: "New identity system rolling out across cups, bags, and storefront.",
      started: daysAgo(58),
    },
    {
      id: "pr_meridian_site",
      clientId: "cl_meridian",
      name: "Ordering website",
      status: "at_risk",
      summary: "Subscription checkout and store locator build.",
      started: daysAgo(30),
    },
    {
      id: "pr_atlas_launch",
      clientId: "cl_atlas",
      name: "Spring campaign",
      status: "on_track",
      summary: "Paid social, landing pages, and launch film for the new membership tier.",
      started: daysAgo(24),
    },
    {
      id: "pr_verdant_identity",
      clientId: "cl_verdant",
      name: "Visual identity",
      status: "paused",
      summary: "Logo, palette, and a starter component kit for the storefront.",
      started: daysAgo(18),
    },
  ],
  milestones: [
    { id: "ms1", projectId: "pr_meridian_rebrand", title: "Moodboard signed off", due: daysAgo(40), done: true },
    { id: "ms2", projectId: "pr_meridian_rebrand", title: "Logo direction chosen", due: daysAgo(20), done: true },
    { id: "ms3", projectId: "pr_meridian_rebrand", title: "Packaging artwork", due: daysAhead(6), done: false },
    { id: "ms4", projectId: "pr_meridian_rebrand", title: "Storefront rollout", due: daysAhead(24), done: false },
    { id: "ms5", projectId: "pr_meridian_site", title: "Wireframes approved", due: daysAgo(8), done: true },
    { id: "ms6", projectId: "pr_meridian_site", title: "Checkout flow", due: daysAhead(3), done: false },
    { id: "ms7", projectId: "pr_meridian_site", title: "Launch", due: daysAhead(15), done: false },
    { id: "ms8", projectId: "pr_atlas_launch", title: "Campaign concept", due: daysAgo(10), done: true },
    { id: "ms9", projectId: "pr_atlas_launch", title: "Landing pages live", due: daysAhead(4), done: false },
    { id: "ms10", projectId: "pr_atlas_launch", title: "Launch film cut", due: daysAhead(12), done: false },
    { id: "ms11", projectId: "pr_verdant_identity", title: "Logo concepts", due: daysAhead(9), done: false },
    { id: "ms12", projectId: "pr_verdant_identity", title: "Component kit", due: daysAhead(21), done: false },
  ],
  deliverables: [
    {
      id: "dl1", projectId: "pr_meridian_rebrand", clientId: "cl_meridian",
      title: "Packaging artwork — round 2", kind: "PDF · 14 pages",
      status: "shared", sharedAt: daysAgo(1), thumbSeed: "coffeebag",
    },
    {
      id: "dl2", projectId: "pr_meridian_rebrand", clientId: "cl_meridian",
      title: "Logo lockups", kind: "Figma", status: "approved", sharedAt: daysAgo(19), thumbSeed: "logo",
    },
    {
      id: "dl3", projectId: "pr_meridian_site", clientId: "cl_meridian",
      title: "Checkout flow — prototype", kind: "Figma", status: "changes_requested", sharedAt: daysAgo(3), thumbSeed: "checkout",
    },
    {
      id: "dl4", projectId: "pr_atlas_launch", clientId: "cl_atlas",
      title: "Launch film — first cut", kind: "Video · 0:48", status: "shared", sharedAt: daysAgo(2), thumbSeed: "gym",
    },
    {
      id: "dl5", projectId: "pr_atlas_launch", clientId: "cl_atlas",
      title: "Landing page designs", kind: "Figma", status: "approved", sharedAt: daysAgo(9), thumbSeed: "fitness",
    },
    {
      id: "dl6", projectId: "pr_verdant_identity", clientId: "cl_verdant",
      title: "Logo concepts — set A", kind: "PDF · 6 pages", status: "shared", sharedAt: daysAgo(1), thumbSeed: "plant",
    },
  ],
  comments: [
    {
      id: "cm1", deliverableId: "dl3", author: "Dana Whitfield", role: "client",
      body: "Love the layout. Can the delivery step come before payment? Our regulars order fast.",
      at: daysAgo(3),
    },
    {
      id: "cm2", deliverableId: "dl2", author: "Dana Whitfield", role: "client",
      body: "This is perfect. Ship it.", at: daysAgo(19),
    },
  ],
  requests: [
    {
      id: "rq1", clientId: "cl_meridian", title: "Add a holiday gift-card banner",
      detail: "Something warm for the storefront homepage through December.",
      status: "open", at: daysAgo(1),
    },
    {
      id: "rq2", clientId: "cl_atlas", title: "Resize hero for out-of-home",
      detail: "Need the launch key art at billboard ratio for two placements.",
      status: "in_progress", at: daysAgo(4),
    },
    {
      id: "rq3", clientId: "cl_meridian", title: "Export social kit",
      detail: "Instagram + story sizes of the new packaging shots.",
      status: "done", at: daysAgo(12),
    },
  ],
  invoices: [
    { id: "in1", clientId: "cl_meridian", number: "NW-1042", amount: 4800, status: "paid", due: daysAgo(15), issued: daysAgo(30) },
    { id: "in2", clientId: "cl_meridian", number: "NW-1051", amount: 3200, status: "pending", due: daysAhead(9), issued: daysAgo(4) },
    { id: "in3", clientId: "cl_atlas", number: "NW-1048", amount: 6500, status: "overdue", due: daysAgo(5), issued: daysAgo(26) },
    { id: "in4", clientId: "cl_atlas", number: "NW-1052", amount: 2100, status: "pending", due: daysAhead(14), issued: daysAgo(2) },
    { id: "in5", clientId: "cl_verdant", number: "NW-1050", amount: 1800, status: "paid", due: daysAgo(2), issued: daysAgo(16) },
  ],
  updates: [
    {
      id: "up1", clientId: "cl_meridian", title: "Packaging round 2 is ready to review",
      body: "We tightened the type on the bag and warmed the brown by a hair. Have a look when you get a minute.",
      at: daysAgo(1),
    },
    {
      id: "up2", clientId: "cl_meridian", title: "Wireframes approved — into visual design",
      body: "Thanks for the fast turnaround. We're moving the ordering site into high-fidelity this week.",
      at: daysAgo(8),
    },
    {
      id: "up3", clientId: "cl_atlas", title: "First cut of the launch film",
      body: "Rough sound, locked picture. Curious what you think of the opening shot.",
      at: daysAgo(2),
    },
    {
      id: "up4", clientId: "cl_verdant", title: "Kickoff recap",
      body: "Great to meet the team. Logo concepts land next week — set A is already up.",
      at: daysAgo(17),
    },
  ],
};

/* ---- formatting helpers ---- */

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  const d = Math.round(diff / day);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

export function dueLabel(iso: string): { label: string; overdue: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  const d = Math.round(diff / 86400000);
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, overdue: true };
  if (d === 0) return { label: "due today", overdue: false };
  if (d === 1) return { label: "due tomorrow", overdue: false };
  return { label: `due in ${d}d`, overdue: false };
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
