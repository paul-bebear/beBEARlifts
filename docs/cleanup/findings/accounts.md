# Phase 1 findings: Accounts and the database

Slice `accounts` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Opus. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 1 high, 3 medium, 11 low. 0 dropped by the checker.
Coverage: 56 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## High

- **A1. Delete account leaves the progress photos in the cloud, or fails**
  - Severity: high. Seen. Kind: data.
  - File and line: `api/account/delete.mjs:23-27, api/account/delete.mjs:54-78, test/accountDeleteApi.test.ts:51-59`
  - Scenario: A user backs up progress photos. They go to backups/<uid>/photos/<id>.jpg (ProgressPhotos_cloudPath). The user taps Delete account. The route lists backups with prefix <uid>. The listing shows photos as a folder entry with id null. AccountDelete_objectPaths drops folder entries, so no photo is deleted. Supabase docs say an auth user who owns storage objects cannot be deleted. So the auth delete likely answers 500, and the user sees 'Could not delete the account' on every try. If Supabase deletes the user anyway, the body photos stay on the server with no owner. The listing also stops at 1000 objects, so a heavy meal-photo user keeps the rest.
  - Fix: In POST in api/account/delete.mjs, also list and delete the prefix <uid>/photos. Better, walk folder entries and page with offset until a page is shorter than listLimit. Add test cases for a photos folder and for more than 1000 objects.
  - Effort: 1.5 hours.
  - Checker: keep. ProgressPhotos_cloudPath writes to <uid>/photos/<file> in the backups bucket. The route lists only the top level of prefix <uid> with limit 1000 and no paging. AccountDelete_objectPaths drops the id-null 'photos' folder entry, so progress photos are never deleted, and the test pins that folder skip.

## Medium

- **A2. The AI consent text says photos are not kept**
  - Severity: medium. Suspect. Kind: bug.
  - File and line: `src/models/aiConsent.ts:7-8`
  - Scenario: AiConsent_disclosure says photos and text 'go to Anthropic through Vercel's AI Gateway and are not kept'. api/_ai.mjs sends no zero data retention option. The team is on Vercel Hobby, so gateway zero data retention is off. Anthropic keeps API inputs under its standard retention. docs/appstore-checklist.md:82 still lists this as open. A user consents based on a false promise.
  - Fix: Change AiConsent_disclosure to say Anthropic may keep requests for a limited time under its API terms. Or turn on per-request zeroDataRetention in api/_ai.mjs first. Update test/aiConsent.test.ts if it checks the text.
  - Effort: 0.25 hours.
  - Checker: keep. AiConsent_disclosure promises the data is 'not kept', but api/_ai.mjs sets no zeroDataRetention or providerOptions, and docs/appstore-checklist.md still lists retention as an open check.
- **A3. A dead refresh token leaves the app signed in with a raw server error**
  - Severity: medium. Suspect. Kind: bug.
  - File and line: `src/utils/supabaseClient.ts:77-90`
  - Scenario: The user deletes the account on another phone, or the refresh token is revoked. On this phone SupabaseClient_session posts the old refresh token and gets 400 invalid_grant. The session stays in CloudStore. Every backup, feed and AI call shows 'Invalid Refresh Token: Refresh Token Not Found' while the card still shows the email as signed in. The AI routes never show the sign-in message.
  - Fix: In SupabaseClient_session, when the refresh answers 400 or 401, clear the session with CloudBackup_afterSignOut and return Supabase_notSignedIn. Add a case to test/supabaseClient.test.ts.
  - Effort: 0.75 hours.
  - Checker: keep. SupabaseClient_session returns the failed refresh result without clearing the stored session, so callers get the raw error_description text instead of Supabase_notSignedIn and never show the sign-in message.
