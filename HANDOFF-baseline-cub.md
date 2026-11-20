# Handoff: piece C, the cub number

You are the Opus build session for the cub number in `BASELINE_WEEK_PLAN.md`. Read its section "The cub number" before the first edit, then `CLAUDE.md`. This piece holds two design calls; the plan names them under piece C in its "Build split" section.

## Before you start

- `HOUSE_HOME_PLAN.md` piece C must be on master, because both change `src/models/bearHouse.ts` and `src/components/bearHouseScene.tsx`. Check that `IBearHouseObject.pill` is optional.
- The owner decided on 2026-10-27: sign-in is the first page with no way past it, and Cub 0 is the account `pbebear@icloud.com`. The migration's backfill uses that email.

## What you build

One branch, one PR titled "Give every cub a number [skip deploy]". Do not merge it. 10 hours.

The server.

- `supabase/migrations/20261028000000_cubs.sql`. A sequence `public.cub_numbers` starting at 1. A table `public.cubs (user_id uuid primary key references auth.users (id) on delete cascade, number bigint not null unique, created_at timestamptz not null default now())`. A function `public.assign_cub()` returning trigger, `security definer`, `set search_path = ''`, inserting `(new.id, nextval('public.cub_numbers'))`. A trigger `after insert on auth.users for each row`. The backfill: insert the owner's row with number 0 by `select id from auth.users where email = 'pbebear@icloud.com'`, and raise an exception if that select finds no row, then every other user in `created_at` order with `nextval`. Row-level security on, `revoke all` from `anon` and `authenticated`, `grant select` to `authenticated`, one `select` policy: the row's own user, or a user in an accepted friendship with the row's user, with the predicate `workout_posts` uses. No other grant.
- `supabase/tests/cubs.sql`, in the style of `supabase/tests/store_entitlements.sql`: insert three `auth.users` rows and assert numbers 1, 2 and 3 after the backfilled rows, delete the second and insert a fourth and assert the next number is never 2, and assert that an insert into `public.cubs` under `set local role authenticated` is rejected.

The phone, modules first.

- New `src/models/cubNumber.ts`: `ICubState` with `version`, `userId`, `number`, `fetchedAt`. `CubNumber_parse`, `CubNumber_empty`. `CubNumber_label(number)` returns "Cub 412" and "Cub 0". `CubNumber_plate(state, session)` returns the number as text, or "?" when the state has no number for this session's user. `CubNumber_needsFetch(state, session, now)` is true for a different user id, no number, or a number older than 24 hours. `CubNumber_fromRows(raw, userId, now)` reads the PostgREST answer. New `test/cubNumber.test.ts`.
- `src/models/bearHouse.ts`: the door gains `overlay: { kind: "number", share: doorPlate, text: plate }`, where `doorPlate` is a rect you measure on `door` art in `images/bear/house/` so the plate sits where a house number does. `test/bearHouse.test.ts` checks the overlay text for a numbered user and for "?".
- `src/models/workoutPost.ts`: summary version 4 carries `cub`. Version 3 posts read with no number. `test/workoutPost.test.ts`.
- `src/models/fullBackup.ts`: the cub store is backed up and restored. `test/fullBackup.test.ts`.
- `src/models/onboardingChoices.ts`: `OnboardingChoices_welcomeLabel` gains the signed-out text "Sign in to get your cub number". `test/onboardingChoices.test.ts`.
- New `src/utils/cubStore.ts`: `JsonStore_create("bebear_cub", CubNumber_parse, CubNumber_empty)`. New `src/utils/cubClient.ts`: `CubClient_refresh()` reads `GET /rest/v1/cubs?select=number` through `SupabaseClient_call` with the session token when `CubNumber_needsFetch` is true, and writes the store. Call it after every successful sign-in and when the home screen mounts.

Then the views.

- `src/components/onboardingWelcome.tsx` and `.native.tsx`: sign-in first, no way past. The bear, "Meet your bear", the line "Sign in to get your cub number", Sign in with Apple and Sign in with Google from the buttons `CloudBackupCard` already renders, and a small "Use email instead" link that opens the email code form. The "Start" path without an account is removed, and `OnboardingChoices_welcomeLabel` loses its signed-out label. After sign-in the welcome shows "You are Cub 412." with the cub share card and a Continue button.
- New `src/components/shareCards/cubCard.tsx`: the bear, "I'm Cub 412 on beBEAR", the user's invite handle when they have one, behind a Share button. Text from `CubNumber_shareText(number, handle)` in `cubNumber.ts`, tested.
- `src/components/bearHouseScene.tsx`: the door's overlay draws the way the scale's number does. A tap on a "?" plate opens sign-in instead of the gym; the rule for which lives in `bearHouse.ts` as the door's target.
- `src/components/bearPanelSheet.tsx`: the header reads "Cub 412 · <bear name>".
- `src/components/shareCards/cardParts.tsx`: every card's footer carries `CubNumber_label` when a number exists.
- `src/components/screenFriends.tsx` and `src/components/bearTv.tsx`: a friend's number next to the handle, from the post summary's `cub`.

## Design calls you own

- The plate's place and type on the door art: measure the rect on the art, pick the ink and size so "412" and "?" both read at the house's size on a 393 pt phone.
- The welcome's layout with three sign-in buttons and the number as the reason, grandma-simple: one headline, one line, the buttons, nothing else.

## What you do not touch

The baseline rules in piece W. `account_plans`, `profiles`, `friendships` and every other table. Nothing numbers a user on the client; the number only ever comes from `public.cubs`.

## Done means

- `npm test` and `npm run lint` are green. The SQL test runs against a local Supabase with `supabase db reset` and `psql -f supabase/tests/cubs.sql`, or, when no local stack is available, the PR body says the SQL test was not run and asks the owner to run it.
- The PR body gives the migration's apply command for the owner and a phone checklist of five items: the first page is sign-in and nothing else continues; a fresh sign-in shows "You are Cub N" with the cub card; the door shows the number; a share card's footer shows "Cub N"; a friend's post on the TV shows their number.

## Conventions

- No simulator or browser testing. The owner tests on the iPhone from the checklist. A screenshot of the web app from `npm start` is enough for the PR.
- Change files with the Edit and Write tools, never a shell rewrite.
- Zero comments unless the code cannot carry the fact. Commit messages name what the user sees. No AI attribution lines.
- Push the branch a second time as `preview/baseline-cub` so Vercel builds a preview the owner opens in Safari. Put the URL in the PR body.
