-- Meal feed: one row per meal the user chose to share, and its photo in the private meal-photos bucket.
-- The author and accepted friends read both. Only the author writes or deletes them. Posts are never edited.
-- A block deletes the friendship (private.remove_blocked_friendship) and private.reject_blocked_friendship
-- stops a new one, so the friends-read rules below show a blocked user nothing.

create table public.meal_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (user_id) on delete cascade,
  posted_at timestamptz not null default now(),
  description text not null check (char_length(description) between 1 and 200),
  macros jsonb not null check (jsonb_typeof(macros) = 'object' and pg_column_size(macros) < 1024),
  -- The photo path is fixed by the row, so a post can never point at another user's photo.
  photo_path text check (photo_path = user_id::text || '/' || id::text || '.jpg')
);

create index meal_posts_user_posted on public.meal_posts (user_id, posted_at desc);
create index meal_posts_photo_path on public.meal_posts (photo_path);

alter table public.meal_posts enable row level security;

revoke all on public.meal_posts from anon, authenticated;
grant select, delete on public.meal_posts to authenticated;
grant insert (id, user_id, description, macros, photo_path) on public.meal_posts to authenticated;

create policy "meal_posts: author and accepted friends read" on public.meal_posts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester = (select auth.uid()) and f.addressee = meal_posts.user_id)
          or (f.addressee = (select auth.uid()) and f.requester = meal_posts.user_id)
        )
    )
  );

create policy "meal_posts: author inserts" on public.meal_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "meal_posts: author deletes" on public.meal_posts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Reports name exactly one post, a workout or a meal. A report can only name a post the reporter can read.
alter table public.post_reports alter column post_id drop not null;
alter table public.post_reports add column meal_post_id uuid references public.meal_posts (id) on delete cascade;
alter table public.post_reports add constraint post_reports_one_post check (num_nonnulls(post_id, meal_post_id) = 1);
create index post_reports_meal_post on public.post_reports (meal_post_id);
create unique index post_reports_reporter_meal_post on public.post_reports (reporter_id, meal_post_id);
grant insert (meal_post_id) on public.post_reports to authenticated;

drop policy "reports: insert own for visible posts" on public.post_reports;
create policy "reports: insert own for visible posts" on public.post_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (
      (post_id is not null and exists (
        select 1 from public.workout_posts p where p.id = post_id and p.user_id <> (select auth.uid())
      ))
      or (meal_post_id is not null and exists (
        select 1 from public.meal_posts m where m.id = meal_post_id and m.user_id <> (select auth.uid())
      ))
    )
  );

-- Photos live at <user_id>/<post_id>.jpg. The post id is a random v4 uuid, so a path cannot be guessed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "meal-photos: owner adds to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meal-photos'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$')
  );

-- The app uploads with x-upsert, so a retry after a dropped answer replaces the same object.
create policy "meal-photos: owner replaces own" on storage.objects
  for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'meal-photos'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$')
  );

create policy "meal-photos: owner deletes own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- A friend reads a photo only through a meal_posts row they can read, so the meal_posts policy above
-- decides who sees it, and a deleted post hides its photo.
create policy "meal-photos: owner and readers of the post read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'meal-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.meal_posts m where m.photo_path = objects.name)
    )
  );
