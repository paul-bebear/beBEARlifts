# Handoff: friends feed on Supabase

Phase 4 of 9 of the `/feature` loop is done. The owner approved the plan, every decision below, and the implementation contract in "Plan and contract (approved)" at the end of this file. Phase 5 is in progress. See "Phase 5 status".

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

The tab-move session (`claude/jolly-einstein-83f4ed`) adds `src/components/screenFriends.tsx` as a placeholder with no props: `ScreenFriends()` calls `useNavOptions({ navTitle: "Friends" })` and renders an icon and "Friends are coming". After it merges, it renders `<FriendsFeed />` instead.

## Phase 5 status

Commit "WIP: friends feed models" holds this work. The plan file in `lambda/scripts/plans/` is local only, so the approved plan and contract are copied below.

Done:

- `@supabase/supabase-js` 2.118.0 added to `package.json`.
- `src/models/feedPost.ts`: types, `FeedPost_fromWorkout`, `FeedPost_fromMeal`, `FeedPost_music`, `FeedPost_withMusic`, `FeedPost_parse`, `FeedPost_parsePage`, keys and `FeedPost_trackUrl`.
- `src/models/friends.ts`: all functions in the contract.
- `src/models/feedList.ts`: all functions in the contract.
- `src/models/socialSignIn.ts`: the state machine and `SocialSignIn_errorText`. Two changes from the contract. `IFeedResult` and `ISocialMe` live here, so the pure model does not import `src/utils/feedApi.ts`. `ISocialEffect` has two more members, `{ type: "authChanged" }` and `{ type: "shared"; clientKey }`, so the store bumps `authVersion` and adds to `sharedKeys` without its own logic. The `username` step carries the submitted `username` for the done message.
- `IMusicSession.playlistUrl` in `src/models/musicSession.ts`, parsed in `MusicLog_parse`.
- Supabase origin added to `OfflineOnly_allowedOrigins`, `connect-src` in `vercel.json`, and the `*.supabase.co` bypass in `src/webpushr-sw.ts`.
- Tests written: `test/feedPost.test.ts`, `test/friends.test.ts`, `test/feedList.test.ts`, `test/socialSignIn.test.ts`, `test/musicLog.test.ts`, and a Supabase case in `test/offlineOnly.test.ts`.

Not run yet: none of these tests has passed. The first run failed to load:

```
TSError: ⨯ Unable to compile TypeScript:
src/models/whatsnewParser.ts(1,46): error TS2307: Cannot find module '../generated/whatsnew' or its corresponding type declarations.
```

The worktree had never run the code generators. `feedPost.ts` imports `history.ts`, which reaches `whatsnewParser.ts` and its generated module. Run `npm run build:markdown` (or the generator chain in `build:pwa`: `ensure:localdomain`, `build:theme`, `build:markdown`, `build:programs`, `build:exercises`), then rerun the tests. An interrupted generator run rewrote `src/models/exerciseDescriptions.ts`. That change was reverted, not committed.

Not started:

- `src/utils/supabaseClient.ts`, `src/utils/feedApi.ts`, `src/utils/socialStore.ts`.
- Components: `socialSheetHost.tsx`, `friendsFeed.tsx`, `feedPostCard.tsx`, `friendsManager.tsx`, `feedShareWorkoutCard.tsx`.
- Wiring: `app.tsx`, `screenFinishDay.tsx`, `foodMealCard.tsx` and `screenFood.tsx`, `screenMusic.tsx` save, `screenSetupEquipment.tsx`.
- The migration through MCP, the RLS tests, `get_advisors`.
- Phase 6 onward.

## Plan and contract (approved)

The owner approved all four open-question recommendations: a plain update for the playlist, comment and audience in the sheet, the onboarding sheet after the equipment step, and a rebase after the tab-move PR merges.

### What the user gets

A new user signs up during onboarding with email, password and a username. The step can be skipped. Existing users sign up from the Friends tab. After a workout, the finish screen asks "Share this workout?". Yes opens a sheet with an optional comment and a Friends or Public choice. The post carries the workout summary, the PRs from the finish report and the kept songs of that workout. Saving the playlist later adds its link to the same post. Each meal on the Food screen has a share icon that opens the same sheet. The Friends tab shows two lists, Friends and Public, plus friend requests and Sign out. The author can delete a post from the feed. The local workout, meal and songs stay.

### How it works

Everything stays offline-first. Only a shared post leaves the phone. It goes to Supabase (Postgres with row-level security). The SDK loads through `import()` on the first social action, so the main bundle grows only by the new screens and builders.

