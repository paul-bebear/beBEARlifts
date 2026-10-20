-- Friends: a public handle per user and a request/accept link between two users.
-- Strangers never see each other's user id. They find each other only through
-- find_profile and request_friend, which return a handle, a name, or a status.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.friendships (
  requester uuid not null references public.profiles (user_id) on delete cascade,
  addressee uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- One row per pair, whoever asked first.
create unique index friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index friendships_addressee on public.friendships (addressee);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;

-- Column grants: the addressee can change only status, so an accept cannot rewrite who the row links.
revoke all on public.profiles, public.friendships from anon, authenticated;
grant select, delete on public.profiles to authenticated;
grant insert (user_id, handle, display_name) on public.profiles to authenticated;
grant update (handle, display_name) on public.profiles to authenticated;
grant select, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

create policy "profiles: read own and people in a friendship row" on public.profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where (f.requester = (select auth.uid()) and f.addressee = profiles.user_id)
         or (f.addressee = (select auth.uid()) and f.requester = profiles.user_id)
    )
  );

create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "profiles: delete own" on public.profiles
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "friendships: participants read" on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (requester, addressee));

create policy "friendships: addressee accepts" on public.friendships
  for update to authenticated
  using (addressee = (select auth.uid()) and status = 'pending')
  with check (addressee = (select auth.uid()) and status = 'accepted');

create policy "friendships: participants remove" on public.friendships
  for delete to authenticated
  using ((select auth.uid()) in (requester, addressee));

create function public.find_profile(p_handle text)
returns table (handle text, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.handle, p.display_name
  from public.profiles p
  where (select auth.uid()) is not null and p.handle = lower(trim(p_handle))
$$;

-- A request to someone who already asked you accepts their request instead of failing on the pair index.
create function public.request_friend(p_handle text)
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
    raise exception 'Pick a handle first';
  end if;
  select user_id into them from public.profiles where handle = lower(trim(p_handle));
  if them is null then
    raise exception 'No one has that handle';
  end if;
  if them = me then
    raise exception 'That is your own handle';
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
end;
$$;

revoke execute on function public.find_profile(text) from public, anon;
revoke execute on function public.request_friend(text) from public, anon;
grant execute on function public.find_profile(text) to authenticated;
grant execute on function public.request_friend(text) to authenticated;
