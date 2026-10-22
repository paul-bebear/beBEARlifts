# Handoff R7: AI caps and beBEAR+ codes

Branch `handoff-r7-ai-caps`. Recommended Codex reasoning: high. This batch changes server limits and adds a migration.

Read "AI caps" under "Sign-in" in `REDESIGN_PLAN.md` on `master`, and the R7 entry under "Build batches". Read `api/_auth.mjs`, `test/aiAuth.test.ts`, and the two migrations `supabase/migrations/20261020221250_ai_usage.sql` and `20261021173026_ai_usage_global_ceiling.sql`.

## Wait for this first

Batch O2 edits `api/ai/onboard.mjs`. Start only after O2's PR has merged into `master`. Check with `git log origin/master --oneline | grep -i "first run"`, or ask the owner.

## Goal

Sign-up stays open. The guard on AI spending is a cap per account.

- Free accounts: 3 AI uses a day and 10 a week, counted over Describe and the photo scan (`api/food/photo.mjs`) and the warmup (`api/ai/warmup.mjs`).
- Outside that cap: the onboarding import (`api/ai/onboard.mjs`) at 3 runs per account for life, and the post-workout report (`api/ai/report.mjs`) at one per finished workout.
- beBEAR+ accounts: 30 a day and 150 a week. The owner makes codes by inserting rows in the Supabase dashboard. A user redeems one in Settings → Cloud backup.
- The global ceiling of 600 calls a day from batch E stays and covers every kind.

## What to build

- New migration `supabase/migrations/<timestamp>_ai_caps_and_plans.sql`. Add it as a file only. Never apply it.
  - Table `account_plans` (user_id primary key, plan text, updated_at). A user can read only their own row. No user can write it.
  - Table `pro_codes` (code primary key, created_at, redeemed_by, redeemed_at). No user can read or write it directly.
  - Function `redeem_pro_code(p_code text)`, security definer. It marks an unused code as used by the caller and sets the caller's plan to `plus` in one transaction. A used or unknown code raises an error with a stable message. Two users cannot redeem one code.
  - A new overload `ai_usage_take(p_kind text, p_ref text default null)`, security definer, with `p_kind` one of `capped`, `onboard` and `report`. It returns the caller's plan and the counts the API needs: today and the last seven days for `capped`, the lifetime count for `onboard`, and whether `p_ref` (the workout id) was already used for `report`. Store counts per kind in a new table, and keep the existing `ai_usage` rows.
  - Keep the old zero-argument `ai_usage_take()` working. The deployed API calls it until the new API deploys, and the owner applies the migration before merging. Do not drop it in this migration.
  - Keep the 600-a-day global ceiling across all kinds, with its advisory lock.
  - A refused call must not raise the user's count. Keep the allow decision in the API, as today.
- `api/_auth.mjs`: each route passes its `kind`, and the report route also passes the workout id. Read four caps from Vercel variables: `AI_DAILY_CAP` (default 3), `AI_WEEKLY_CAP` (default 10), `AI_PLUS_DAILY_CAP` (default 30), `AI_PLUS_WEEKLY_CAP` (default 150). A refused call answers 429 with a JSON body that carries the counts and the caps. Keep the decision a pure exported function next to `AiAuth_decide`, and extend `test/aiAuth.test.ts`.
- `api/ai/onboard.mjs`, `api/ai/report.mjs`, `api/ai/warmup.mjs`, `api/food/photo.mjs`: pass the right kind. The report route needs the workout id from its request body. If the client does not send one today, add it on the client side in the file that builds the report request, and name that file in the PR body.
- New pure `src/models/aiCaps.ts`: parses the 429 body and returns the message, "Your 3 AI uses for today are used. More tomorrow.", and the weekly variant. It also returns the "2 of 3 today, 7 of 10 this week" line. Test it in `test/aiCaps.test.ts`.
- `src/utils/aiRequest.ts`: a 429 shows the `aiCaps.ts` message instead of the raw error. Barcode, search and USDA lookups are not AI and stay uncounted.
- `src/components/cloudBackupCard.tsx`: in the full card, not the compact one, add "Enter a code" with one field and Redeem. Once redeemed, show a "beBEAR+" line with the day and week caps. `src/utils/cloudBackupCommand.ts` runs the `redeem_pro_code` call.

## Files

- new `supabase/migrations/<timestamp>_ai_caps_and_plans.sql`
- `api/_auth.mjs`, `api/ai/onboard.mjs`, `api/ai/report.mjs`, `api/ai/warmup.mjs`, `api/food/photo.mjs`
- `src/utils/aiRequest.ts`, new `src/models/aiCaps.ts`
- `src/components/cloudBackupCard.tsx`, `src/utils/cloudBackupCommand.ts`, and `src/models/cloudBackupForm.ts` if the redeem step needs form state
- the one client file that builds the report request, if the workout id is missing
- tests: `test/aiAuth.test.ts`, new `test/aiCaps.test.ts`, `test/cloudBackupForm.test.ts` if you change the form

## Owner actions, for the PR body

- Set `AI_DAILY_CAP=3`, `AI_WEEKLY_CAP=10`, `AI_PLUS_DAILY_CAP=30` and `AI_PLUS_WEEKLY_CAP=150` in Vercel.
- The orchestrator applies the migration after the owner says "apply", before merging.
- Insert the first codes in `pro_codes` from the Supabase dashboard.

## Check on your iPhone list for the PR

- Use Describe three times in one day. The fourth try says "Your 3 AI uses for today are used. More tomorrow."
- The post-workout report still works after the cap is used up.
- Settings → Cloud backup → Enter a code. Redeem a test code. The card shows beBEAR+. Describe works again.
- Redeem the same code on a second account. It is refused with a clear message.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
