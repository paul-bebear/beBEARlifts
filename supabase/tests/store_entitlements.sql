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

insert into auth.users(id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000a3');

select pg_temp.assert_text($q$select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a1', true, 'bebear_plus_monthly', now() + interval '30 days', false, '2026-10-24 12:00:02+00')::text$q$, 'true');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a1')->>'grant'$q$, 'subscription');
select pg_temp.assert_text($q$select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a1', false, null, null, false, '2026-10-24 12:00:01+00')::text$q$, 'false');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a1')->>'plan'$q$, 'plus');
select pg_temp.assert_text($q$select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a1', true, 'bebear_plus_monthly', now() + interval '30 days', false, '2026-10-24 12:00:02+00')::text$q$, 'false');
select pg_temp.assert_text($q$select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a1', false, null, null, false, '2026-10-24 12:00:03+00')::text$q$, 'true');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a1')->>'plan'$q$, 'free');

insert into public.account_plans(user_id, plan) values ('00000000-0000-0000-0000-0000000000a1', 'plus');
select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a1', true, 'bebear_plus_yearly', now() + interval '1 year', false, '2026-10-24 12:00:04+00');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a1')->>'grant'$q$, 'code');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a1')->>'canManageSubscription'$q$, 'true');
select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a1', false, null, null, false, '2026-10-24 12:00:05+00');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a1')->>'grant'$q$, 'code');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a1')->>'canManageSubscription'$q$, 'false');

select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a2', true, 'bebear_plus_lifetime', null, false, '2026-10-24 12:00:00+00');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a2')->>'grant'$q$, 'lifetime');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a2')->>'canManageSubscription'$q$, 'false');
select pg_temp.assert_text($q$select (public.account_plan_effective('00000000-0000-0000-0000-0000000000ff')->'grant')::text$q$, 'null');
select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a2', true, 'bebear_plus_monthly', now() - interval '1 minute', false, '2026-10-24 12:00:01+00');
select pg_temp.assert_text($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a2')->>'plan'$q$, 'free');

select pg_temp.assert_text($q$select public.store_entitlement_put('00000000-0000-0000-0000-0000000000ff', true, 'bebear_plus_lifetime', null, false, now())::text$q$, 'false');

select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a3', true, 'bebear_plus_monthly', now() + interval '30 days', false, now());
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select pg_temp.assert_text($q$select public.ai_usage_take('capped', null, '{"day": 0, "week": 0, "plusDay": 30, "plusWeek": 150}')->>'plan'$q$, 'plus');
select pg_temp.assert_text($q$select count(*)::text from public.ai_usage_kinds where user_id = '00000000-0000-0000-0000-0000000000a3'$q$, '1');
select pg_temp.assert_text('select count(*)::text from public.store_entitlements', '1');
select pg_temp.assert_rejected($q$select public.store_entitlement_put('00000000-0000-0000-0000-0000000000a3', true, null, null, false, now())$q$);
select pg_temp.assert_rejected($q$select public.account_plan_effective('00000000-0000-0000-0000-0000000000a3')$q$);
select pg_temp.assert_rejected($q$update public.store_entitlements set active = true$q$);

set local role anon;
select pg_temp.assert_rejected('select * from public.store_entitlements');
reset role;
rollback;
