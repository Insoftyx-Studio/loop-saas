-- ============================================================================
-- 0008 — Storage (deliverable files)
-- ----------------------------------------------------------------------------
-- Files live in a PRIVATE bucket under the path convention:
--     {organization_id}/{client_id}/{deliverable_id}/{filename}
-- Storage RLS parses those path segments so the same tenant rules apply to
-- bytes as to rows: agency sees its org; a client sees only its own folder.
--
-- Guarded with an existence check so this migration is a harmless no-op on the
-- plain-Postgres validation harness (which has no `storage` schema).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) then
    raise notice 'storage schema absent — skipping bucket/policies (local validation)';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('deliverables', 'deliverables', false)
  on conflict (id) do nothing;

  -- read: agency in the org, or the owning client
  execute $p$
    create policy deliverable_files_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'deliverables'
        and (storage.foldername(name))[1] = (select app.current_org())::text
        and (
          (select app.is_agency())
          or (storage.foldername(name))[2] = (select app.current_client_id())::text
        )
      );
  $p$;

  -- write (upload/update/delete): agency only, within its org folder
  execute $p$
    create policy deliverable_files_write on storage.objects
      for all to authenticated
      using (
        bucket_id = 'deliverables'
        and (select app.is_agency())
        and (storage.foldername(name))[1] = (select app.current_org())::text
      )
      with check (
        bucket_id = 'deliverables'
        and (select app.is_agency())
        and (storage.foldername(name))[1] = (select app.current_org())::text
      );
  $p$;
end $$;
