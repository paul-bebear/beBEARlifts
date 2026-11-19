begin;

create function pg_temp.assert_count(query text, expected bigint)
returns void language plpgsql as $$
declare actual bigint;
begin
  execute query into actual;
  if actual <> expected then
    raise exception 'Expected %, got % for %', expected, actual, query;
  end if;
end;
$$;

create function pg_temp.assert_rejected(query text)
returns void language plpgsql as $$
begin
  begin
    execute query;
  exception when others then
    return;
  end;
  raise exception 'Query unexpectedly succeeded: %', query;
end;
$$;

-- e1 posts a meal. e2 is an accepted friend, e3 a stranger, e4 has only a pending request to e1.
insert into auth.users(id) values
  ('00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000e4');
insert into public.profiles(user_id, handle, display_name) values
  ('00000000-0000-0000-0000-0000000000e1', 'meal_author', 'Author'),
  ('00000000-0000-0000-0000-0000000000e2', 'meal_friend', 'Friend'),
  ('00000000-0000-0000-0000-0000000000e3', 'meal_stranger', 'Stranger'),
  ('00000000-0000-0000-0000-0000000000e4', 'meal_pending', 'Pending');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select public.request_friend('meal_author');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e4';
select public.request_friend('meal_author');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select public.request_friend('meal_friend');

-- The author posts with a photo at the one path the row allows.
insert into storage.objects(bucket_id, name) values
  ('meal-photos', '00000000-0000-0000-0000-0000000000e1/aaaaaaaa-0000-4000-8000-0000000000e1.jpg');
insert into public.meal_posts(id, description, macros, photo_path) values (
  'aaaaaaaa-0000-4000-8000-0000000000e1', 'Rice and chicken', '{"kcal": 600}',
  '00000000-0000-0000-0000-0000000000e1/aaaaaaaa-0000-4000-8000-0000000000e1.jpg'
);
select pg_temp.assert_count('select count(*) from public.meal_posts', 1);
select pg_temp.assert_rejected($q$insert into public.meal_posts(id, description, macros, photo_path) values ('aaaaaaaa-0000-4000-8000-0000000000e2', 'Eggs', '{}', '00000000-0000-0000-0000-0000000000e2/aaaaaaaa-0000-4000-8000-0000000000e2.jpg')$q$);
select pg_temp.assert_rejected($q$insert into public.meal_posts(user_id, description, macros) values ('00000000-0000-0000-0000-0000000000e2', 'Eggs', '{}')$q$);
select pg_temp.assert_rejected($q$insert into public.meal_posts(description, macros) values (repeat('x', 201), '{}')$q$);
select pg_temp.assert_rejected($q$insert into public.meal_posts(description, macros) values ('Eggs', '[]')$q$);
select pg_temp.assert_rejected($q$insert into public.meal_posts(description, macros, posted_at) values ('Eggs', '{}', now() - interval '1 day')$q$);
select pg_temp.assert_rejected($q$update public.meal_posts set description = 'Edited'$q$);
select pg_temp.assert_rejected($q$insert into storage.objects(bucket_id, name) values ('meal-photos', '00000000-0000-0000-0000-0000000000e2/aaaaaaaa-0000-4000-8000-0000000000e3.jpg')$q$);
select pg_temp.assert_rejected($q$insert into storage.objects(bucket_id, name) values ('meal-photos', '00000000-0000-0000-0000-0000000000e1/photo.jpg')$q$);
select pg_temp.assert_rejected($q$insert into storage.objects(bucket_id, name) values ('meal-photos', '00000000-0000-0000-0000-0000000000e1/aaaaaaaa-0000-4000-8000-0000000000e3.png')$q$);
select pg_temp.assert_rejected($q$insert into public.post_reports(meal_post_id, reason) values ('aaaaaaaa-0000-4000-8000-0000000000e1', 'spam')$q$);

-- The accepted friend reads the post and its photo, reports it once, and cannot delete either.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select pg_temp.assert_count('select count(*) from public.meal_posts', 1);
select pg_temp.assert_count($q$select count(*) from storage.objects where bucket_id = 'meal-photos'$q$, 1);
insert into public.post_reports(meal_post_id, reason) values ('aaaaaaaa-0000-4000-8000-0000000000e1', 'spam');
select pg_temp.assert_rejected($q$insert into public.post_reports(meal_post_id, reason) values ('aaaaaaaa-0000-4000-8000-0000000000e1', 'abuse')$q$);
select pg_temp.assert_rejected($q$insert into public.post_reports(post_id, meal_post_id, reason) values (1, 'aaaaaaaa-0000-4000-8000-0000000000e1', 'spam')$q$);
select pg_temp.assert_rejected('select * from public.post_reports');
delete from public.meal_posts;
select pg_temp.assert_count('select count(*) from public.meal_posts', 1);

-- A stranger and a pending requester see nothing and cannot report. The stranger cannot read the author's profile.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
select pg_temp.assert_count('select count(*) from public.meal_posts', 0);
select pg_temp.assert_count($q$select count(*) from storage.objects where bucket_id = 'meal-photos'$q$, 0);
select pg_temp.assert_count($q$select count(*) from public.profiles where handle = 'meal_author'$q$, 0);
select pg_temp.assert_rejected($q$insert into public.post_reports(meal_post_id, reason) values ('aaaaaaaa-0000-4000-8000-0000000000e1', 'spam')$q$);
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e4';
select pg_temp.assert_count('select count(*) from public.meal_posts', 0);
select pg_temp.assert_count($q$select count(*) from storage.objects where bucket_id = 'meal-photos'$q$, 0);

-- After the author deletes the post, the friend no longer reads the photo that is still stored.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
delete from public.meal_posts;
select pg_temp.assert_count('select count(*) from public.meal_posts', 0);
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select pg_temp.assert_count($q$select count(*) from storage.objects where bucket_id = 'meal-photos'$q$, 0);

set local role anon;
select pg_temp.assert_rejected('select * from public.meal_posts');
reset role;
select pg_temp.assert_count($q$select count(*) from storage.objects where name like '00000000-0000-0000-0000-0000000000e1/%'$q$, 1);
select pg_temp.assert_count('select count(*) from public.post_reports where meal_post_id is not null', 0);
rollback;