```
finish screen, "Share this workout?" -> Yes
  FeedPost_fromWorkout(record, history, settings, musicSession)      pure, builds the draft
  SocialStore_open({ kind: "share", draft })
    SocialSignIn_next(closed, open)          -> checking, effect loadMe
    effect runner: FeedApi_me()              SDK import, getSession, select own profile
      import failed                          -> failed "Could not load. Check your signal." [Retry]
      no session                             -> account (sign up | sign in)
      session, no profile                    -> username
      session and profile                    -> compose (comment, Friends | Public)
    compose -> Share                         -> isBusy, effect share
      FeedApi_share(draft, audience, comment)   upsert on (author_id, client_key)
        ok                                   -> done "Shared with friends", key added to sharedKeys
        error                                -> compose with error, draft kept
    close at any step                        -> closed, draft dropped

Friends tab focus
  FeedApi_me()
    signed out                               -> "Join your friends" button, opens the sheet with { kind: "join" }
  FeedApi_friendships(me)                    -> Friends_parseRows -> incoming, outgoing, accepted
  FeedList_start(state, "refresh")           -> request with requestId
  FeedApi_listFeed("friends", Friends_feedAuthorIds(lists, me), cursor)
  FeedList_receive(state, requestId, page)   drops a reply whose requestId is stale

Music screen, Save to Spotify -> ok with url
  MusicStore_update: session.playlistUrl = url
  SupabaseClient_hasStoredSession(localStorage)   no SDK load when never signed in
    FeedApi_attachMusic(session.id, FeedPost_music(session))
      update posts set payload = FeedPost_withMusic(old, music) where client_key = workout:<id>
      zero rows (never shared)               -> nothing happens
```

### Where the sheet lives without touching navigation

A root modal needs `AppNavigator.tsx` and `navigation/types.ts`, and the tab-move session owns both. So the sheet is a host component. `src/components/app.tsx` mounts `SocialSheetHost` next to `MusicTracker`, behind the same `OfflineOnly_isEnabled()` flag. It renders the existing web `BottomSheet` (a portal into `#bottomsheet`) when the store's sheet is not `closed`. The originating screen stays mounted under it, so a pending share survives sign-in.

### Onboarding step

The offline build goes first, units, equipment, plates, program select. `afterEquipmentScreen()` in `src/components/screenSetupEquipment.tsx` returns `"programselect"` in the offline build. Continue and Skip on equipment and plates call it. In the offline build they also call `SocialStore_open({ kind: "join" })`. The sheet opens over program select with Sign up, I have an account, and Not now.

### Database

One migration, applied with MCP `apply_migration`, then saved as `supabase/migrations/<version from list_migrations>_friends_feed.sql`. This replaces the draft migration above.

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
create index friendships_user_b on public.friendships (user_b);
create index friendships_requested_by on public.friendships (requested_by);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  kind text not null check (kind in ('workout', 'meal')),
  visibility text not null default 'friends' check (visibility in ('friends', 'public')),
  comment text check (char_length(comment) <= 500),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) < 16384),
  client_key text not null check (char_length(client_key) <= 100),
  created_at timestamptz not null default now(),
  unique (author_id, client_key)
);
create index posts_feed on public.posts (created_at desc, id desc);
create index posts_author on public.posts (author_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;

revoke all on public.profiles, public.friendships, public.posts from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, username) on public.profiles to authenticated;
grant select, delete on public.friendships to authenticated;
grant insert (user_a, user_b, requested_by) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
grant select, delete on public.posts to authenticated;
grant insert (kind, payload, client_key, visibility, comment) on public.posts to authenticated;
grant update (kind, payload, client_key, visibility, comment) on public.posts to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy friendships_read on public.friendships for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy friendships_request on public.friendships for insert to authenticated
  with check (requested_by = (select auth.uid()) and status = 'pending');
create policy friendships_accept on public.friendships for update to authenticated
  using (status = 'pending' and (select auth.uid()) in (user_a, user_b) and requested_by <> (select auth.uid()))
  with check (status = 'accepted');
