create table public.post_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id bigint not null references public.workout_posts(id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'other')),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create index post_reports_post on public.post_reports(post_id);
create index post_reports_reporter on public.post_reports(reporter_id);

create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index user_blocks_blocked on public.user_blocks(blocked_id);
alter table public.post_reports enable row level security;
alter table public.user_blocks enable row level security;
revoke all on public.post_reports, public.user_blocks from public, anon, authenticated;
grant insert (reporter_id, post_id, reason, note) on public.post_reports to authenticated;
grant select, delete on public.user_blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.user_blocks to authenticated;

create policy "reports: insert own for visible posts" on public.post_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.workout_posts p where p.id = post_id and p.user_id <> (select auth.uid()))
  );

create policy "blocks: read own" on public.user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "blocks: insert own" on public.user_blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "blocks: delete own" on public.user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

create policy "profiles: read users I blocked" on public.profiles
  for select to authenticated using (
    exists (select 1 from public.user_blocks b where b.blocker_id = (select auth.uid()) and b.blocked_id = user_id)
  );

create schema if not exists private;

create function private.remove_blocked_friendship()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.friendships
  where (requester = new.blocker_id and addressee = new.blocked_id)
     or (requester = new.blocked_id and addressee = new.blocker_id);
  return new;
end;
$$;

create trigger remove_blocked_friendship after insert on public.user_blocks
  for each row execute function private.remove_blocked_friendship();

-- request_friend uses SECURITY DEFINER, so its friendship writes need this block check too.
create function private.reject_blocked_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() not in (new.requester, new.addressee) then
    raise exception 'Not signed in as a participant';
  end if;
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = new.requester and blocked_id = new.addressee)
       or (blocker_id = new.addressee and blocked_id = new.requester)
  ) then
    raise exception 'Cannot add this friend while a block is active';
  end if;
  return new;
end;
$$;

create trigger reject_blocked_friendship before insert or update on public.friendships
  for each row execute function private.reject_blocked_friendship();
revoke all on function private.remove_blocked_friendship() from public, anon, authenticated;
revoke all on function private.reject_blocked_friendship() from public, anon, authenticated;
