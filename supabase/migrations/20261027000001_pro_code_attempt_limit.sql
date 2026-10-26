create table public.pro_code_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.pro_code_attempts enable row level security;
revoke all on public.pro_code_attempts from public, anon, authenticated;

-- A wrong code used to raise, and a raise rolls back the attempt counter with it.
-- A wrong code now returns the same error body PostgREST builds from a raise, with status 400 set through response.status.
-- The app reads the status and the message as before, and the counter commits.
drop function public.redeem_pro_code(text);

create function public.redeem_pro_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  failed integer;
  redeemed text;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in to redeem a code' using errcode = '28000';
  end if;
  select a.count into failed from public.pro_code_attempts a where a.user_id = uid and a.day = today;
  if coalesce(failed, 0) >= 10 then
    raise exception 'Too many wrong codes today. Try again tomorrow.' using errcode = 'PT429';
  end if;
  update public.pro_codes c
  set redeemed_by = uid, redeemed_at = now()
  where lower(c.code) = lower(btrim(coalesce(p_code, ''))) and c.redeemed_at is null
  returning c.code into redeemed;
  if redeemed is null then
    insert into public.pro_code_attempts as a (user_id, day, count)
    values (uid, today, 1)
    on conflict (user_id, day) do update set count = a.count + 1;
    perform set_config('response.status', '400', true);
    return jsonb_build_object(
      'code', 'P0001',
      'message', 'That code is not valid or was already used.',
      'details', null,
      'hint', null
    );
  end if;
  insert into public.account_plans as p (user_id, plan, updated_at)
  values (uid, 'plus', now())
  on conflict (user_id) do update set plan = 'plus', updated_at = now();
  return to_jsonb('plus'::text);
end;
$$;

revoke execute on function public.redeem_pro_code(text) from public, anon;
grant execute on function public.redeem_pro_code(text) to authenticated;
