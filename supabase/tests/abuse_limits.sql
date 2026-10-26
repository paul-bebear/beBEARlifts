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
  ('00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000c3');

-- redeem_pro_code: 10 wrong codes a day, then it refuses even a right one.
insert into public.pro_codes(code) values ('GOODCODE'), ('SECONDCODE');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.assert_text($q$select public.redeem_pro_code('nope')->>'message'$q$, 'That code is not valid or was already used.');
select pg_temp.assert_text($q$select current_setting('response.status', true)$q$, '400');
select pg_temp.assert_text($q$select count(*)::text from (select public.redeem_pro_code('nope' || g) from generate_series(1, 9) g offset 0) s$q$, '9');
select pg_temp.assert_rejected_with($q$select public.redeem_pro_code('goodcode')$q$, 'Too many wrong codes today. Try again tomorrow.');
reset role;
select pg_temp.assert_text($q$select count::text from public.pro_code_attempts where user_id = '00000000-0000-0000-0000-0000000000c1'$q$, '10');
select pg_temp.assert_text($q$select count(*)::text from public.pro_codes where redeemed_at is not null$q$, '0');

-- Another user is not affected, a right code answers "plus", and a used code is wrong for the next user.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select pg_temp.assert_text($q$select public.redeem_pro_code(' GoodCode ')::text$q$, '"plus"');
select pg_temp.assert_text($q$select plan from public.account_plans where user_id = '00000000-0000-0000-0000-0000000000c2'$q$, 'plus');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c3';
select pg_temp.assert_text($q$select public.redeem_pro_code('goodcode')->>'code'$q$, 'P0001');
select pg_temp.assert_rejected($q$select * from public.pro_code_attempts$q$);

-- backups bucket: only the names the app writes.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
insert into storage.objects(bucket_id, name) values
  ('backups', '00000000-0000-0000-0000-0000000000c1/latest.json'),
  ('backups', '00000000-0000-0000-0000-0000000000c1/replaced.json'),
  ('backups', '00000000-0000-0000-0000-0000000000c1/day-0.json'),
  ('backups', '00000000-0000-0000-0000-0000000000c1/day-6.json');
select pg_temp.assert_rejected($q$insert into storage.objects(bucket_id, name) values ('backups', '00000000-0000-0000-0000-0000000000c1/x1.json')$q$);
select pg_temp.assert_rejected($q$insert into storage.objects(bucket_id, name) values ('backups', '00000000-0000-0000-0000-0000000000c1/day-7.json')$q$);
select pg_temp.assert_rejected($q$insert into storage.objects(bucket_id, name) values ('backups', '00000000-0000-0000-0000-0000000000c1/latest.json.bak')$q$);
select pg_temp.assert_rejected($q$insert into storage.objects(bucket_id, name) values ('backups', '00000000-0000-0000-0000-0000000000c1/a/latest.json')$q$);
select pg_temp.assert_rejected($q$insert into storage.objects(bucket_id, name) values ('backups', '00000000-0000-0000-0000-0000000000c2/latest.json')$q$);
select pg_temp.assert_rejected($q$update storage.objects set name = '00000000-0000-0000-0000-0000000000c1/x1.json' where bucket_id = 'backups' and name = '00000000-0000-0000-0000-0000000000c1/latest.json'$q$);

-- request_friend: 20 new requests a day. A repeat of a pending request does not count, and lookups keep their own count.
reset role;
insert into auth.users(id)
select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(100, 120) g;
insert into public.profiles(user_id, handle, display_name)
select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'friend_' || g, 'Friend ' || g from generate_series(100, 120) g;
insert into public.profiles(user_id, handle, display_name) values ('00000000-0000-0000-0000-0000000000c1', 'asker_c1', 'Asker');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.assert_text($q$select count(*) filter (where r = 'pending')::text from (select public.request_friend('friend_' || g) as r from generate_series(100, 119) g offset 0) s$q$, '20');
select pg_temp.assert_text($q$select public.request_friend('friend_100')$q$, 'pending');
select pg_temp.assert_rejected_with($q$select public.request_friend('friend_120')$q$, 'Daily friend request allowance reached');
select pg_temp.assert_text($q$select count(*)::text from public.find_profile('friend_120')$q$, '1');
reset role;
select pg_temp.assert_text($q$select requests::text from public.profile_lookup_usage where user_id = '00000000-0000-0000-0000-0000000000c1'$q$, '20');
select pg_temp.assert_text($q$select count(*)::text from public.friendships where requester = '00000000-0000-0000-0000-0000000000c1'$q$, '20');

rollback;
