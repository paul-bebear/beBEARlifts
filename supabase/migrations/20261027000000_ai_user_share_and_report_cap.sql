-- The API stopped calling the zero-argument version when ai_usage_take(text, text, jsonb) shipped.
-- Left granted, any signed-in user could call it 600 times and use up the app-wide ceiling for everyone.
drop function if exists public.ai_usage_take();

create or replace function public.ai_usage_take(p_kind text, p_ref text default null, p_caps jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  user_plan text;
  day_used integer := 0;
  week_used integer := 0;
  week_frees_in integer;
  lifetime_used integer := 0;
  ref_used boolean := false;
  allowed boolean := false;
  report_ref text := nullif(btrim(coalesce(p_ref, '')), '');
  total_today integer;
  user_today integer;
  report_today integer;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in to use AI features' using errcode = '28000';
  end if;
  if p_kind is null or p_kind not in ('capped', 'onboard', 'report') then
    raise exception 'Unknown AI kind' using errcode = '22023';
  end if;
  if p_kind = 'report' and report_ref is null then
    raise exception 'A report needs a workout id' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('public.ai_usage_take'), 0);
  total_today := (select coalesce(sum(u.count), 0) from public.ai_usage u where u.day = today)
    + (select coalesce(sum(k.count), 0) from public.ai_usage_kinds k where k.day = today);
  if total_today >= 600 then
    raise exception 'Daily AI allowance reached' using errcode = 'PT429';
  end if;
  -- p_caps comes from the caller, so a user who posts to the RPC directly can raise their own caps.
  -- The share rule bounds them. 50 is above the most a beBEAR+ user reaches in a day (30 capped, 10 reports, 3 setups).
  select coalesce(sum(k.count), 0) into user_today
  from public.ai_usage_kinds k
  where k.user_id = uid and k.day = today;
  if user_today >= 50 and user_today * 10 > total_today then
    raise exception 'Daily AI share reached' using errcode = 'PT429';
  end if;
  user_plan := public.account_plan_effective(uid) ->> 'plan';
  if p_kind = 'capped' then
    select
      coalesce(sum(k.count) filter (where k.day = today), 0),
      coalesce(sum(k.count), 0),
      (min(k.day) filter (where k.count > 0)) + 7 - today
    into day_used, week_used, week_frees_in
    from public.ai_usage_kinds k
    where k.user_id = uid and k.kind = 'capped' and k.day > today - 7;
    allowed := day_used < coalesce((p_caps ->> (case when user_plan = 'plus' then 'plusDay' else 'day' end))::integer, 0)
      and week_used < coalesce((p_caps ->> (case when user_plan = 'plus' then 'plusWeek' else 'week' end))::integer, 0);
  elsif p_kind = 'onboard' then
    select coalesce(sum(k.count), 0) into lifetime_used
    from public.ai_usage_kinds k
    where k.user_id = uid and k.kind = 'onboard';
    allowed := lifetime_used < coalesce((p_caps ->> 'lifetime')::integer, 0);
  else
    ref_used := exists (select 1 from public.ai_report_refs r where r.user_id = uid and r.ref = report_ref);
    if not ref_used then
      select coalesce(sum(k.count), 0) into report_today
      from public.ai_usage_kinds k
      where k.user_id = uid and k.kind = 'report' and k.day = today;
      if report_today >= 10 then
        raise exception 'Daily AI report limit reached' using errcode = 'PT429';
      end if;
    end if;
    allowed := not ref_used;
  end if;
  if allowed then
    insert into public.ai_usage_kinds as k (user_id, kind, day, count)
    values (uid, p_kind, today, 1)
    on conflict (user_id, kind, day) do update set count = k.count + 1;
    if p_kind = 'report' then
      insert into public.ai_report_refs (user_id, ref) values (uid, report_ref);
    end if;
  end if;
  return jsonb_build_object(
    'plan', user_plan,
    'day', day_used,
    'week', week_used,
    'weekFreesIn', week_frees_in,
    'lifetime', lifetime_used,
    'refUsed', ref_used
  );
end;
$$;

revoke execute on function public.ai_usage_take(text, text, jsonb) from public, anon;
grant execute on function public.ai_usage_take(text, text, jsonb) to authenticated;

-- Sandbox grants now end 7 days after their snapshot (api/_billing.mjs). This gives the lifetime ones already stored the same end.
-- The next app start or webhook renews the row while the purchase still counts.
update public.store_entitlements
set expires_at = snapshot_at + interval '7 days'
where sandbox and expires_at is null;
