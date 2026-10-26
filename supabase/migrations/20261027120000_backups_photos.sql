-- Progress photos join the cloud backup as <uid>/photos/<id>.jpg next to latest.json.
update storage.buckets
set allowed_mime_types = array['application/json', 'image/jpeg']
where id = 'backups';

-- 20261027000002_backups_object_names.sql (PR 152) allows only the JSON names. This runs after it and adds the photos.
drop policy if exists "Users add their own backups" on storage.objects;
create policy "Users add their own backups"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'backups'
    and name ~ ('^' || (select auth.uid())::text || '/((latest|replaced|day-[0-6])\.json|photos/[0-9]+\.jpg)$')
  );

drop policy if exists "Users replace their own backups" on storage.objects;
create policy "Users replace their own backups"
  on storage.objects for update to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'backups'
    and name ~ ('^' || (select auth.uid())::text || '/((latest|replaced|day-[0-6])\.json|photos/[0-9]+\.jpg)$')
  );

-- A photo deleted on the phone is deleted from the backup too. Only the photos folder can be deleted from.
drop policy if exists "Users delete their own backup photos" on storage.objects;
create policy "Users delete their own backup photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'backups'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'photos'
  );
