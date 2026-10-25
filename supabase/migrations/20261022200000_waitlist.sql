-- Fake door test: two landing pages pitch beBEAR two ways and collect emails here.
-- Visitors can only insert. Nobody but the service role reads the list.

create table public.waitlist (
  id bigint generated always as identity primary key,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  variant text not null check (variant in ('a', 'b')),
  source text check (char_length(source) <= 64),
  created_at timestamptz not null default now()
);

-- A repeat signup on the same page returns 23505. The pages treat that as success.
create unique index waitlist_email_variant on public.waitlist (lower(email), variant);

alter table public.waitlist enable row level security;

revoke all on public.waitlist from anon, authenticated;
grant insert (email, variant, source) on public.waitlist to anon, authenticated;

create policy "waitlist: anyone can join" on public.waitlist
  for insert to anon, authenticated
  with check (true);