create policy friendships_remove on public.friendships for delete to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy posts_read on public.posts for select to authenticated using (
  author_id = (select auth.uid())
  or visibility = 'public'
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.user_a = posts.author_id and f.user_b = (select auth.uid()))
        or (f.user_b = posts.author_id and f.user_a = (select auth.uid())))
  )
);
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy posts_update on public.posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));
```

The column grants make `user_a`, `user_b`, `requested_by`, `author_id`, `id` and `created_at` impossible to write after insert. `client_key` is in the update grant because PostgREST's upsert sets every sent column in `on conflict do update`. Changing it on your own post harms nobody.

RLS tests run through `execute_sql` as fake users A, B and C, inside one transaction that rolls back. Each case is a line in the phase 6 report:

- A reads B's profile. A cannot insert a profile with B's id.
- A requests B. A cannot insert a row with `requested_by = B` or `status = 'accepted'`.
- A cannot accept A's own request. B accepts it.
- The hijack: C requests A. A updates the row to accepted while setting `user_b` to B. The update fails with a permission error.
- A posts Friends and Public. Stranger C sees only the Public one. B sees both after accepting, and only the Public one before.
- A cannot insert a post with `author_id = B`, update B's post, delete B's post, or set `created_at`.
- A 17 KB payload, an array payload and a 501-character comment are rejected.

Then `get_advisors` with type `security`.

### Contract: network modules

`src/utils/supabaseClient.ts` and `src/utils/feedApi.ts`. `IFeedResult` and `ISocialMe` are imported from `src/models/socialSignIn.ts`.

```ts
export const SupabaseClient_url = "https://qvqwvuuwfueccrmzwyct.supabase.co";
export function SupabaseClient_get(): Promise<SupabaseClient>;                     // import(), cached; a rejected import clears the cache
export function SupabaseClient_hasStoredSession(storage: Pick<Storage, "getItem">): boolean;

export function FeedApi_me(): Promise<IFeedResult<ISocialMe | undefined>>;
export function FeedApi_signUp(email: string, password: string): Promise<IFeedResult<ISocialMe>>;
export function FeedApi_signIn(email: string, password: string): Promise<IFeedResult<ISocialMe>>;
export function FeedApi_signOut(): Promise<void>;
export function FeedApi_createProfile(username: string): Promise<IFeedResult<void>>;
export function FeedApi_share(draft: IFeedDraft, audience: IFeedAudience, comment?: string): Promise<IFeedResult<void>>;
export function FeedApi_attachMusic(recordId: number, music: IFeedMusic): Promise<void>;
export function FeedApi_listFeed(
  audience: IFeedAudience,
  authorIds: string[],
  cursor?: IFeedCursor
): Promise<IFeedResult<IFeedPage>>;
export function FeedApi_deletePost(postId: string): Promise<IFeedResult<void>>;
export function FeedApi_friendships(me: string): Promise<IFeedResult<IFriendLists>>;
export function FeedApi_findProfile(username: string): Promise<IFeedResult<{ userId: string } | undefined>>;
export function FeedApi_requestFriend(me: string, otherId: string): Promise<IFeedResult<void>>;
export function FeedApi_acceptFriend(key: IFriendshipKey): Promise<IFeedResult<void>>;
export function FeedApi_removeFriendship(key: IFriendshipKey): Promise<IFeedResult<void>>;
```

The Friends list queries `author_id in (me + accepted friends)`. The Public list queries `visibility = 'public'`. Both order by `created_at desc, id desc`, take 20, and page with `or(created_at.lt.<c>, and(created_at.eq.<c>, id.lt.<id>))`. The username comes from the embedded `profiles(username)`. `FeedApi_friendships` selects `user_a, user_b, requested_by, status, a:profiles!friendships_user_a_fkey(username), b:profiles!friendships_user_b_fkey(username)`, which is the shape `Friends_parseRows` reads.

### Contract: sheet store, `src/utils/socialStore.ts`

```ts
export interface ISocialStoreState {
  sheet: ISocialSheet;
  sharedKeys: string[];
  authVersion: number;
}

