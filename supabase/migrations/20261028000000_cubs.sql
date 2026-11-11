-- Cub numbers: every account gets a number in sign-up order. The owner's account is 0.
-- A deleted account takes its row with it, and its number is never given out again.

create sequence public.cub_numbers start 1;

create table public.cubs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  number bigint not null unique,
  created_at timestamptz not null default now()
);

alter table public.cubs enable row level security;

-- Supabase's default privileges grant every new table and sequence in public to anon and authenticated.
-- nextval from a client would burn numbers, so the sequence is closed too.
revoke all on public.cubs from anon, authenticated;
revoke all on sequence public.cub_numbers from anon, authenticated;
grant select on public.cubs to authenticated;

create policy "cubs: own row and accepted friends read" on public.cubs
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester = (select auth.uid()) and f.addressee = cubs.user_id)
          or (f.addressee = (select auth.uid()) and f.requester = cubs.user_id)
        )
    )
  );

create function public.assign_cub()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.cubs (user_id, number) values (new.id, nextval('public.cub_numbers'));
  return new;
end;
$$;

revoke all on function public.assign_cub() from public, anon, authenticated;

-- The trigger comes before the backfill. Creating it locks auth.users until this migration commits,
-- so a sign-up during the backfill waits and then gets the next number from the trigger.
create trigger assign_cub
  after insert on auth.users
  for each row execute function public.assign_cub();

-- An empty database, as after a local `supabase db reset`, has no owner to number yet.
do $$
declare
  owner_id uuid;
  r record;
begin
  select id into owner_id from auth.users where email = 'pbebear@icloud.com';
  if owner_id is null and exists (select 1 from auth.users) then
    raise exception 'Cub 0 needs the account pbebear@icloud.com, and auth.users has no row with that email';
  end if;
  if owner_id is not null then
    insert into public.cubs (user_id, number) values (owner_id, 0);
  end if;
  for r in
    select u.id from auth.users u
    where u.id is distinct from owner_id
    order by u.created_at, u.id
  loop
    insert into public.cubs (user_id, number) values (r.id, nextval('public.cub_numbers'));
  end loop;
end;
$$;
