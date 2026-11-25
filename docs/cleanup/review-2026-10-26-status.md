# Status of the 26 October audit findings

Checked on 2026-11-18 against `master` at d5df8641. Source: `REVIEW-2026-10-26.md`.

Result: 24 fixed, 3 open (P3, P5, P7), 1 unsure (P6). The audit lists 28 codes, not the 27 in the cleanup plan. P7 holds three older items (S4, S8, S9), marked on their own lines. Only S4 is open.

"Fixed" means the fix is in the repo code. A fix in `supabase/migrations` is not proof that the live Supabase project has run the migration. Nobody checked the live project in this pass.

Open findings rated high: 0. The four high ones were M1, D1, D2 and X1. All four are fixed in the repo.

## Money

- **M1. Fixed in fb6bae79.** `supabase/migrations/20261027000000_ai_allowance_limits.sql` drops the zero-argument `ai_usage_take()` and caps the "report" kind at 10 a day per user.
- **M2. Fixed in 1fad4acf.** The same migration adds the one-row `public.ai_settings` table with `daily_ceiling`, skips the ceiling for beBEAR+ users, and `api/_auth.mjs` sends a notice at 80 percent.
- **M3. Fixed in fb6bae79.** `api/_billing.mjs` gives a sandbox purchase an end date of 7 days after the snapshot (`sandboxGrantMs`), so no sandbox grant is lifetime.
- **M4. Fixed in 1fad4acf.** `supabase/migrations/20261027000001_pro_code_attempt_limit.sql` adds `pro_code_attempts` and counts failed codes per user per day.

## Privacy and user harm

- **P1. Fixed in bbdb7502.** `src/utils/cloudBackupClient.ts` keeps `ownerUserId` through sign out, and `CloudBackup_isAutoDue` in `src/models/cloudBackup.ts` stops when `uploadDeclinedFor` matches the signed-in user.
- **P2. Fixed in 50a2e63f.** `src/components/cloudBackupCard.tsx` shows `AccountDeletion_subscriptionNote` with a manage button, and `api/account/delete.mjs` deletes the RevenueCat customer first.
- **P3. Open.** `api/food/usda.mjs` still falls back to `DEMO_KEY` when `FDC_API_KEY` is unset. The Vercel environment variable is not readable from here, so the fix may be a dashboard step that was never recorded.
- **P4. Fixed in 1fad4acf.** `supabase/migrations/20261027000002_backups_object_names.sql` limits backup names with a regular expression, and `20261027120000_backups_photos.sql` widens it only to `photos/<number>.jpg`.
- **P5. Open.** `api/_ai.mjs` still sends photos and body numbers through the gateway. The decision to wait for zero data retention until revenue comes in is in memory, not in code.
- **P6. Unsure.** The audit saw a one-minute 404 outage and named no code cause. Nothing in the repo can settle it.
- **P7. Open, one of three items is still open.**
  - S4 is open. `api/food/search.mjs`, `barcode.mjs` and `usda.mjs` have no sign-in check, and `vercel.json` has no rate limit rule.
  - S8 is fixed in 1fad4acf. `supabase/migrations/20261027000003_request_friend_limit.sql` adds a daily request counter.
  - S9 is fixed in 7c4df62e. `api/_reportEmail.mjs` builds an email for each new `post_reports` row. The database webhook that calls it lives in the Supabase dashboard and was not checked.

## Data loss

- **D1. Fixed in bbdb7502.** `src/App.native.tsx` dispatches `Thunk_cloudCatchUp` at launch and on return to the app, and `CloudBackup_isAutoDue` also compares `CloudBackup_storesMark`.
- **D2. Fixed in bbdb7502.** `src/utils/jsonStore.ts` has `loadStrict()`, and `src/utils/fullBackupFile.ts` reads every store with a `loadStrict` variant.
- **D3. Fixed in bbdb7502.** `CloudBackupCompare_decide` in `src/models/cloudBackupCompare.ts` takes `syncedExportedAt` and asks before it replaces a cloud file this device did not write.
- **D4. Fixed in bbdb7502.** `src/utils/progressPhotoFiles.native.ts` stores photos as files under the documents folder, and `src/utils/progressPhotoCloud.ts` uploads them to `<uid>/photos/<id>.jpg`.
- **D5. Fixed in bbdb7502.** `src/models/storeRecovery.ts` offers "Restore from cloud" and "Start this log again".
- **D6. Fixed in bbdb7502.** `BearStoreData_parse` in `src/models/bearStoreData.ts` gives each field its own fallback.
- **D7. Fixed in bbdb7502.** `MusicLog_maxSessions` in `src/models/musicLog.ts` is 210, and the clip details say the newest 300 are kept.

## Crashes and dead ends

- **X1. Fixed in 952da80e.** `backFrom` in `src/models/foodScanSteps.ts` returns the camera step with `resume`, so the estimate survives Back.
- **X2. Fixed in 952da80e.** `src/components/screenFoodAdd.tsx` runs saves through `FoodSaveGuard_run` in `src/models/foodSaveGuard.ts`, which has its own test file.
- **X3. Fixed in 952da80e.** `barcodeFound` in `src/models/foodScanSteps.ts` carries `code`, and `src/utils/foodApi.ts` aborts a request after `FoodApi_requestTimeoutMs` (15 seconds).
- **X4. Fixed in 952da80e.** `FoodRepeatList` in `src/components/foodRepeatList.tsx` takes `props.day` and builds its state from it.
- **X5. Fixed in 952da80e, then reshaped in dbb0fa61.** The photo and label panels merged into `src/components/foodAiPanel.tsx`, which returns `FoodAiSignIn` when `session == null`. `AiRequest_signInMessage` in `src/utils/aiRequest.ts` names the gear on the bear's home.
- **X6. Fixed in 952da80e.** `src/components/foodLabelPanel.tsx` calls `inputRef.current?.click()` straight from `onPress`, with no await before it. The old photo panel is now part of `foodAiPanel.tsx`.

## Code health

- **H1. Fixed in 50a2e63f.** `npm test` passes 351 of 351 files today, and `llms/programs_guide.md` has the three beBEAR programs.
- **H2. Fixed in 50a2e63f.** `npx eslint .` reports 0 errors today.
- **H3. Fixed in 50a2e63f.** `src/components/screenReportsHub.tsx` calls `ReportsHub_actionEffect` from `src/models/reportsHub.ts`. `scripts/lint-views.ts` no longer flags `bearScene.tsx`.
- **H4. Fixed in 50a2e63f.** `package.json` has `pretest` and `"engines": { "node": "22.x" }`, and `scripts/run-tests.mjs` runs the files one by one.
