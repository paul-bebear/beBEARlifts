create table public.account_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  updated_at timestamptz not null default now()
);

alter table public.account_plans enable row level security;

revoke all on public.account_plans from anon, authenticated;
grant select on public.account_plans to authenticated;

create policy "Users read their own plan"
  on public.account_plans for select to authenticated
  using ((select auth.uid()) = user_id);

-- The owner inserts codes from the dashboard. RLS with no policy keeps every user out.
-- redeemed_at marks a code used. redeemed_by goes null when that account is deleted, and the code stays used.
create table public.pro_codes (
  code text primary key,
  created_at timestamptz not null default now(),
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz
);

alter table public.pro_codes enable row level security;

revoke all on public.pro_codes from anon, authenticated;

create table public.ai_usage_kinds (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('capped', 'onboard', 'report')),
  day date not null,
  count integer not null default 0,
  primary key (user_id, kind, day)
);

alter table public.ai_usage_kinds enable row level security;

revoke all on public.ai_usage_kinds from anon, authenticated;
grant select on public.ai_usage_kinds to authenticated;

create policy "Users read their own AI usage by kind"
  on public.ai_usage_kinds for select to authenticated
  using ((select auth.uid()) = user_id);

create table public.ai_report_refs (
  user_id uuid not null references auth.users (id) on delete cascade,
  ref text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, ref)
);

alter table public.ai_report_refs enable row level security;

revoke all on public.ai_report_refs from anon, authenticated;

-- Security definer, because a select grant on pro_codes would let any user list the unused codes.
create function public.redeem_pro_code(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  redeemed text;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in to redeem a code' using errcode = '28000';
  end if;
  update public.pro_codes c
  set redeemed_by = uid, redeemed_at = now()
  where lower(c.code) = lower(btrim(coalesce(p_code, ''))) and c.redeemed_at is null
  returning c.code into redeemed;
  if redeemed is null then
    raise exception 'That code is not valid or was already used.' using errcode = 'P0001';
  end if;
  insert into public.account_plans as p (user_id, plan, updated_at)
  values (uid, 'plus', now())
  on conflict (user_id) do update set plan = 'plus', updated_at = now();
  return 'plus';
end;
$$;

revoke execute on function public.redeem_pro_code(text) from public, anon;
grant execute on function public.redeem_pro_code(text) to authenticated;

-- p_kind has no default, so PostgREST still sends a body of {} to the zero-argument version the deployed API calls.
-- The function counts the call only when it fits the caps the API sends, so a refused call leaves the counts as they were.
-- The counts it returns are the ones before this call. The API runs the same comparison on them to decide.
create function public.ai_usage_take(p_kind text, p_ref text default null, p_caps jsonb default '{}')
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
  user_plan := coalesce((select p.plan from public.account_plans p where p.user_id = uid), 'free');
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

revoke execute on function public.ai_usage_take(text, text, jsonb) from public, anon;
grant execute on function public.ai_usage_take(text, text, jsonb) to authenticated;

-- The deployed API calls this version until the new API ships. It now adds the new table to the 600-a-day ceiling.
create or replace function public.ai_usage_take()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  used integer;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in to use AI features' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtext('public.ai_usage_take'), 0);
  if (select coalesce(sum(u.count), 0) from public.ai_usage u where u.day = today)
    + (select coalesce(sum(k.count), 0) from public.ai_usage_kinds k where k.day = today) >= 600 then
    raise exception 'Daily AI allowance reached' using errcode = 'PT429';
  end if;
  insert into public.ai_usage as u (user_id, day, count)
  values (uid, today, 1)
  on conflict (user_id, day) do update set count = u.count + 1
  returning u.count into used;
  return used;
end;
$$;

revoke execute on function public.ai_usage_take() from public, anon;
grant execute on function public.ai_usage_take() to authenticated;
