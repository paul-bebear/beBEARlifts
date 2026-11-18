begin;

create function pg_temp.assert_text(query text, expected text)
returns void language plpgsql as $$
declare actual text;
begin
  execute query into actual;
  if actual is distinct from expected then
    raise exception 'Expected %, got % for %', expected, actual, query;
  end if;
end;
$$;

create function pg_temp.assert_rejected_with(query text, expected_message text)
returns void language plpgsql as $$
begin
  begin
    execute query;
  exception when others then
    if sqlerrm not like expected_message then
      raise exception 'Expected "%", got "%" for %', expected_message, sqlerrm, query;
    end if;
    return;
  end;
  raise exception 'Query unexpectedly succeeded: %', query;
end;
$$;

insert into auth.users(id) values
  ('00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000d2');
insert into public.profiles(user_id, handle, display_name) values
  ('00000000-0000-0000-0000-0000000000d1', 'storage_d1', 'Storage');

-- The trigger runs for every role, so the rows go in as the test owner without the bucket policies.
-- A photo over 2 MB is refused, at insert and at the upsert that adds the size. A JSON backup only has the 30 MB bucket limit.
insert into storage.objects(bucket_id, name, metadata) values
  ('backups', '00000000-0000-0000-0000-0000000000d1/latest.json', '{"size": 10485760}'),
  ('backups', '00000000-0000-0000-0000-0000000000d1/photos/1.jpg', null),
  ('backups', '00000000-0000-0000-0000-0000000000d1/photos/2.jpg', '{"size": 2097152}');
select pg_temp.assert_rejected_with(
  $q$insert into storage.objects(bucket_id, name, metadata) values ('backups', '00000000-0000-0000-0000-0000000000d1/photos/3.jpg', '{"size": 2097153}')$q$,
  'A photo can be at most 2 MB.'
);
select pg_temp.assert_rejected_with(
  $q$update storage.objects set metadata = '{"size": 52428800}' where name = '00000000-0000-0000-0000-0000000000d1/photos/1.jpg'$q$,
  'A photo can be at most 2 MB.'
);

-- 250 photos per user. The 251st is refused, a re-upload of a stored photo passes, and another user is not affected.
insert into storage.objects(bucket_id, name, metadata)
select 'backups', '00000000-0000-0000-0000-0000000000d1/photos/' || g || '.jpg', '{"size": 200000}'
from generate_series(3, 250) g;
select pg_temp.assert_text(
  $q$select count(*)::text from storage.objects where name like '00000000-0000-0000-0000-0000000000d1/photos/%'$q$,
  '250'
);
select pg_temp.assert_rejected_with(
  $q$insert into storage.objects(bucket_id, name, metadata) values ('backups', '00000000-0000-0000-0000-0000000000d1/photos/251.jpg', '{"size": 200000}')$q$,
  'The cloud backup keeps at most 250 photos.'
);
insert into storage.objects(bucket_id, name, metadata)
values ('backups', '00000000-0000-0000-0000-0000000000d1/photos/250.jpg', '{"size": 210000}')
on conflict (bucket_id, name) do update set metadata = excluded.metadata;
insert into storage.objects(bucket_id, name, metadata) values
  ('backups', '00000000-0000-0000-0000-0000000000d2/photos/1.jpg', '{"size": 200000}');

-- Meal photos: 10 with no meal_posts row, then the next is refused. A photo whose post exists does not count.
insert into public.meal_posts(id, user_id, description, macros, photo_path) values (
  'aaaaaaaa-0000-4000-8000-000000000000',
  '00000000-0000-0000-0000-0000000000d1',
  'Oats',
  '{}',
  '00000000-0000-0000-0000-0000000000d1/aaaaaaaa-0000-4000-8000-000000000000.jpg'
);
insert into storage.objects(bucket_id, name, metadata) values
  ('meal-photos', '00000000-0000-0000-0000-0000000000d1/aaaaaaaa-0000-4000-8000-000000000000.jpg', '{"size": 300000}');
insert into storage.objects(bucket_id, name, metadata)
select 'meal-photos', '00000000-0000-0000-0000-0000000000d1/' || gen_random_uuid() || '.jpg', '{"size": 300000}'
from generate_series(1, 10);
select pg_temp.assert_rejected_with(
  $q$insert into storage.objects(bucket_id, name, metadata) values ('meal-photos', '00000000-0000-0000-0000-0000000000d1/bbbbbbbb-0000-4000-8000-000000000000.jpg', '{"size": 300000}')$q$,
  'Too many meal photos without a post.%'
);
insert into storage.objects(bucket_id, name, metadata) values
  ('meal-photos', '00000000-0000-0000-0000-0000000000d2/bbbbbbbb-0000-4000-8000-000000000000.jpg', '{"size": 300000}');

