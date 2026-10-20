-- Workout feed: one summary per shared workout. The author and accepted friends read it.
-- Only the author writes, changes or deletes it.

create table public.workout_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (user_id) on delete cascade,
  workout_id bigint not null,
  posted_at timestamptz not null default now(),
  summary jsonb not null check (jsonb_typeof(summary) = 'object' and pg_column_size(summary) < 16384),
  unique (user_id, workout_id)
);

create index workout_posts_user_posted on public.workout_posts (user_id, posted_at desc);

alter table public.workout_posts enable row level security;

revoke all on public.workout_posts from anon, authenticated;
grant select, delete on public.workout_posts to authenticated;
grant insert (user_id, workout_id, summary) on public.workout_posts to authenticated;
-- A re-share is an upsert on (user_id, workout_id). PostgREST's ON CONFLICT sets every column in the body, so workout_id needs the grant.
grant update (workout_id, summary) on public.workout_posts to authenticated;

create policy "workout_posts: author and accepted friends read" on public.workout_posts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester = (select auth.uid()) and f.addressee = workout_posts.user_id)
          or (f.addressee = (select auth.uid()) and f.requester = workout_posts.user_id)
        )
    )
  );

create policy "workout_posts: author inserts" on public.workout_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "workout_posts: author updates" on public.workout_posts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workout_posts: author deletes" on public.workout_posts
  for delete to authenticated
  using (user_id = (select auth.uid()));
