# Handoff: friends feed on Supabase

Phase 2 of 9 of the `/feature` loop is done (intake, draft, codex architecture review). The owner approved the plan and every decision below. Next is phase 4, the implementation contract. Nothing is built yet.

## Start here

```bash
git fetch origin
git checkout claude/friends-feed
npm install
```

Then read this whole file. It replaces the phase 3 plan in `lambda/scripts/plans/20261020-friends-feed.md`, which still describes email codes and separate music posts. Write a fresh plan file from this one when you start phase 4.

## Fixed facts

- Supabase project `bebearlifts`, ref `qvqwvuuwfueccrmzwyct`, region `eu-west-1`, org "Indexable" (free plan). URL `https://qvqwvuuwfueccrmzwyct.supabase.co`.
- Publishable key: `sb_publishable_rEbD1nY_vtRMiQrpHSgnCg_xquG6idR`. It is public by design, like the Spotify client ID. Row-level security protects the data.
- The Supabase MCP tools in Claude Code reach this project (`apply_migration`, `execute_sql`, `get_advisors`). Creating a project through MCP does not work here, because the cost-confirmation tool is missing.
- The owner connected the Supabase project to the GitHub repo. That integration applies files in `supabase/migrations/` when they merge to `master`. If you apply a migration with MCP first, name the repo file with the exact version MCP recorded (`list_migrations`), so the integration skips it.
- The app is the offline-only PWA (`LFT_OFFLINE_ONLY=1`, `npm run build:pwa`). Data lives in IndexedDB. Spotify is already allowed through `OfflineOnly_allowedOrigins` in `src/utils/offlineOnly.ts`, `connect-src` in `vercel.json`, and the bypass in `src/webpushr-sw.ts`. Add the Supabase origin the same three ways.
- 5 to 10 alpha users. One phone per account.
- `codex` is at `/opt/homebrew/bin/codex` (0.163.0). `.claude/skills/feature/codex-chat.sh` calls `timeout`, which macOS lacks. Put a shim on the PATH for the run: a script named `timeout` containing `exec perl -e 'alarm shift; exec @ARGV' "$@"`. The default model `gpt-6-astra` worked.
- The codex transcript of round 1 is in `lambda/scripts/plans/20261020-friends-feed.codex.md`. `lambda/scripts` is a git submodule, so files there are local only.

## Decisions

- Sign-in: email and password. Supabase email confirmation is off, so Supabase sends no email. The owner turns it off in the dashboard: Authentication, Sign In / Providers, Email, "Confirm email" off. Codes by email come later with custom SMTP (Resend on `paulbebear.com`). Give the owner the DNS steps when that work starts.
- Sign-up is part of onboarding: email, password, username. Existing users find the same sign-up on the Friends tab.
- Usernames: chosen once at sign-up, unique, `^[a-z0-9_]{3,20}$`, never changed in v1. Every id is a UUID.
- Each post has an audience the author picks: Friends or Public. Public posts show in a general feed to every signed-in user. Friends posts show to accepted friends only. The Friends tab shows two lists: Friends and Public.
- After a workout ends, the finish flow asks "Share this workout?" (yes or no), with an optional comment and the audience choice. After that come "Save PNG" and "Share to Instagram" from the story card (`src/components/workoutStoryCard.tsx`).
- The workout post carries the workout summary, the PRs the finish report already shows (`History_getPersonalRecords(props.history)` in `src/components/screenFinishDay.tsx`), and that workout's music. The music is the kept tracks from the music session with the same id as the workout, plus the playlist link if the user saved one. Saving the playlist later updates the same post with an upsert.
- Meals can be shared from the Food screen as their own posts. `ScreenFood` builds the meal post, because it owns the selected day.
- The server sets the post time. The user never picks it.
- "Delete from feed" removes the server post and keeps the local workout, meal or songs.
- Navigation: a Friends tab takes the Program tab's place in the tab bar, and Program moves into the Progress tab. A separate session does the tab move (see "Parallel work"). This session builds the Friends screens and does not edit navigation files.
- One-way follows (for creators) come later. Keep the schema open for a `follows` table.

