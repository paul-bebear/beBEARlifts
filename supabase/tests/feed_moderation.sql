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

insert into auth.users(id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');
insert into public.profiles(user_id, handle, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'test_blocker', 'Blocker'),
  ('00000000-0000-0000-0000-000000000002', 'test_blocked', 'Blocked'),
  ('00000000-0000-0000-0000-000000000003', 'test_stranger', 'Stranger');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select public.request_friend('test_blocker');
insert into public.workout_posts(workout_id, summary) values (123, '{}');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.request_friend('test_blocked');
select pg_temp.assert_count('select count(*) from public.workout_posts', 1);

insert into public.post_reports(post_id, reason) select id, 'spam' from public.workout_posts;
select pg_temp.assert_rejected('select * from public.post_reports');
select pg_temp.assert_rejected($q$insert into public.post_reports(post_id, reporter_id, reason) select id, '00000000-0000-0000-0000-000000000002', 'spam' from public.workout_posts$q$);
select pg_temp.assert_rejected($q$insert into public.post_reports(post_id, reason) select id, 'bad' from public.workout_posts$q$);
select pg_temp.assert_rejected($q$insert into public.post_reports(post_id, reason, note) select id, 'spam', repeat('x', 2001) from public.workout_posts$q$);

insert into public.user_blocks(blocked_id) values ('00000000-0000-0000-0000-000000000002');
select pg_temp.assert_count('select count(*) from public.user_blocks', 1);
select pg_temp.assert_count('select count(*) from public.friendships', 0);
select pg_temp.assert_count('select count(*) from public.workout_posts', 0);
select pg_temp.assert_count($q$select count(*) from public.profiles where handle = 'test_blocked'$q$, 1);
select pg_temp.assert_rejected($q$insert into public.user_blocks(blocked_id) values ('00000000-0000-0000-0000-000000000001')$q$);
select pg_temp.assert_rejected($q$insert into public.user_blocks(blocker_id, blocked_id) values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002')$q$);
select pg_temp.assert_rejected($q$select public.request_friend('test_blocked')$q$);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select pg_temp.assert_count('select count(*) from public.user_blocks', 0);
select pg_temp.assert_rejected($q$select public.request_friend('test_blocker')$q$);
delete from public.user_blocks;
select pg_temp.assert_count('select count(*) from public.workout_posts', 1);
select pg_temp.assert_rejected($q$insert into public.post_reports(post_id, reason) select id, 'spam' from public.workout_posts$q$);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select pg_temp.assert_count('select count(*) from public.user_blocks', 0);
select pg_temp.assert_count('select count(*) from public.workout_posts', 0);
select pg_temp.assert_rejected('select * from public.post_reports');
select pg_temp.assert_rejected($q$insert into public.post_reports(post_id, reason) values (1, 'spam')$q$);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select pg_temp.assert_count('select count(*) from public.user_blocks', 1);
delete from public.user_blocks where blocked_id = '00000000-0000-0000-0000-000000000002';
select pg_temp.assert_count('select count(*) from public.user_blocks', 0);
select pg_temp.assert_count('select count(*) from public.friendships', 0);
select public.request_friend('test_blocked');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select public.request_friend('test_blocker');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select pg_temp.assert_count('select count(*) from public.workout_posts', 1);

set local role anon;
select pg_temp.assert_rejected('select * from public.user_blocks');
select pg_temp.assert_rejected('select * from public.post_reports');
reset role;
select pg_temp.assert_count('select count(*) from public.post_reports', 1);
rollback;
