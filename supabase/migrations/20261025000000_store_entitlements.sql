create table public.store_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active boolean not null,
  product_id text,
  expires_at timestamptz,
  sandbox boolean not null default false,
  snapshot_at timestamptz not null
);

alter table public.store_entitlements enable row level security;

revoke all on public.store_entitlements from anon, authenticated;
grant select on public.store_entitlements to authenticated;

create policy "Users read their own store entitlement"
  on public.store_entitlements for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.store_entitlement_put(
  p_user uuid,
  p_active boolean,
  p_product text,
  p_expires timestamptz,
  p_sandbox boolean,
  p_snapshot timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  written boolean;
begin
  insert into public.store_entitlements as s (user_id, active, product_id, expires_at, sandbox, snapshot_at)
  values (p_user, p_active, p_product, p_expires, p_sandbox, p_snapshot)
  on conflict (user_id) do update
  set active = excluded.active,
      product_id = excluded.product_id,
      expires_at = excluded.expires_at,
      sandbox = excluded.sandbox,
      snapshot_at = excluded.snapshot_at
  -- The webhook and the app's sync can read RevenueCat at almost the same time. The newer read is kept whatever order they commit in.
  where s.snapshot_at < excluded.snapshot_at
  returning true into written;
  return coalesce(written, false);
exception
  when foreign_key_violation then
    return false;
end;
$$;

revoke execute on function public.store_entitlement_put(uuid, boolean, text, timestamptz, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.store_entitlement_put(uuid, boolean, text, timestamptz, boolean, timestamptz)
  to service_role;

create function public.account_plan_effective(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with facts as (
    select
      exists (select 1 from public.account_plans p where p.user_id = p_user and p.plan = 'plus') as code,
      exists (
        select 1 from public.store_entitlements s where s.user_id = p_user and s.active and s.expires_at is null
      ) as lifetime,
      exists (
        select 1 from public.store_entitlements s where s.user_id = p_user and s.active and s.expires_at > now()
      ) as subscription
  )
  select jsonb_build_object(
    'plan', case when code or lifetime or subscription then 'plus' else 'free' end,
    'grant', case when code then 'code' when lifetime then 'lifetime' when subscription then 'subscription' end,
    'canManageSubscription', subscription
  )
  from facts;
$$;

revoke execute on function public.account_plan_effective(uuid) from public, anon, authenticated;
grant execute on function public.account_plan_effective(uuid) to service_role;

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
  if (select coalesce(sum(u.count), 0) from public.ai_usage u where u.day = today)
    + (select coalesce(sum(k.count), 0) from public.ai_usage_kinds k where k.day = today) >= 600 then
    raise exception 'Daily AI allowance reached' using errcode = 'PT429';
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
