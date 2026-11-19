# Phase 1 findings: Security across all slices

Slice `security` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Opus. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 1 high, 3 medium, 6 low. 0 dropped by the checker.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## High

- **S1. Delete account leaves progress photos in the cloud backup**
  - Severity: high. Seen. Kind: security.
  - File and line: `api/account/delete.mjs:54-78, test/accountDeleteApi.test.ts:51-59, supabase/migrations/20261027120000_backups_photos.sql`
  - Scenario: A user backs up progress photos to <uid>/photos/<id>.jpg. They tap Delete account. The route lists the backups bucket with prefix <uid> only. Supabase lists one folder level, so "photos" comes back as a folder with id null. AccountDelete_objectPaths drops it. Only the JSON files are deleted. The photo files stay in storage after the auth user is gone, or the auth delete fails because the user still owns objects. The privacy text promises the account and backups go right away.
  - Fix: In api/account/delete.mjs, also list and delete the prefix <uid>/photos, paging past 1000. Better: list recursively until no folders remain. Add a test with a photos folder in the listing.
  - Effort: 1 hours.
  - Checker: keep. api/account/delete.mjs lists only the top level under <uid>, AccountDelete_objectPaths drops the id-null 'photos' folder (the test even asserts folders are skipped), while src/models/progressPhotos.ts uploads to <uid>/photos/<id>.jpg, so photo files outlive the account.

## Medium

- **S2. Any signed-in user can still fill the shared storage**
  - Severity: medium. Seen. Kind: security. Still open from the 26 October audit: P4.
  - File and line: `supabase/migrations/20261027120000_backups_photos.sql:7-22, supabase/migrations/20261020202617_backups_bucket.sql:2, supabase/migrations/20261022120000_meal_posts.sql:78-83`
  - Scenario: The backups insert rule now allows <uid>/photos/<any digits>.jpg with no count limit. The bucket limit is 50 MB per file for JPEG too, and the MIME type is only the header the client sends. A script uploads photos/1.jpg, photos/2.jpg and so on at 50 MB each. Twenty files fill the free plan's 1 GB, and backups fail for every user. Meal photos can also be uploaded with no post, 2 MB each, with any uuid.
  - Fix: Give JPEGs in backups their own bucket with a 2 MB limit. Cap photo count per user, for example with a check in a storage insert trigger that counts objects under <uid>/photos. Delete meal photos that have no meal_posts row after a day.
  - Effort: 2 hours.
  - Checker: keep. The backups insert policy allows unlimited <uid>/photos/<digits>.jpg names, the bucket keeps its 52428800-byte file limit with image/jpeg added, and meal-photos accepts any uuid-shaped name with no post check, so one signed-in user can fill shared storage.
- **S3. A few free accounts can still use up the free AI ceiling for everyone**
  - Severity: medium. Seen. Kind: security. Still open from the 26 October audit: M1.
  - File and line: `supabase/migrations/20261027000000_ai_allowance_limits.sql:54-64,73-79`
  - Scenario: ai_usage_take still takes p_caps from the caller. A user posts to /rest/v1/rpc/ai_usage_take with their own token and p_caps {"day":1000,"week":1000}. Each call counts toward the day total with no AI cost. The share rule stops one user at max(50, total/10). About 12 email accounts reach the 600 ceiling. Every free user then gets "The app's daily AI allowance is used up" until 00:00 UTC. beBEAR+ users skip the ceiling now, so they are safe.
  - Fix: Read the caps inside ai_usage_take from public.ai_settings instead of p_caps, and ignore p_caps. Or revoke execute from authenticated and call the RPC from the API with the service key and the user id.
  - Effort: 1.5 hours.
  - Checker: keep. ai_usage_take is granted to authenticated and reads caps from caller-supplied p_caps (the migration comment admits it), so direct RPC calls count toward total_today and a dozen accounts under the share rule can reach the 600 ceiling that blocks all non-plus users.
