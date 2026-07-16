-- ============================================================================
-- 0007 — Aggregation views & RPCs
-- ----------------------------------------------------------------------------
-- Progress is computed in the database, not by shipping every milestone to the
-- browser and counting there. Views use security_invoker so the caller's RLS
-- still applies (a client only ever aggregates their own rows).
--
-- The two snapshot RPCs collapse a whole screen's worth of queries into ONE
-- round trip — a real latency win over the public internet.
-- ============================================================================

-- ---- progress views -------------------------------------------------------
create view public.project_progress
  with (security_invoker = true) as
select
  p.id              as project_id,
  p.organization_id,
  p.client_id,
  count(m.*) filter (where m.done)                             as done_count,
  count(m.*)                                                   as total_count,
  case when count(m.*) > 0
       then round(count(m.*) filter (where m.done)::numeric / count(m.*), 4)
       else 0 end                                             as pct
from public.projects p
left join public.milestones m on m.project_id = p.id
group by p.id;

create view public.client_progress
  with (security_invoker = true) as
select
  c.id              as client_id,
  c.organization_id,
  count(m.*) filter (where m.done)                             as done_count,
  count(m.*)                                                   as total_count,
  case when count(m.*) > 0
       then round(count(m.*) filter (where m.done)::numeric / count(m.*), 4)
       else 0 end                                             as pct
from public.clients c
left join public.milestones m on m.client_id = c.id
group by c.id;

grant select on public.project_progress, public.client_progress to authenticated;

-- ---- agency overview (one call for the dashboard header) ------------------
create or replace function app.agency_overview()
  returns jsonb
  language sql stable security invoker set search_path = public, app
as $$
  select jsonb_build_object(
    'clients',           (select count(*) from clients),
    'active_projects',   (select count(*) from projects where status <> 'delivered'),
    'pending_approvals', (select count(*) from deliverables where status = 'shared'),
    'open_requests',     (select count(*) from requests where status = 'open'),
    'outstanding_cents', (select coalesce(sum(amount_cents), 0) from invoices where status <> 'paid')
  )
$$;
grant execute on function app.agency_overview() to authenticated;

-- ---- client portal snapshot (one call for the whole branded portal) -------
-- p_client defaults to the caller's own client. RLS guarantees a client can
-- only ever see their own data even if another id is supplied.
create or replace function app.client_snapshot(p_client uuid default null)
  returns jsonb
  language sql stable security invoker set search_path = public, app
as $$
  with cid as (select coalesce(p_client, app.current_client_id()) as id)
  select jsonb_build_object(
    'client',   (select to_jsonb(c) from clients c, cid where c.id = cid.id),
    'progress', (select to_jsonb(cp) from client_progress cp, cid where cp.client_id = cid.id),
    'projects', (
      select coalesce(jsonb_agg(to_jsonb(pp) order by pp.name), '[]')
      from (
        select p.*, pr.done_count, pr.total_count, pr.pct
        from projects p
        join project_progress pr on pr.project_id = p.id
        , cid where p.client_id = cid.id
      ) pp
    ),
    'deliverables', (
      select coalesce(jsonb_agg(to_jsonb(d) order by d.shared_at desc), '[]')
      from deliverables d, cid where d.client_id = cid.id
    ),
    'invoices', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.issued desc), '[]')
      from invoices i, cid where i.client_id = cid.id
    ),
    'updates', (
      select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at desc), '[]')
      from updates u, cid where u.client_id = cid.id
    ),
    'requests', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]')
      from requests r, cid where r.client_id = cid.id
    )
  )
$$;
grant execute on function app.client_snapshot(uuid) to authenticated;
