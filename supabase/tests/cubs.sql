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

create temp table base as
  select case when is_called then last_value else last_value - 1 end as n from public.cub_numbers;
grant select on base to authenticated, anon;

insert into auth.users(id, created_at) values ('00000000-0000-0000-0000-0000000000c1', now());
insert into auth.users(id, created_at) values ('00000000-0000-0000-0000-0000000000c2', now());
insert into auth.users(id, created_at) values ('00000000-0000-0000-0000-0000000000c3', now());

select pg_temp.assert_text($q$select (number - (select n from base))::text from public.cubs where user_id = '00000000-0000-0000-0000-0000000000c1'$q$, '1');
select pg_temp.assert_text($q$select (number - (select n from base))::text from public.cubs where user_id = '00000000-0000-0000-0000-0000000000c2'$q$, '2');
select pg_temp.assert_text($q$select (number - (select n from base))::text from public.cubs where user_id = '00000000-0000-0000-0000-0000000000c3'$q$, '3');

delete from auth.users where id = '00000000-0000-0000-0000-0000000000c2';
select pg_temp.assert_text($q$select count(*)::text from public.cubs where user_id = '00000000-0000-0000-0000-0000000000c2'$q$, '0');
insert into auth.users(id, created_at) values ('00000000-0000-0000-0000-0000000000c4', now());
select pg_temp.assert_text($q$select (number - (select n from base))::text from public.cubs where user_id = '00000000-0000-0000-0000-0000000000c4'$q$, '4');
select pg_temp.assert_text($q$select count(*)::text from public.cubs where number = (select n from base) + 2$q$, '0');

insert into public.profiles(user_id, handle, display_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'cub_one', 'One'),
  ('00000000-0000-0000-0000-0000000000c3', 'cub_three', 'Three'),
  ('00000000-0000-0000-0000-0000000000c4', 'cub_four', 'Four');
insert into public.friendships(requester, addressee, status) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c3', 'accepted'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c1', 'pending');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.assert_text($q$select (number - (select n from base))::text from public.cubs where user_id = '00000000-0000-0000-0000-0000000000c1'$q$, '1');
select pg_temp.assert_text($q$select (number - (select n from base))::text from public.cubs where user_id = '00000000-0000-0000-0000-0000000000c3'$q$, '3');
select pg_temp.assert_text($q$select count(*)::text from public.cubs where user_id = '00000000-0000-0000-0000-0000000000c4'$q$, '0');
select pg_temp.assert_rejected($q$insert into public.cubs(user_id, number) values ('00000000-0000-0000-0000-0000000000c1', 999999)$q$);
select pg_temp.assert_rejected($q$update public.cubs set number = 0$q$);
select pg_temp.assert_rejected($q$delete from public.cubs$q$);
select pg_temp.assert_rejected($q$select nextval('public.cub_numbers')$q$);
select pg_temp.assert_rejected($q$select public.assign_cub()$q$);

set local role anon;
select pg_temp.assert_rejected('select * from public.cubs');
reset role;
rollback;
