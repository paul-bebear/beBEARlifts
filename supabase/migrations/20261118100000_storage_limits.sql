-- The backups bucket allows 50 MB per file for the JSON backups, and a JPEG in <uid>/photos/ had the same limit with no count.
-- A separate photo bucket would need a new upload path in src/utils/cloudBackupClient.ts, so a trigger caps the photos instead.
-- Storage first inserts the row without metadata to test the policies, then upserts it with metadata.size after the upload.
-- A row with no size yet passes the size check, and the final upsert meets it.

-- A backup is JSON.stringify with indent 2 (src/utils/fullBackupFile.ts). screenshots/fixtures/demo.json is 17.3 KB per workout.
-- 5 years at 4 workouts a week is about 18 MB, so 30 MB per file leaves room.
update storage.buckets set file_size_limit = 31457280 where id = 'backups';

create schema if not exists private;

create or replace function private.limit_photo_objects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_folder text := (storage.foldername(new.name))[1];
  size_bytes bigint := (new.metadata->>'size')::bigint;
  max_photo_bytes constant bigint := 2097152;
  -- The phone keeps 200 photos (ProgressPhotos_maxPhotos). The extra 50 leave room for a second phone.
  max_backup_photos constant int := 250;
  -- The app uploads a meal photo just before its meal_posts row, so only a failed post leaves one with no row.
  max_meal_photos_without_post constant int := 10;
  -- A heavy user: 9 backup copies of 10 MB, 200 photos of 250 KB and 2 years of daily 150 KB meal photos is 250 MB.
  max_user_bytes constant bigint := 314572800;
begin
  if size_bytes is not null and size_bytes + (
    select coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.objects o
    where o.bucket_id in ('backups', 'meal-photos')
      and o.name like owner_folder || '/%'
      and not (o.bucket_id = new.bucket_id and o.name = new.name)
  ) > max_user_bytes then
    raise exception 'This account has used its 300 MB of cloud storage.';
  end if;
  if new.bucket_id = 'backups' and (storage.foldername(new.name))[2] = 'photos' then
    if size_bytes > max_photo_bytes then
      raise exception 'A photo can be at most 2 MB.';
    end if;
    if (
      select count(*) from storage.objects o
      where o.bucket_id = 'backups'
        and o.name like owner_folder || '/photos/%'
        and o.name <> new.name
    ) >= max_backup_photos then
      raise exception 'The cloud backup keeps at most 250 photos.';
    end if;
  elsif new.bucket_id = 'meal-photos' then
    if (
      select count(*) from storage.objects o
      where o.bucket_id = 'meal-photos'
        and o.name like owner_folder || '/%'
        and o.name <> new.name
        and not exists (select 1 from public.meal_posts m where m.photo_path = o.name)
    ) >= max_meal_photos_without_post then
      raise exception 'Too many meal photos without a post. Share the meals first.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.limit_photo_objects() from public, anon, authenticated;

drop trigger if exists limit_photo_objects on storage.objects;
create trigger limit_photo_objects
  before insert or update on storage.objects
  for each row
  when (new.bucket_id in ('backups', 'meal-photos'))
  execute function private.limit_photo_objects();