-- JSON files may be 30 MB. Storage itself enforces the bucket limit, so only the value is checked here.
select pg_temp.assert_text($q$select file_size_limit::text from storage.buckets where id = 'backups'$q$, '31457280');

-- 300 MB per user across both buckets. d2 holds 500,000 bytes so far.
-- 9 JSON copies at 30 MB plus 15 photos of 2,000,000 bytes is 313,615,520 bytes.
insert into storage.objects(bucket_id, name, metadata)
select 'backups', '00000000-0000-0000-0000-0000000000d2/' || n || '.json', '{"size": 31457280}'
from unnest(array['latest', 'replaced', 'day-0', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6']) n;
insert into storage.objects(bucket_id, name, metadata)
select 'backups', '00000000-0000-0000-0000-0000000000d2/photos/' || g || '.jpg', '{"size": 2000000}'
from generate_series(2, 16) g;
-- A replaced file counts once, so the daily upsert of latest.json passes.
insert into storage.objects(bucket_id, name, metadata)
values ('backups', '00000000-0000-0000-0000-0000000000d2/latest.json', '{"size": 31457280}')
on conflict (bucket_id, name) do update set metadata = excluded.metadata;
select pg_temp.assert_rejected_with(
  $q$insert into storage.objects(bucket_id, name, metadata) values ('backups', '00000000-0000-0000-0000-0000000000d2/photos/17.jpg', '{"size": 2000000}')$q$,
  'This account has used its 300 MB of cloud storage.'
);
select pg_temp.assert_rejected_with(
  $q$insert into storage.objects(bucket_id, name, metadata) values ('meal-photos', '00000000-0000-0000-0000-0000000000d2/cccccccc-0000-4000-8000-000000000000.jpg', '{"size": 1000000}')$q$,
  'This account has used its 300 MB of cloud storage.'
);
-- The first write has no size yet, so it passes. Its upsert with the size is the one refused.
insert into storage.objects(bucket_id, name, metadata)
values ('backups', '00000000-0000-0000-0000-0000000000d2/photos/17.jpg', null);
select pg_temp.assert_rejected_with(
  $q$update storage.objects set metadata = '{"size": 2000000}' where name = '00000000-0000-0000-0000-0000000000d2/photos/17.jpg'$q$,
  'This account has used its 300 MB of cloud storage.'
);

-- A move counts the file once. d1 holds 250 photos, and moving one to a new name passes.
update storage.objects set name = '00000000-0000-0000-0000-0000000000d1/photos/300.jpg'
where bucket_id = 'backups' and name = '00000000-0000-0000-0000-0000000000d1/photos/250.jpg';
select pg_temp.assert_text(
  $q$select count(*)::text from storage.objects where name like '00000000-0000-0000-0000-0000000000d1/photos/%'$q$,
  '250'
);

-- A user over the cap may replace a file with a smaller one, but not with a larger one.
-- Accounts over the cap exist only from before this migration, so the trigger is skipped to set one up.
set local session_replication_role = replica;
insert into storage.objects(bucket_id, name, metadata) values
  ('meal-photos', '00000000-0000-0000-0000-0000000000d2/dddddddd-0000-4000-8000-000000000000.jpg', '{"size": 5000000}');
set local session_replication_role = origin;
insert into storage.objects(bucket_id, name, metadata)
values ('backups', '00000000-0000-0000-0000-0000000000d2/latest.json', '{"size": 30000000}')
on conflict (bucket_id, name) do update set metadata = excluded.metadata;
select pg_temp.assert_rejected_with(
  $q$insert into storage.objects(bucket_id, name, metadata) values ('backups', '00000000-0000-0000-0000-0000000000d2/latest.json', '{"size": 31457280}') on conflict (bucket_id, name) do update set metadata = excluded.metadata$q$,
  'This account has used its 300 MB of cloud storage.'
);
update storage.objects set name = '00000000-0000-0000-0000-0000000000d2/photos/18.jpg'
where bucket_id = 'backups' and name = '00000000-0000-0000-0000-0000000000d2/photos/2.jpg';

rollback;
