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
  ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000b3'),
  ('00000000-0000-0000-0000-0000000000b4');

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

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';

-- The zero-argument version is gone.
select pg_temp.assert_text($q$select to_regprocedure('public.ai_usage_take()')::text$q$, null);
select pg_temp.assert_rejected_with($q$select public.ai_usage_take()$q$, 'function public.ai_usage_take() does not exist%');

-- 10 reports with new workout ids are counted. The 11th is refused. A repeat of an old id still answers refUsed.
select pg_temp.assert_text($q$select count(*) filter (where r->>'refUsed' = 'false')::text from (select public.ai_usage_take('report', 'w' || g) as r from generate_series(1, 10) g offset 0) s$q$, '10');
select pg_temp.assert_text($q$select count::text from public.ai_usage_kinds where user_id = '00000000-0000-0000-0000-0000000000b1' and kind = 'report'$q$, '10');
select pg_temp.assert_rejected_with($q$select public.ai_usage_take('report', 'w11')$q$, 'Daily AI report limit reached');
select pg_temp.assert_text($q$select public.ai_usage_take('report', 'w1')->>'refUsed'$q$, 'true');
select pg_temp.assert_text($q$select count::text from public.ai_usage_kinds where user_id = '00000000-0000-0000-0000-0000000000b1' and kind = 'report'$q$, '10');

-- Reports do not block capped calls.
select pg_temp.assert_text($q$select public.ai_usage_take('capped', null, '{"day": 3, "week": 10}')->>'day'$q$, '0');

-- A user alone in the day's total is refused at 50 calls (10 reports and 40 capped), even with caps they raised themselves.
reset role;
update public.ai_usage_kinds set count = 39 where user_id = '00000000-0000-0000-0000-0000000000b1' and kind = 'capped';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.assert_text($q$select public.ai_usage_take('capped', null, '{"day": 9999, "week": 9999}')->>'day'$q$, '39');
select pg_temp.assert_rejected_with($q$select public.ai_usage_take('capped', null, '{"day": 9999, "week": 9999}')$q$, 'Daily AI share reached');

-- Another user is not affected.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.assert_text($q$select public.ai_usage_take('capped', null, '{"day": 3, "week": 10}')->>'day'$q$, '0');

-- A user may hold 55 calls while the day's total is 550 or more.
reset role;
insert into public.ai_usage_kinds(user_id, kind, day, count)
values ('00000000-0000-0000-0000-0000000000b3', 'capped', (now() at time zone 'utc')::date, 500);
update public.ai_usage_kinds set count = 45 where user_id = '00000000-0000-0000-0000-0000000000b1' and kind = 'capped';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.assert_text($q$select public.ai_usage_take('capped', null, '{"day": 9999, "week": 9999}')->>'day'$q$, '45');

-- Past a tenth of the total they are refused, below the app-wide ceiling.
reset role;
update public.ai_usage_kinds set count = 400 where user_id = '00000000-0000-0000-0000-0000000000b3' and kind = 'capped';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.assert_rejected_with($q$select public.ai_usage_take('capped', null, '{"day": 9999, "week": 9999}')$q$, 'Daily AI share reached');

-- The app-wide ceiling stops free users.
reset role;
update public.ai_usage_kinds set count = 600 where user_id = '00000000-0000-0000-0000-0000000000b3' and kind = 'capped';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.assert_rejected_with($q$select public.ai_usage_take('capped', null, '{"day": 3, "week": 10}')$q$, 'Daily AI allowance reached');

-- A beBEAR+ user skips the ceiling and still answers with their plan.
reset role;
select public.store_entitlement_put('00000000-0000-0000-0000-0000000000b4', true, 'bebear_plus_monthly', now() + interval '30 days', false, now());
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b4';
select pg_temp.assert_text($q$select public.ai_usage_take('capped', null, '{"plusDay": 30, "plusWeek": 150}')->>'plan'$q$, 'plus');

-- The ceiling is the one row in ai_settings, and the answer reports it.
reset role;
update public.ai_settings set daily_ceiling = 5000;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.assert_text($q$select public.ai_usage_take('capped', null, '{"day": 3, "week": 10}')->>'ceiling'$q$, '5000');
select pg_temp.assert_rejected($q$select * from public.ai_settings$q$);
select pg_temp.assert_rejected($q$update public.ai_settings set daily_ceiling = 1000000$q$);

-- ceilingWarn is true for exactly one call, the one that takes the day's total to 80 percent of the ceiling.
reset role;
update public.ai_settings set daily_ceiling = (((
  (select coalesce(sum(count), 0) from public.ai_usage where day = (now() at time zone 'utc')::date)
  + (select coalesce(sum(count), 0) from public.ai_usage_kinds where day = (now() at time zone 'utc')::date)
  + 5) * 10 + 7) / 8)::integer;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b4';
select pg_temp.assert_text($q$select count(*) filter (where r->>'ceilingWarn' = 'true')::text from (select public.ai_usage_take('report', 'warn' || g) as r from generate_series(1, 10) g offset 0) s$q$, '1');

reset role;
rollback;