- **A4. Food routes still answer without a token**
  - Severity: medium. Seen. Kind: security. Still open from the 26 October audit: P7/S4.
  - File and line: `api/food/search.mjs, api/food/barcode.mjs, api/food/usda.mjs`
  - Scenario: None of the three routes call AiAuth_check or any token check, and vercel.json has no rate limit. A loop calls /api/food/search thousands of times. Open Food Facts can block the fork's User-Agent for every user.
  - Fix: Add a Vercel Firewall rate limit per IP on /api/food/*, or require the Supabase bearer token as the AI routes do.
  - Effort: 0.5 hours.
  - Checker: keep. api/food/search.mjs, barcode.mjs and usda.mjs export GET with no AiAuth_check, there is no middleware, and vercel.json has no rate limit; the Open Food Facts block is a plausible consequence, not a certain one.

## Low

- **A5. Any signed-in user can still fill storage without limit**
  - Severity: low. Seen. Kind: security. Still open from the 26 October audit: P4.
  - File and line: `supabase/migrations/20261027120000_backups_photos.sql:7-22, supabase/migrations/20261022120000_meal_posts.sql:78-83`
  - Scenario: 20261027000002_backups_object_names.sql limited backup names. 20261027120000_backups_photos.sql then added photos/[0-9]+.jpg with no count limit. The bucket still allows 50 MB per file. A script uploads <uid>/photos/1.jpg, 2.jpg and so on until the project's storage is full. meal-photos also takes any number of 2 MB files with no meal_posts row.
  - Fix: Lower the backups file_size_limit for JPEGs, or move photos to their own bucket with a 2 MB limit. Add a storage insert check that counts the user's objects, or a nightly job that deletes meal photos with no meal_posts row.
  - Effort: 1 hours.
- **A6. A crafted link shows any text as a sign-in error**
  - Severity: low. Suspect. Kind: security.
  - File and line: `src/models/oauthFlow.ts:72-80, src/utils/supabaseOAuth.ts:59-74`
  - Scenario: An attacker sends https://lifts.paulbebear.com/app/?auth=supabase&error=x&error_description=Your+account+is+locked.+Email+help@evil.example. OAuthFlow_readReturn builds 'Sign-in failed: <description>'. SupabaseOAuth_finishReturn stores it as signInError, and the backup card shows it as an app message.
  - Fix: In OAuthFlow_readReturn, map access_denied to the cancel text and every other error to one fixed text. Log the description to the console only. Update test/oauthFlow.test.ts.
  - Effort: 0.25 hours.
- **A7. A tap during a background consent check gets the background answer**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/utils/aiConsentClient.ts:14-37`
  - Scenario: AiConsent_ensure keeps one pending promise for every ask kind. AiConsentGate starts an 'auto' check on mount. If the user taps an AI button with ask 'tap' before that check finishes, the tap gets the auto result. For a user who chose Not now, that is false with no prompt, so the tap does nothing.
  - Fix: In AiConsent_ensure, share the pending promise only when it was started with the same ask kind, or let a 'tap' or 'settings' call wait for the pending one and then run its own check. Add a case to test/aiConsentClient.test.ts.
  - Effort: 0.5 hours.
- **A8. No uptime check for the POST routes**
  - Severity: low. Seen. Kind: test. Still open from the 26 October audit: P6.
  - File and line: `(no file)`
  - Scenario: Every POST route answered 404 for one minute on 2026-10-26. Nothing in the repo checks for it, so a repeat goes unseen while AI scans, purchase sync and account delete fail.
  - Fix: Add an uptime check that posts {} to /api/ai/report and expects 400.
  - Effort: 0.5 hours.
- **A9. The SQL tests have no runner and skip the meal feed**
  - Severity: low. Seen. Kind: test.
  - File and line: `supabase/tests/abuse_limits.sql, supabase/tests/feed_moderation.sql, package.json:86`
  - Scenario: npm test runs scripts/run-tests.mjs, which only finds test/*.test.ts. No script runs supabase/tests, so a broken policy passes CI. No SQL test covers meal_posts, the meal-photos read rule, meal reports, the find_profile 60 limit, or a stranger reading profiles.
  - Fix: Add an npm script that runs every file in supabase/tests against a local Supabase. Add supabase/tests/meal_posts.sql for the meal_posts and meal-photos policies.
  - Effort: 2 hours.
- **A10. Supabase origin, key and fork host are written in several places**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `api/_auth.mjs:5-6, src/utils/supabaseClient.ts:14-15, src/utils/offlineOnly.ts:8, vercel.json:23, src/utils/programsHost.ts:1, src/utils/apiUrl.native.ts:2`
  - Scenario: The Supabase project URL is in four files and the publishable key in two. The fork host https://lifts.paulbebear.com is in programsHost.ts, apiUrl.native.ts and webpack.config.js. Moving the project means editing each copy, and a missed one fails only at run time.
  - Fix: Keep Supabase_origin and the key in one shared module that api/_auth.mjs and src/utils/supabaseClient.ts both import. Make OfflineOnly_allowedOrigins and apiUrl.native.ts import Supabase_origin and ProgramsHost_fork.
  - Effort: 0.5 hours.
- **A11. Sign-in texts and PKCE helpers are copied**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `api/account/delete.mjs:12, src/models/accountDeletion.ts:4, src/models/oauthFlow.ts:111, src/models/nativeIdTokenSignIn.ts:15, src/utils/supabaseOAuth.native.ts:71, src/utils/supabaseOAuth.ts:32-33, src/utils/spotifyLoginPlatform.ts:13-16, src/utils/spotifyLoginPlatform.native.ts:20-22, src/utils/randomBytes.ts:6-19`
  - Scenario: 'Sign in again, then delete the account.' is in the route and the model. The client ignores the server copy on 401. 'Sign-in did not finish. Try again.' is in three files. The web Supabase and Spotify logins each build a verifier and challenge by hand, while SpotifyAuth_codeChallenge already does it. spotifyLoginPlatform.native.ts has its own Math.random randomBytes, a copy of RandomBytes_get.
  - Fix: Export one sign-in failed text from oauthFlow.ts and import it. Drop AccountDelete_signInMessage text from the route or import it. Add one Pkce_pair helper used by both logins. Use RandomBytes_get in spotifyLoginPlatform.native.ts.
  - Effort: 1 hours.
- **A12. Comments promise privacy the code does not give**
  - Severity: low. Seen. Kind: name.
  - File and line: `supabase/migrations/20261021120000_friends.sql:1-3, supabase/migrations/20261022120000_meal_posts.sql:70, src/models/mealPost.ts:31, src/utils/randomBytes.ts:5`
  - Scenario: friends.sql says strangers never see each other's user id. After one request_friend call, the requester reads the other user_id in friendships and profiles, and friendsClient.ts selects it. meal_posts.sql and MealPost_newId say the post id comes from crypto.getRandomValues and cannot be guessed. On iPhone RandomBytes_get falls back to Math.random. The meal-photos read rule is what protects the photo, so no data leaks today. A future change that trusts these comments could leak.
  - Fix: Rewrite the three comments to say what holds: user ids are visible to anyone in a friendship row, and the meal-photos select policy gates photos, not the id. Or add react-native-get-random-values so the ids are random.
  - Effort: 0.25 hours.
- **A13. Shared helpers carry the wrong feature in their names**
  - Severity: low. Seen. Kind: name.
  - File and line: `api/_auth.mjs:12, src/models/spotifyAuth.ts:30-37, supabase/migrations/20261027000003_request_friend_limit.sql:2`
  - Scenario: AiAuth_bearerToken is the general token parser and account delete uses it. SpotifyAuth_randomString and SpotifyAuth_base64Url build the Supabase PKCE verifier. profile_lookup_usage now also counts friend requests in its requests column.
  - Fix: Rename AiAuth_bearerToken to Auth_bearerToken. Move the two Spotify helpers to a pkce.ts module. Leave the table name, or rename it to friend_usage in a migration.
  - Effort: 0.5 hours.
- **A14. appleSignIn and googleSignIn flags are always true**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/utils/forkServices.ts:34-35, src/utils/supabaseOAuth.native.ts:26, src/utils/supabaseOAuth.native.ts:44`
  - Scenario: ForkServices_plan returns appleSignIn: true and googleSignIn: true for every input. The checks in appleCredential and googleCredential can never fail on them.
  - Fix: Remove both fields from ForkServices_plan and the two checks, or base them on a real condition.
  - Effort: 0.25 hours.
- **A15. The web OAuth adapter has no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/utils/supabaseOAuth.ts:24-78`
  - Scenario: SupabaseOAuth_start and SupabaseOAuth_finishReturn store and clear the pending verifier and save signInError. Only the native adapter has a test (test/supabaseOAuthNative.test.ts). A change that forgets to clear pending, or saves the error before the exchange, passes CI.
  - Fix: Add test/supabaseOAuth.test.ts with stubs for CloudStore, fetch and window.location, covering a good return, an expired pending and a failed exchange.
  - Effort: 1 hours.

## Findings from the 26 October audit

- M1: fixed. fb6bae79. supabase/migrations/20261027000000_ai_allowance_limits.sql:3 drops the zero-argument ai_usage_take(). Lines 81-86 cap reports at 10 per user per day, and the share rule bounds one user. No later migration grants it back.
- P2: fixed. 50a2e63f. AccountDeletion_subscriptionNote in src/models/accountDeletion.ts:27-34 feeds the note and Manage subscription button in src/components/cloudBackupCard.tsx:206-221. api/account/delete.mjs:80-93 deletes the RevenueCat customer.
- P4: partly fixed. 1fad4acf limited backup names (20261027000002_backups_object_names.sql). bbdb7502 then added photos/[0-9]+.jpg with no count limit and a 50 MB file limit (20261027120000_backups_photos.sql:7-22). Meal photos with no post are still unlimited. Listed in findings.
- P6: open. No uptime check or log note in the repo since 2fd8e74b. Listed in findings.
- P7/S4: open. api/food/search.mjs, barcode.mjs and usda.mjs have no token check, and vercel.json has no rate limit. A dashboard firewall rule may exist, but nothing in the repo shows it. Listed in findings.
- P7/S8: fixed. 1fad4acf. supabase/migrations/20261027000003_request_friend_limit.sql:39-46 counts 20 new requests a day in profile_lookup_usage.requests. Tested in supabase/tests/abuse_limits.sql:81-96.
- P7/S9: fixed. 7c4df62e. api/moderation/report.mjs takes the post_reports webhook and emails the owner through Resend. docs/moderation.md describes the dashboard webhook. The dashboard step was not checked.

## Checked with no finding

- Every table in my migrations has row level security on, and grants are column-limited: profiles, friendships, workout_posts, post_reports, user_blocks, profile_lookup_usage, meal_posts, waitlist.
- friendships has no insert grant. Rows come only through request_friend, and the addressee can change only status from pending to accepted.
- post_reports insert checks run under the reporter's row rules, so a report can name only a post the reporter can read, never their own.
- Blocks delete the friendship (remove_blocked_friendship) and stop a new one, including inside the security definer request_friend (reject_blocked_friendship).
- meal-photos read rule goes through a meal_posts row the reader can see, and photo_path is fixed to <user_id>/<id>.jpg.
- request_friend PT429 errcode is not caught by the raise_exception handler, so the limit message reaches the caller. A failed call rolls the counter back.
- find_profile and request_friend execute is revoked from public and anon.
- waitlist: anon holds only insert on three columns, and nobody can read it.
- AiAuth_check sends the user token to ai_usage_take, so Supabase checks signature and expiry. 401 and 403 map to the sign-in message.
- api/account/delete.mjs checks the token with /auth/v1/user before any delete and deletes storage before the auth user.
- Native Apple sign-in sends the raw nonce from the SDK, and Google config checks the reversed client id URL scheme.
- Web PKCE: the ?auth=supabase marker keeps Spotify returns apart, the verifier expires after 10 minutes and is cleared before the exchange.
- Sha256_digest matches the empty, abc and RFC 7636 test vectors in test/spotifyAuth.test.ts.
- OfflineOnly_isRequestAllowed allows only the page origin, Spotify and the Supabase project, the same hosts as the vercel.json connect-src.
- AiConsent_parse falls back to unknown for any bad stored value, and a failed save of Allow falls back to declined.
- All 18 related mocha files pass: oauthFlow, nativeIdTokenSignIn, aiAuth, accountDeleteApi, accountDeletion, aiConsent, aiConsentClient, aiConsentPrompt, supabaseClient, supabaseOAuthNative, offlineOnly, forkServices, randomBytes, apiUrl, bundleNames, programsHost, appBrand, spotifyAuth.
