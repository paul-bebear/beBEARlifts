insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/json'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their own backups" on storage.objects;
create policy "Users read their own backups"
  on storage.objects for select to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users add their own backups" on storage.objects;
create policy "Users add their own backups"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users replace their own backups" on storage.objects;
create policy "Users replace their own backups"
  on storage.objects for update to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);
