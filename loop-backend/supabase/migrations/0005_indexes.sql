-- ============================================================================
-- 0005 — Indexes
-- ----------------------------------------------------------------------------
-- Rule of thumb applied here: index every column referenced by an RLS policy,
-- every foreign key, and every column used to filter/order a listing. Postgres
-- does NOT auto-index foreign keys, so we do it explicitly. Composite and
-- PARTIAL indexes target the specific hot queries the UI issues.
-- ============================================================================

-- users: helper fallback hits the PK (id); these serve joins/listing.
create index idx_users_org        on public.users (organization_id);
create index idx_users_client     on public.users (client_id) where client_id is not null;

-- clients: agency lists by org; client self-access hits the PK.
create index idx_clients_org      on public.clients (organization_id);

-- projects
create index idx_projects_org     on public.projects (organization_id);
create index idx_projects_client  on public.projects (client_id);

-- milestones: fetched per project; RLS filters by client/org.
create index idx_milestones_project on public.milestones (project_id, position);
create index idx_milestones_client  on public.milestones (client_id);
create index idx_milestones_org     on public.milestones (organization_id);

-- deliverables: several access paths.
create index idx_deliverables_org       on public.deliverables (organization_id);
create index idx_deliverables_client    on public.deliverables (client_id, shared_at desc);
create index idx_deliverables_project   on public.deliverables (project_id);
-- HOT: agency "pending approvals" queue + overview count. Partial keeps it tiny.
create index idx_deliverables_pending
  on public.deliverables (organization_id, shared_at desc)
  where status = 'shared';

-- comments: the thread, ordered, per deliverable.
create index idx_comments_deliverable on public.comments (deliverable_id, created_at);
create index idx_comments_org         on public.comments (organization_id);
create index idx_comments_client      on public.comments (client_id);

-- requests: agency board filters by status; client lists their own newest.
create index idx_requests_org_status  on public.requests (organization_id, status);
create index idx_requests_client      on public.requests (client_id, created_at desc);
-- HOT: open-request count for the overview badge.
create index idx_requests_open
  on public.requests (organization_id)
  where status = 'open';

-- invoices: summary tiles group by status; client lists their own.
create index idx_invoices_org_status  on public.invoices (organization_id, status);
create index idx_invoices_client      on public.invoices (client_id);

-- updates: feeds ordered newest-first.
create index idx_updates_org      on public.updates (organization_id, created_at desc);
create index idx_updates_client   on public.updates (client_id, created_at desc);
