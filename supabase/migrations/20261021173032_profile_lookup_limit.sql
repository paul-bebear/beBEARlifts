create table public.profile_lookup_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.profile_lookup_usage enable row level security;
revoke all on public.profile_lookup_usage from public, anon, authenticated;

create or replace function public.find_profile(p_handle text)
returns table (handle text, display_name text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  used integer;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  insert into public.profile_lookup_usage as u (user_id, day, count)
  values (uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = u.count + 1
    where u.count < 60
  returning u.count into used;
  if used is null then
    raise exception 'Daily profile lookup allowance reached' using errcode = 'PT429';
  end if;
  return query
    select p.handle, p.display_name from public.profiles p
    where p.handle = lower(trim(p_handle));
end;
$$;

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
  insert into public.friendships (requester, addressee) values (me, them);
  return 'pending';
exception
  when raise_exception then
    raise exception 'Could not send friend request';
end;
$$;

revoke execute on function public.find_profile(text) from public, anon;
revoke execute on function public.request_friend(text) from public, anon;
grant execute on function public.find_profile(text) to authenticated;
grant execute on function public.request_friend(text) to authenticated;
