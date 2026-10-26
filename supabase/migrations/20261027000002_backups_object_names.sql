-- The app writes <user id>/latest.json, <user id>/day-0.json to day-6.json and <user id>/replaced.json (src/models/cloudBackup.ts).
-- Any other name let a signed-in user store unlimited 50 MB files in their own folder.
-- Files already stored under other names stay and can still be read and deleted.
drop policy if exists "Users add their own backups" on storage.objects;
create policy "Users add their own backups"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'backups'
    and name ~ ('^' || (select auth.uid())::text || '/(latest|replaced|day-[0-6])\.json$')
  );

drop policy if exists "Users replace their own backups" on storage.objects;
create policy "Users replace their own backups"
  on storage.objects for update to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'backups'
    and name ~ ('^' || (select auth.uid())::text || '/(latest|replaced|day-[0-6])\.json$')
  );
