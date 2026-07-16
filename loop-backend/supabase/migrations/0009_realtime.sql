-- ============================================================================
-- 0009 — Realtime
-- ----------------------------------------------------------------------------
-- The approval loop should feel instant: when a client approves, the agency's
-- board flips without a refresh. We add exactly the tables the UI subscribes to
-- into Supabase's realtime publication. REPLICA IDENTITY FULL lets subscribers
-- receive the previous row on UPDATE/DELETE (needed for reliable client-side
-- reconciliation and for RLS-filtered change streams).
--
-- Guarded so it's a no-op where the publication doesn't exist (local harness).
-- ============================================================================

do $$
begin
  alter table public.deliverables replica identity full;
  alter table public.comments     replica identity full;
  alter table public.requests     replica identity full;
  alter table public.updates      replica identity full;
  alter table public.milestones   replica identity full;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.deliverables, public.comments, public.requests,
      public.updates, public.milestones;
  else
    raise notice 'supabase_realtime publication absent — skipping (local validation)';
  end if;
end $$;