- **S4. The privacy policy does not match where photos and body data now go**
  - Severity: medium. Seen. Kind: security.
  - File and line: `src/privacy.html`
  - Scenario: The policy says progress photos are not in the backup and at most 8 files are kept. Progress photos now upload to Supabase at <uid>/photos. The feed section names only workout posts, but meal posts with photos and macros go to friends. The AI list leaves out body-scan printouts and nutrition labels sent by api/food/photo.mjs. The processor list leaves out RevenueCat (user id and purchases) and Resend (report notes and post text). Sign-in mentions only email codes, not Apple and Google.
  - Fix: Update src/privacy.html: progress photos in backup, meal posts and photos, body scan and label scans to AI, RevenueCat, Resend, Apple and Google sign-in. Change the "Last updated" date.
  - Effort: 0.75 hours.
  - Checker: keep. src/privacy.html (last updated October 21, 2026) says progress photos are not in the backup and at most 8 files, mentions only email-code sign-in, lists no RevenueCat or Resend, and omits meal posts and label scans, all of which the code now does.

## Low

- **S5. Food search, barcode and USDA routes need no sign-in or rate limit**
  - Severity: low. Seen. Kind: security. Still open from the 26 October audit: S4 (P7).
  - File and line: `api/food/search.mjs:3-18, api/food/barcode.mjs:3-24, api/food/usda.mjs:16-44`
  - Scenario: Anyone can loop GET /api/food/search. Open Food Facts can block the fork's User-Agent, and the USDA key gets rate limited. Food search then fails for every user.
  - Fix: Add a Vercel Firewall rate limit per IP on /api/food/*.
  - Effort: 0.5 hours.
- **S6. USDA lookup still falls back to the shared demo key**
  - Severity: low. Suspect. Kind: security. Still open from the 26 October audit: P3.
  - File and line: `api/food/usda.mjs:3-4`
  - Scenario: The code still uses DEMO_KEY when FDC_API_KEY is missing. The Vercel env was not read in this pass. If the key is still named data_gov, US barcodes that Open Food Facts lacks fail after about 30 calls an hour.
  - Fix: Set FDC_API_KEY in Vercel production and check with vercel env ls.
  - Effort: 0.1 hours.
- **S7. Teen photos and body numbers reach the AI provider with no zero data retention**
  - Severity: low. Suspect. Kind: security. Still open from the 26 October audit: P5.
  - File and line: `api/_ai.mjs:58-72, api/food/photo.mjs:73-89, api/ai/onboard.mjs:93-102`
  - Scenario: Body-composition printouts, meal photos, age, height and weight go through the Vercel AI Gateway to Anthropic. Zero data retention is deferred until revenue. The privacy text names the provider, but the target users are 16 to 23.
  - Fix: Turn on per-request zero data retention in api/_ai.mjs when the plan allows it. Name body scans in the AI consent text.
  - Effort: 0.5 hours.
- **S8. The POST 404 window has no check that would catch it again**
  - Severity: low. Suspect. Kind: security. Still open from the 26 October audit: P6.
  - File and line: `vercel.json`
  - Scenario: On 2026-10-26 every POST route answered NOT_FOUND for a minute. No code or uptime check was added. The next time, AI scans, purchase sync and account deletion fail with no alert.
  - Fix: Add an uptime check that posts {} to /api/ai/report and expects 400.
  - Effort: 0.5 hours.
- **S9. The content security policy sets only connect-src**
  - Severity: low. Seen. Kind: security.
  - File and line: `vercel.json:22-23`
  - Scenario: The header has connect-src and frame-ancestors only. connect-src matches the hosts the PWA calls: self, the Supabase project, api.spotify.com and accounts.spotify.com. With no script-src or default-src, an injected script from any host would run.
  - Fix: Add default-src 'self', script-src 'self' plus appleid.cdn-apple.com, and img-src for Open Food Facts images, data: and blob:. Test the PWA after.
  - Effort: 1 hours.
- **S10. Two audited packages run in shipped code**
  - Severity: low. Suspect. Kind: security.
  - File and line: `src/components/simpleMarkdown.tsx:4, src/components/markdown.tsx:3, api/_ai.mjs:1`
  - Scenario: markdown-it and linkify-it (high, quadratic DoS) render program text in the app, so a pasted program with crafted text can freeze the user's own screen. @vercel/oidc pulls @vercel/cli-config and zod (high) into api/_ai.mjs, but no request data reaches zod. query-string via @react-navigation/core parses deep links, which offline builds turn off. Every other high or critical package is used only by build tools, metro, scripts or Anton's lambda.
  - Fix: Run npm audit fix for markdown-it, linkify-it and @vercel/oidc, then run the markdown tests.
  - Effort: 0.5 hours.

## Findings from the 26 October audit

- M1: partly fixed. The zero-argument ai_usage_take is dropped, reports are capped at 10 a day, and plus users skip the ceiling. p_caps still comes from the caller, so about 12 free accounts can reach the ceiling.
- M2: fixed. The ceiling lives in public.ai_settings. Plus users skip it, and AiAuth_ceilingNotice logs at 80 percent.
- M3: fixed. Billing_entitlementRow gives a sandbox grant an end date 7 days after the snapshot. Migration 20261027000000 ends the old lifetime sandbox rows.
- M4: fixed. redeem_pro_code counts wrong codes in pro_code_attempts and stops at 10 a day.
- P1: fixed. CloudBackup_ownerCheck and ownerAllows in src/ducks/cloudBackupThunks.ts ask before uploading to a different account.
- P2: fixed. AccountDeletion_subscriptionNote shows in cloudBackupCard.tsx with Manage subscription. api/account/delete.mjs deletes the RevenueCat customer.
- P3: open. The code still falls back to DEMO_KEY. The Vercel env was not read in this pass.
- P4: partly fixed. Backup JSON names are limited, but photos/<digits>.jpg has no count limit at 50 MB each. Meal photos can still be uploaded with no post.
- P5: open. Zero data retention is deferred. The privacy text names the provider but not body scans.
- P6: open. No code. No uptime check was added.
- P7: partly fixed. S8 and S9 are fixed. S4 is open.
- S4: open. The food routes still answer without a token. vercel.json has no rate limit.
- S8: fixed. request_friend counts 20 new requests a day in profile_lookup_usage.requests.
- S9: fixed. api/moderation/report.mjs emails each report through Resend. The Supabase webhook lives in the dashboard and was not checked.

## Checked with no finding

- Point 1: each AI route calls AiAuth_check before calling the AI. billing/sync and account/delete read the user from /auth/v1/user. revenuecat and moderation/report compare a webhook secret in constant time. Only the three food GET routes are open (S4).
- Point 2: all 16 public tables have row level security on. Each policy limits a user to their own rows or to accepted friends' posts. The live pg_policies, buckets and function grants match the migrations one for one.
- Point 2: anon can run no function and can only insert into waitlist. authenticated can run ai_usage_take(text,text,jsonb), find_profile, request_friend and redeem_pro_code. store_entitlement_put and account_plan_effective are service_role only. The private trigger functions are revoked from everyone.
- Point 2: meal_posts.photo_path is fixed to <user_id>/<id>.jpg, so a post cannot point at another user's photo. Friend reads go through the meal_posts policy.
- Point 3: no secret key is tracked in src, api, scripts, ios, vercel.json or app.json. The Supabase publishable key, the RevenueCat appl_ key and Anton's Rollbar client tokens are public by design. cert/private.key and ios codesigning.pem predate the fork.
- Point 4: request values reach SQL only as RPC parameters or URL-encoded PostgREST filters. No request value reaches a file path. AI prompt input is cut to fixed lengths, and the prompts say user text is data.
- Point 5: AI counts and storage paths come from the caller's own JWT uid. No route takes a user id from the body. p_caps abuse counts against the caller.
- Point 6: the connect-src hosts match what the PWA calls: self, the Supabase project and the Spotify API. Google Analytics, Rollbar and liftosaur.com sit only in Anton's server pages or are off in offline builds.
- Point 7: universal links are off in offline builds and accept only ProgramsHost_fork. Invite_fromUrl accepts one handle matching ^[a-z0-9_]{3,20}$ and never sends or accepts without a tap. ListenLinks_normalize allows only https and spotify: URIs. Liftoscript is parsed, never run as JS.
- Point 8: photos and body numbers go only to Supabase, the AI gateway and friends you accept. Spotify, Open Food Facts and USDA get no body data. The privacy text gaps are one finding.
- Point 9: aws-cdk-lib, axios, openai, form-data, jsonwebtoken, jws, sharp, shell-quote, ws, image-size, postcss, browserslist, picomatch, minimatch, brace-expansion, js-yaml, semver, y18n, fast-uri, uplot and prismjs run only in build tools, metro, scripts or Anton's lambda.
