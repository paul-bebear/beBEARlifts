-- The caps used to come from the caller's p_caps, so a user who posted to the RPC directly could set their own.
-- They now live in the one ai_settings row. Change them from the Supabase dashboard: update public.ai_settings set free_day_cap = 5;
alter table public.ai_settings
  add column free_day_cap integer not null default 3 check (free_day_cap > 0),
  add column free_week_cap integer not null default 10 check (free_week_cap > 0),
  add column plus_day_cap integer not null default 30 check (plus_day_cap > 0),
  add column plus_week_cap integer not null default 150 check (plus_week_cap > 0),
  add column onboard_runs integer not null default 3 check (onboard_runs > 0);

-- The counting body stays as it is. Only the wrapper below may call it, and the wrapper fills p_caps from ai_settings.
alter function public.ai_usage_take(text, text, jsonb) rename to ai_usage_take_counted;
revoke execute on function public.ai_usage_take_counted(text, text, jsonb) from public, anon, authenticated;

-- p_caps stays in the signature because the API deployed before this migration still sends it. It is ignored.
create function public.ai_usage_take(p_kind text, p_ref text default null, p_caps jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caps jsonb := (
    select jsonb_build_object('day', s.free_day_cap, 'week', s.free_week_cap,
      'plusDay', s.plus_day_cap, 'plusWeek', s.plus_week_cap, 'lifetime', s.onboard_runs)
    from public.ai_settings s
    where s.id
  );
begin
  return public.ai_usage_take_counted(p_kind, p_ref, coalesce(caps, '{}'))
    || jsonb_build_object('userId', auth.uid(), 'caps', caps);
end;
$$;

revoke execute on function public.ai_usage_take(text, text, jsonb) from public, anon;
grant execute on function public.ai_usage_take(text, text, jsonb) to authenticated;

-- The API calls this with the service key when the AI provider fails after ai_usage_take counted the call.
-- It takes one off the newest count of that kind from today or yesterday (UTC), so a call that crossed midnight is still given back.
create function public.ai_usage_refund(p_user uuid, p_kind text, p_ref text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  refund_day date;
  report_ref text := nullif(btrim(coalesce(p_ref, '')), '');
begin
  if p_user is null or p_kind is null or p_kind not in ('capped', 'onboard', 'report') then
    raise exception 'Unknown AI refund' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('public.ai_usage_take'), 0);
  select max(k.day) into refund_day
  from public.ai_usage_kinds k
  where k.user_id = p_user and k.kind = p_kind and k.count > 0 and k.day >= today - 1;
  if refund_day is null then
    return false;
  end if;
  update public.ai_usage_kinds k
  set count = k.count - 1
  where k.user_id = p_user and k.kind = p_kind and k.day = refund_day;
  if p_kind = 'report' and report_ref is not null then
    delete from public.ai_report_refs r where r.user_id = p_user and r.ref = report_ref;
  end if;
  return true;
end;
$$;

revoke execute on function public.ai_usage_refund(uuid, text, text) from public, anon, authenticated;
grant execute on function public.ai_usage_refund(uuid, text, text) to service_role;
