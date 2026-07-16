-- ============================================================================
-- 0003 — Helper functions & RPCs
-- ----------------------------------------------------------------------------
-- The tenant helpers are the hot path: every RLS policy calls them. Three
-- optimizations:
--
--   * FAST PATH — if the JWT carries app_metadata.{organization_id,role,
--     client_id} (populate it with a Supabase custom-claims auth hook), the
--     helpers read straight from the token with ZERO table I/O.
--   * FALLBACK — otherwise they read the caller's profile once. Marked STABLE
--     and, because policies call them as `(select app.current_org())`, the
--     planner evaluates them a single time per query (an InitPlan), not once
--     per row.
--   * SECURITY DEFINER with a locked, empty search_path so the fallback SELECT
--     on public.users bypasses users-table RLS (no recursion) and can't be
--     hijacked via search_path.
-- ============================================================================

create or replace function app.current_org()
  returns uuid
  language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid,
    (select u.organization_id from public.users u where u.id = auth.uid())
  )
$$;

create or replace function app.current_role()
  returns app.user_role
  language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::app.user_role,
    (select u.role from public.users u where u.id = auth.uid())
  )
$$;

create or replace function app.current_client_id()
  returns uuid
  language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'client_id', '')::uuid,
    (select u.client_id from public.users u where u.id = auth.uid())
  )
$$;

create or replace function app.is_agency()
  returns boolean
  language sql stable security definer set search_path = ''
as $$
  select app.current_role() in ('agency_admin', 'agency_member')
$$;

grant execute on function
  app.current_org(), app.current_role(), app.current_client_id(), app.is_agency()
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at bump
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Stamp helpers — let the client send a minimal payload while the server
-- fills tenant keys authoritatively (defense in depth alongside RLS).
-- ---------------------------------------------------------------------------

-- comments: caller sends { deliverable_id, body }. We derive org/client from
-- the deliverable and author from the JWT.
create or replace function app.stamp_comment()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.deliverables%rowtype;
begin
  select * into d from public.deliverables where id = new.deliverable_id;
  if not found then raise exception 'deliverable % not found', new.deliverable_id; end if;
  new.organization_id := d.organization_id;
  new.client_id       := d.client_id;
  new.author_id       := coalesce(new.author_id, auth.uid());
  new.role            := coalesce(new.role, app.current_role());
  new.author_name     := coalesce(nullif(new.author_name, ''),
                            (select full_name from public.users where id = auth.uid()), '');
  return new;
end $$;

-- requests: caller sends { client_id, title, detail }. Fill org + created_by.
create or replace function app.stamp_request()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.clients%rowtype;
begin
  select * into c from public.clients where id = new.client_id;
  if not found then raise exception 'client % not found', new.client_id; end if;
  new.organization_id := c.organization_id;
  new.created_by      := coalesce(new.created_by, auth.uid());
  return new;
end $$;

-- updates: caller sends { client_id, title, body }. Fill org + author.
create or replace function app.stamp_update()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.clients%rowtype;
begin
  select * into c from public.clients where id = new.client_id;
  if not found then raise exception 'client % not found', new.client_id; end if;
  new.organization_id := c.organization_id;
  new.author_id       := coalesce(new.author_id, auth.uid());
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Approval-loop RPC — clients change ONLY status via this SECURITY DEFINER
-- function, so we never grant them UPDATE on the deliverables table (they
-- couldn't be trusted to leave other columns alone). Authorization is explicit.
-- ---------------------------------------------------------------------------
create or replace function app.set_deliverable_status(
  p_deliverable uuid,
  p_status app.deliverable_status
) returns public.deliverables
  language plpgsql security definer set search_path = ''
as $$
declare d public.deliverables%rowtype;
begin
  select * into d from public.deliverables where id = p_deliverable;
  if not found then raise exception 'deliverable not found' using errcode = 'no_data_found'; end if;

  -- must be same-org agency, or the client that owns this deliverable
  if not (
       (app.is_agency() and d.organization_id = app.current_org())
    or (d.client_id = app.current_client_id())
  ) then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  update public.deliverables
     set status = p_status, updated_at = now()
   where id = p_deliverable
   returning * into d;
  return d;
end $$;

grant execute on function app.set_deliverable_status(uuid, app.deliverable_status)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Auth provisioning — when a new auth user is created, mirror a profile row
-- from the signup metadata. On real Supabase this fires on auth.users insert.
-- ---------------------------------------------------------------------------
create or replace function app.handle_new_user()
  returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, organization_id, role, full_name, email, client_id)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'organization_id')::uuid,
    coalesce((new.raw_user_meta_data ->> 'role')::app.user_role, 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'client_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end $$;
