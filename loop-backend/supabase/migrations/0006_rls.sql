-- ============================================================================
-- 0006 — Row-Level Security  (the multi-tenancy guarantee)
-- ----------------------------------------------------------------------------
-- Model:
--   * Agency users (agency_admin | agency_member) may act on ANY row in their
--     organization.
--   * Client users may READ only rows tied to their own client_id, and may
--     INSERT comments and requests for themselves. Everything else is denied.
--
-- Performance:
--   * Every policy is scoped `TO authenticated`, so it's never evaluated for
--     the anon role.
--   * Helper calls are wrapped as `(select app.…())` so Postgres runs them once
--     per query (InitPlan) instead of once per row — the single biggest RLS
--     speedup, and the reason every predicate below uses that form.
--   * Predicates touch only same-row columns (organization_id / client_id),
--     each of which is indexed.
--
-- RLS is ENABLED (not FORCED): the table owner and service_role bypass it, so
-- migrations, seeds, and trusted server code work; PostgREST's anon/authenticated
-- roles are fully governed.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','clients','users','projects','milestones',
    'deliverables','comments','requests','invoices','updates'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---- organizations --------------------------------------------------------
create policy org_read on public.organizations
  for select to authenticated
  using (id = (select app.current_org()));

create policy org_admin_update on public.organizations
  for update to authenticated
  using (id = (select app.current_org()) and (select app.current_role()) = 'agency_admin')
  with check (id = (select app.current_org()) and (select app.current_role()) = 'agency_admin');

-- ---- users ----------------------------------------------------------------
create policy users_read on public.users
  for select to authenticated
  using (
    organization_id = (select app.current_org())
    and ((select app.is_agency()) or id = (select auth.uid()))
  );

create policy users_admin_write on public.users
  for all to authenticated
  using (organization_id = (select app.current_org()) and (select app.current_role()) = 'agency_admin')
  with check (organization_id = (select app.current_org()) and (select app.current_role()) = 'agency_admin');

-- ---- clients --------------------------------------------------------------
create policy clients_agency_all on public.clients
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy clients_client_read on public.clients
  for select to authenticated
  using (organization_id = (select app.current_org()) and id = (select app.current_client_id()));

-- ---- projects -------------------------------------------------------------
create policy projects_agency_all on public.projects
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy projects_client_read on public.projects
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ---- milestones -----------------------------------------------------------
create policy milestones_agency_all on public.milestones
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy milestones_client_read on public.milestones
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ---- deliverables ---------------------------------------------------------
-- Clients never UPDATE directly; they flip status via app.set_deliverable_status().
create policy deliverables_agency_all on public.deliverables
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy deliverables_client_read on public.deliverables
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ---- comments -------------------------------------------------------------
create policy comments_agency_all on public.comments
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy comments_client_read on public.comments
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- client may add a comment to their own deliverable (trigger stamps the keys)
create policy comments_client_insert on public.comments
  for insert to authenticated
  with check (
    organization_id = (select app.current_org())
    and client_id = (select app.current_client_id())
    and author_id = (select auth.uid())
  );

-- ---- requests -------------------------------------------------------------
create policy requests_agency_all on public.requests
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy requests_client_read on public.requests
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

create policy requests_client_insert on public.requests
  for insert to authenticated
  with check (
    organization_id = (select app.current_org())
    and client_id = (select app.current_client_id())
    and created_by = (select auth.uid())
  );

-- ---- invoices -------------------------------------------------------------
create policy invoices_agency_all on public.invoices
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy invoices_client_read on public.invoices
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));

-- ---- updates --------------------------------------------------------------
create policy updates_agency_all on public.updates
  for all to authenticated
  using ((select app.is_agency()) and organization_id = (select app.current_org()))
  with check ((select app.is_agency()) and organization_id = (select app.current_org()));

create policy updates_client_read on public.updates
  for select to authenticated
  using (organization_id = (select app.current_org()) and client_id = (select app.current_client_id()));