## Codex findings, all accepted

- Friendships: clients may update only `status`. `user_a`, `user_b` and `requested_by` never change after insert. `requested_by` must be one of the pair. Only the recipient of a pending row can set `accepted`.
- Posts: clients write only `kind`, `payload`, `client_key`, `visibility` and `comment`. The server sets `author_id`, `id` and `created_at`. Use column grants (`revoke insert, update on posts from authenticated; grant insert (...), update (...)`).
- No `security definer` function. The post read policy uses an `exists` subquery on `friendships`, which the reader can already see.
- RLS on every table, every policy `to authenticated`.
- Payload limits: `jsonb_typeof(payload) = 'object'` and under 16 KB. Comment under 500 characters.
- Feed paging: cursor `(created_at, id)` descending, index on `(created_at desc, id desc)`, plus one on `(author_id, created_at desc)`. The cursor moves past rows `FeedPost_parse` drops.
- `FeedPost_parse` accepts only `spotify:track:` URIs with a 22-character id and images on `https://i.scdn.co/`.
- One root sign-in and share sheet (`socialSheet` modal) owns a pending share. It checks for a session and a profile every time it opens, so "signed in, no username" goes back to the username step. Friends has Sign out.
- The Share button is disabled while a share runs. Re-sharing is an upsert on `(author_id, client_key)`.
- The SDK loads with `import()`. A failed chunk load clears the cached promise and the next tap retries, keeping the pending share.
- Measure the main bundle before and after. The plan's "same size" claim is not proven.
- Refresh the feed on screen focus. Navigation uses `freezeOnBlur`.
- No request dot on the tab icon in v1.

## Draft migration (adjust to the decisions above)

`/private/tmp/...` scratch files are gone in a new session, so the draft is here. It still has the `security definer` function and no `visibility` or `comment`. Rewrite it per the codex findings before applying.

```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

create table public.friendships (
  user_a uuid not null references public.profiles on delete cascade,
  user_b uuid not null references public.profiles on delete cascade,
  requested_by uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  kind text not null check (kind in ('workout', 'meal')),
  payload jsonb not null,
  client_key text not null,
  created_at timestamptz not null default now(),
  unique (author_id, client_key)
);
```

Profiles: readable by every signed-in user, insert only your own row, no update grant (usernames are fixed). Test every policy with `execute_sql` as two fake users (`set local role authenticated; set local request.jwt.claims ...`), including the hijack case: B requests A, A accepts while changing a participant, and the update must fail. Run `get_advisors` with type `security` after applying.

## Remaining phases

1. Phase 4 contract: signatures, types, state, tests, logic home per module. Owner approves.
2. Phase 5: migration, `src/models/feedPost.ts`, `src/models/friends.ts`, `src/models/socialSignIn.ts`, `src/utils/supabaseClient.ts`, `src/utils/feedApi.ts`, the Friends screens, the `socialSheet` modal, the onboarding step, the finish flow, the food share.
3. Phase 6: lint, tsc, `scripts/lint-views.ts`, mocha, a Playwright test with routed Supabase responses against `npm run build:pwa` (see `tests/music.spec.ts`).
4. Phases 6b to 8: comment pass agent, two codex reviews, triage with the owner.
5. Phase 9: README (privacy wording changes, since shared posts leave the phone), `FORK_ROADMAP.md`, archdoc. Open a PR and ask before merging.
6. Delete this file in the PR.

## Parallel work

Two other sessions may run at the same time:

- Tab move: Friends tab where Program was, Program inside Progress. It owns `src/components/footer2.tsx`, `src/navigation/AppNavigator.tsx`, `src/navigation/types.ts`, `src/models/screen.ts`, `Thunk_pushToEditProgram` in `src/ducks/thunks.ts`, and `src/components/screenProgressDashboard.tsx`. It adds a placeholder `src/components/screenFriends.tsx`. Once it merges, put the feed in that file.
- Collapsible daily workouts on Home. It owns `src/components/programHistory.tsx` and `src/components/historyRecord.tsx`.

Do not edit their files. If the feed needs a change there, wait for their PR to merge and rebase.
