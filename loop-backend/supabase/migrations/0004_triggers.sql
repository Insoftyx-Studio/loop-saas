-- ============================================================================
-- 0004 — Triggers
-- ============================================================================

-- updated_at on every mutable table
create trigger t_org_touch    before update on public.organizations
  for each row execute function app.touch_updated_at();
create trigger t_client_touch before update on public.clients
  for each row execute function app.touch_updated_at();
create trigger t_user_touch   before update on public.users
  for each row execute function app.touch_updated_at();
create trigger t_project_touch before update on public.projects
  for each row execute function app.touch_updated_at();
create trigger t_milestone_touch before update on public.milestones
  for each row execute function app.touch_updated_at();
create trigger t_deliverable_touch before update on public.deliverables
  for each row execute function app.touch_updated_at();
create trigger t_request_touch before update on public.requests
  for each row execute function app.touch_updated_at();
create trigger t_invoice_touch before update on public.invoices
  for each row execute function app.touch_updated_at();

-- server-authoritative tenant stamping on insert
create trigger t_stamp_comment before insert on public.comments
  for each row execute function app.stamp_comment();
create trigger t_stamp_request before insert on public.requests
  for each row execute function app.stamp_request();
create trigger t_stamp_update  before insert on public.updates
  for each row execute function app.stamp_update();

-- provision a profile when an auth user is created
create trigger t_on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_user();
