-- Applied to project qvqwvuuwfueccrmzwyct on 2026-10-20 as migration "ai_usage".
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

create policy "Users read their own AI usage"
  on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

-- Security definer, because a write policy would let a user PATCH their own count back to 0.
create function public.ai_usage_take()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  used integer;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in to use AI features' using errcode = '28000';
  end if;
  insert into public.ai_usage as u (user_id, day, count)
  values (uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = u.count + 1
  returning u.count into used;
  return used;
end;
$$;

revoke execute on function public.ai_usage_take() from public, anon;
grant execute on function public.ai_usage_take() to authenticated;
