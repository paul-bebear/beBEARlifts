# Handoff: cloud backup to Supabase

Branch `cloud-backup`. Read `CLAUDE.md` (or `AGENTS.md`) first. Its rules apply: logic in pure modules with mocha tests, thin `.tsx` files, file edits with the edit tool, no AI attribution lines in commits.

Do no simulator or browser testing. The user tests on their iPhone. Finish with `tsc --noEmit`, eslint on changed files, and the mocha tests below, then open a PR against `master` with a short "Check on your iPhone" list.

## Goal

The user signs in with an email code. After each workout the app uploads the "Export everything" file to Supabase. On a new phone the user signs in and restores it.

## Done

- **Supabase project:** `bebearlifts`, id `qvqwvuuwfueccrmzwyct`, URL `https://qvqwvuuwfueccrmzwyct.supabase.co`, organization "Indexable".
- **Bucket:** private bucket `backups` (50 MB limit, `application/json` only), created by the migration `backups_bucket`.
- **Access rules:** policies on `storage.objects` for select, insert and update. Each lets a signed-in user touch only paths whose first folder is their `auth.uid()`.
- **`src/models/cloudBackup.ts`** with `test/cloudBackup.test.ts` (6 passing):
  - the session shape and its parsing
  - `CloudBackup_isAutoDue`, which never backs up when there are no workouts
  - `CloudBackup_paths`: `latest.json` plus a `day-<weekday>.json` copy
  - email and code checks
- **`src/utils/cloudBackupClient.ts`:** sends the code (`POST /auth/v1/otp`), verifies it (`POST /auth/v1/verify`, type `email`), refreshes the token (`POST /auth/v1/token?grant_type=refresh_token`), uploads with `x-upsert`, downloads from `/storage/v1/object/authenticated/backups/...`, and signs out. The session is stored under the IndexedDB key `bebear_cloud` through `JsonStore_create` (`src/utils/jsonStore.ts`).
- **Error shapes, checked with curl:**
  - A wrong code returns 403 `{"msg":"Token has expired or is invalid"}`.
  - A missing object returns 400 `{"message":"Object not found"}`. `CloudBackupClient_download` treats that as "no backup yet".
- **The publishable key** `sb_publishable_rEbD1nY_vtRMiQrpHSgnCg_xquG6idR` is committed on purpose. It is meant for client code.

None of the client code has run against a real sign-in yet.

## To do (completed 2026-10-20)

1. [x] **Let the page reach Supabase.**
   - Add `https://qvqwvuuwfueccrmzwyct.supabase.co` to `OfflineOnly_allowedOrigins` in `src/utils/offlineOnly.ts`. Update `test/offlineOnly.test.ts` if it lists the origins.
   - Add the same origin to the `connect-src` header in `vercel.json`.
   - Without both, every call fails with "No connection".
2. [x] **Upload thunk.** Add `Thunk_cloudBackup(force: boolean)` in `src/ducks/thunks.ts`.
   - Build the file the way `Thunk_exportEverything` does: load the food, music, body, warmup and report stores, then call `FullBackup_build({...}, now)` and `JSON.stringify`. Extract a shared helper so the two thunks do not duplicate this.
   - Without `force`, upload only when `CloudBackup_isAutoDue(state, lastWorkoutAt)` is true. `lastWorkoutAt` is `history[0].endTime ?? history[0].startTime`.
   - Then call `CloudBackupClient_upload`.
3. [x] **Restore thunk.** Add `Thunk_cloudRestore()`. It calls `CloudBackupClient_download()` and passes the text to `Thunk_importStorage`, which already restores a full backup, food, music, body scans, warmups and reports.
4. [x] **Auto backup.** In `src/components/screenFinishDay.tsx`, dispatch `Thunk_cloudBackup(false)` once on mount, offline build only (`OfflineOnly_isEnabled()`).
5. [x] **Settings card.** Add `src/components/cloudBackupCard.tsx` under the "Import / Export" group in `src/components/screenSettings.tsx`, offline build only.
   - **Signed out:** an email field and "Send code". Then a code field and "Sign in". Validate with `CloudBackup_isEmail` and `CloudBackup_isCode`. Show the error text from the client.
   - **Signed in:** the email, "Last backup: <date and time>" from `CloudStore.use()`, and the buttons "Back up now" (`force: true`), "Restore from cloud" (confirm first, because it replaces local data) and "Sign out".
   - **Right after sign-in:** if local history is empty and a cloud backup exists, offer to restore it.
   - Put the step state machine (email → code → signed in, busy, error) in a pure module with a test, per the "Where logic lives" rule.
6. [x] **Include the cloud file in "Export everything"?** No. Keep `bebear_cloud` out of the export, because it holds the refresh token.
7. [x] **Docs.** Add a "Cloud backup" section to `README.md`: what is uploaded, where, how to restore, and the email limit below. Add a "built" entry to `FORK_ROADMAP.md` under Phase 2.

## The user must do in the Supabase dashboard

These cannot be done from the code or the Supabase MCP tools. Put them in the PR body as steps.

1. **Authentication → Emails → Templates.** In both "Magic Link" and "Confirm signup", add the code: `Your code: {{ .Token }}`. Without it, the email only holds a link, which opens Safari and never signs in the Home Screen app.
2. **Email limit.** Supabase's built-in email sender allows only a few emails per hour. That is fine for the user alone. Before inviting testers, set up custom SMTP under Authentication → Emails → SMTP. Resend's free tier works.

## After the PR

Run the Supabase security advisor (`get_advisors`, type `security`) on project `qvqwvuuwfueccrmzwyct` and fix any warning it reports for the new policies.
