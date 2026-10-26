-- find_profile counts in profile_lookup_usage.count. Friend requests get their own column, so 60 lookups do not use up the 20 requests.
alter table public.profile_lookup_usage add column requests integer not null default 0;

-- Same body as 20261021173032_profile_lookup_limit.sql, plus the daily count before the insert of a new request.
-- Only a request that creates a friendship row counts, because a failed call raises and a raise rolls the counter back.
-- Guessing handles is already bounded by find_profile.
create or replace function public.request_friend(p_handle text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
  existing public.friendships%rowtype;
  used integer;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from public.profiles where user_id = me) then
    raise exception 'Could not send friend request';
  end if;
  select user_id into them from public.profiles where handle = lower(trim(p_handle));
  if them is null or them = me then
    raise exception 'Could not send friend request';
  end if;
  select * into existing from public.friendships
  where (requester = me and addressee = them) or (requester = them and addressee = me);
  if found then
    if existing.status = 'pending' and existing.addressee = me then
      update public.friendships set status = 'accepted' where requester = them and addressee = me;
      return 'accepted';
    end if;
    return existing.status;
  end if;
  insert into public.profile_lookup_usage as u (user_id, day, requests)
  values (me, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set requests = u.requests + 1
    where u.requests < 20
  returning u.requests into used;
  if used is null then
    raise exception 'Daily friend request allowance reached' using errcode = 'PT429';
  end if;
  insert into public.friendships (requester, addressee) values (me, them);
  return 'pending';
exception
  when raise_exception then
    raise exception 'Could not send friend request';
end;
$$;

revoke execute on function public.request_friend(text) from public, anon;
grant execute on function public.request_friend(text) to authenticated;
