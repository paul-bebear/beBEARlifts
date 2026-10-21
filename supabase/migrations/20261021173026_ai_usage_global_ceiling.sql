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
  if (select coalesce(sum(u.count), 0) from public.ai_usage u where u.day = today) >= 600 then
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