export function SocialStore_open(intent: ISocialIntent): void;
export function SocialStore_send(event: ISocialEvent): void;     // SocialSignIn_next, then runs each effect through FeedApi and sends the result event
export function SocialStore_signOut(): Promise<void>;            // FeedApi_signOut, authVersion + 1, sheet closed
export function useSocialStore(): ISocialStoreState;
```

Same shape as `musicStore.ts`: a module variable, a listener set, and a hook. Nothing is persisted. The `authChanged` effect bumps `authVersion`. The `shared` effect adds its key to `sharedKeys`.

### New state, one line each

- `ISocialStoreState.sheet`, module state in `socialStore.ts`. The root host and the share buttons in three screens read it. Closing the sheet clears the draft.
- `ISocialStoreState.sharedKeys`, same module. The finish card shows "Shared" for its key. Lost on reload, which only brings the Yes/No question back.
- `ISocialStoreState.authVersion`, same module. `FriendsFeed` reloads when it changes after sign-in or sign-out.
- `FriendsFeed` `useState`: `audience` tab, one `IFeedListState` per audience, `me`, `IFriendLists`. Reset when `authVersion` changes and refreshed on `useIsFocused()` turning true.
- `SocialSheetHost` `useState`: email, password, username and comment input buffers. Cleared when the sheet closes.
- `FeedShareWorkoutCard` `useState`: `isDismissed` after No.
- `FriendsManager` `useState`: the add-friend input and its error.
- Supabase session: supabase-js keeps it in `localStorage` under `sb-qvqwvuuwfueccrmzwyct-auth-token`. No copy anywhere else.
- `IMusicSession.playlistUrl`, persisted in the `bebear_music` IndexedDB key. Optional field, `IMusicLog.version` stays 1. An older build drops it on its next write, which only loses the playlist link.
- `IState`: nothing. `IStorage`: nothing, so no storage version, no migration and no watch filtering.

### Logic home, one line per behaviour

- Workout draft (summary, top exercises, PRs, music, limits): `src/models/feedPost.ts`, `test/feedPost.test.ts`.
- Meal draft (items, grams optional, totals, empty meal): `src/models/feedPost.ts`, `test/feedPost.test.ts`.
- Adding the playlist link to an existing payload: `FeedPost_withMusic`, `test/feedPost.test.ts`.
- Validating a remote row and the URL and image allowlists: `FeedPost_parse`, `test/feedPost.test.ts`.
- Cursor that moves past dropped rows: `FeedPost_parsePage`, `test/feedPost.test.ts`.
- Paging, stale replies, de-duplication, delete: `src/models/feedList.ts`, `test/feedList.test.ts`.
- Username rules and normalizing: `src/models/friends.ts`, `test/friends.test.ts`.
- Pair order, rows into three lists, request versus accept, feed author ids: `src/models/friends.ts`, `test/friends.test.ts`.
- Sign-in and share flow, busy guard, draft cleared on close: `src/models/socialSignIn.ts`, `test/socialSignIn.test.ts`.
- Supabase error codes into user text: `SocialSignIn_errorText`, `test/socialSignIn.test.ts`.
- Supabase origin allowed, other Supabase projects blocked: `src/utils/offlineOnly.ts`, `test/offlineOnly.test.ts`.
- `playlistUrl` parse round trip: `src/models/musicLog.ts`, `test/musicLog.test.ts`.

### Components, render and effects only

- `src/components/socialSheetHost.tsx`: renders the sheet step from `useSocialStore()`, sends events. Mounted in `app.tsx`.
- `src/components/friendsFeed.tsx`: Friends | Public tabs, the post list, Load more, the signed-out state, Sign out. Effects: load on focus and on `authVersion`.
- `src/components/feedPostCard.tsx`: one post. Songs open `FeedPost_trackUrl`. Delete shows on own posts.
- `src/components/friendsManager.tsx`: add by username, incoming with Accept and Decline, outgoing with Cancel, friends with Remove.
- `src/components/feedShareWorkoutCard.tsx`: "Share this workout?" Yes and No on the finish screen. Yes builds the draft and calls `SocialStore_open`.
- `screenFinishDay.tsx`: one line renders `FeedShareWorkoutCard` above `WorkoutStoryCardSection`, offline build only.
- `foodMealCard.tsx`: a new optional `onShare` prop draws a share icon when the meal has entries. `screenFood.tsx` passes it, building the draft with `FeedPost_fromMeal(day, meal, entries)`.
- `screenMusic.tsx`: `SessionCard.save` stores `result.value.url` as `playlistUrl`, then calls `FeedApi_attachMusic` when `SupabaseClient_hasStoredSession(localStorage)` is true.
- `screenSetupEquipment.tsx`: the offline branch of the Continue and Skip handlers also calls `SocialStore_open({ kind: "join" })`.
- `screenFriends.tsx` (after the tab-move PR merges and the branch is rebased): renders `<FriendsFeed />` in place of the placeholder.

### Tests

- New: `test/feedPost.test.ts`, `test/feedList.test.ts`, `test/friends.test.ts`, `test/socialSignIn.test.ts`, `test/musicLog.test.ts`.
- Grows: `test/offlineOnly.test.ts`.
- New Playwright: `tests/friends.spec.ts` against `npm run build:pwa`, every `*.supabase.co` request routed. It finishes a workout, says Yes, signs up, picks a username, shares to Public, and checks the upsert body has no `author_id` or `created_at`. It opens Friends and sees the post from the routed feed reply, then deletes it. A second case shares a meal from Food.
- RLS: the SQL cases listed under Database, run with `execute_sql`, results in the phase 6 report.
- Bundle: `app.<hash>.js` gzipped size on `master` and on the branch, both numbers in the PR.

### What we're not doing

- Likes, comments, notifications, photos.
- One-way follows. A later `follows` table needs no change to these tables.
- An offline outbox. Share needs a signal.
- Email codes and custom SMTP. Sign-in is email and password, and Supabase sends no email.
- A request dot on the tab icon.
- Native iOS and Android. Everything sits behind `OfflineOnly_isEnabled()`.
- Editing a post's comment or audience from the feed. Sharing again from the same workout or meal replaces it.
