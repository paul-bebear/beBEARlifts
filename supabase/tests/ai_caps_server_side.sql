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

insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000c1');

create function pg_temp.used(p_kind text)
returns text language sql as $$
  select coalesce(sum(count), 0)::text from public.ai_usage_kinds
  where user_id = '00000000-0000-0000-0000-0000000000c1' and kind = p_kind
$$;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';

-- Caps the caller sends are ignored. The 4th capped call of the day is not counted.
select public.ai_usage_take('capped', null, '{"day": 9999, "week": 9999}') from generate_series(1, 4);
select pg_temp.assert_text($q$select pg_temp.used('capped')$q$, '3');
select pg_temp.assert_text($q$select public.ai_usage_take('capped', null, '{"day": 9999}')->>'day'$q$, '3');

-- The same holds for the 3 lifetime setups.
select public.ai_usage_take('onboard', null, '{"lifetime": 9999}') from generate_series(1, 4);
select pg_temp.assert_text($q$select pg_temp.used('onboard')$q$, '3');

-- The answer names the user and the caps it used.
select pg_temp.assert_text($q$select public.ai_usage_take('capped')->>'userId'$q$, '00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert_text($q$select public.ai_usage_take('capped')->'caps'->>'lifetime'$q$, '3');

-- A user cannot refund their own calls or reach the counting body with their own caps.
select pg_temp.assert_rejected($q$select public.ai_usage_refund('00000000-0000-0000-0000-0000000000c1', 'onboard')$q$);
select pg_temp.assert_rejected($q$select public.ai_usage_take_counted('capped', null, '{"day": 9999, "week": 9999}')$q$);

-- The service key gives one setup back per refund.
reset role;
set local role service_role;
select pg_temp.assert_text($q$select public.ai_usage_refund('00000000-0000-0000-0000-0000000000c1', 'onboard')::text$q$, 'true');
select pg_temp.assert_text($q$select pg_temp.used('onboard')$q$, '2');

-- A refunded report frees its workout id, so the report can be asked for again.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select public.ai_usage_take('report', 'r1');
reset role;
set local role service_role;
select pg_temp.assert_text($q$select public.ai_usage_refund('00000000-0000-0000-0000-0000000000c1', 'report', 'r1')::text$q$, 'true');
select pg_temp.assert_text($q$select pg_temp.used('report')$q$, '0');
select pg_temp.assert_text($q$select public.ai_usage_refund('00000000-0000-0000-0000-0000000000c1', 'report', 'r1')::text$q$, 'false');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.assert_text($q$select public.ai_usage_take('report', 'r1')->>'refUsed'$q$, 'false');

-- Raising a cap in ai_settings lets the next call through and the answer reports it.
reset role;
update public.ai_settings set free_day_cap = 5;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.assert_text($q$select public.ai_usage_take('capped')->'caps'->>'day'$q$, '5');
select pg_temp.assert_text($q$select pg_temp.used('capped')$q$, '4');

reset role;
rollback;
