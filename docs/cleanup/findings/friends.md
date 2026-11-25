# Phase 1 findings: Friends and feed

Slice `friends` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 3 medium, 8 low. 0 dropped by the checker.
Coverage: 53 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **N1. A shared meal can never be taken back**
  - Severity: medium. Seen. Kind: data.
  - File and line: `src/utils/feedClient.ts:67-82, src/models/feed.ts:13-16`
  - Scenario: User shares a meal photo with friends by mistake. The outbox has only a meal post op, no meal remove op. No code deletes meal_posts rows or the photo.
  - Fix: Add a meal remove op to IFeedOp. Send DELETE on meal_posts and the storage object in FeedClient send(). Add a Remove button to the meal post menu for isMine items. Test it in test/feedClient.test.ts.
  - Effort: 3 hours.
  - Checker: keep. IFeedOp has only a workout remove op, send() deletes only workout_posts, and nothing in src deletes meal_posts rows or meal photos, even though the migration grants the author delete.
- **N2. Invite a friend probably always fails in the native iOS app**
  - Severity: medium. Suspect. Kind: bug.
  - File and line: `src/utils/inviteClient.ts:132-151`
  - Scenario: On iPhone the Invite a friend button calls InviteClient_share. React Native has no navigator.share and no navigator.clipboard. The clipboard call throws, so the user sees the 'Could not share the link' message every time.
  - Fix: Add inviteClient.native.ts using the react-native Share.share API, or ClipboardUtils_copy from clipboard.native.tsx as the fallback. Test the result mapping.
  - Effort: 1.5 hours.
  - Checker: keep. screenFriends.tsx is mounted by AppNavigator.native.tsx and inviteClient.ts has no .native variant, so on React Native navigator.share is undefined, navigator.clipboard.writeText throws, and the result is always "failed".
- **N3. Report webhook is set up by hand and a failed mail is lost**
  - Severity: medium. Suspect. Kind: security. Still open from the 26 October audit: S9.
  - File and line: `api/moderation/report.mjs:32-73, docs/moderation.md`
  - Scenario: The route and mail builder exist and have tests. The Supabase hook on post_reports exists only as dashboard steps in docs/moderation.md, not in any migration. If it is missing, or Resend answers 503, nobody is told and the docs claim a retry that the repo cannot prove.
  - Fix: Create the hook as a migration with a trigger on post_reports insert. Check the live hook once. Correct the retry claim in docs/moderation.md, or add a retry.
  - Effort: 1 hours.
  - Checker: keep. No migration creates the post_reports hook (no pg_net or http_request in supabase/), and docs/moderation.md says Supabase retries a failed hook, but Supabase Database Webhooks run on pg_net with no retry, so a 503 drops the mail.

## Low

- **N4. Reporting or blocking twice shows a raw database error**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/utils/feedClient.ts:187-202, src/models/feedModeration.ts:80-85, src/utils/moderationCommand.ts`
  - Scenario: post_reports has a unique index on reporter and post. A second report of the same post returns a duplicate key error. FeedModeration_reportOutcome shows the server text, which names the index.
  - Fix: Map duplicate key text to 'You already reported this post' in FeedModeration_reportOutcome, like Friends_errorText does for handles. Add a test.
  - Effort: 0.5 hours.
- **N5. Friends tab reloads everything on every visit, one request after another**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/components/screenFriends.tsx:83-87, src/utils/friendsCommand.ts:30-41, src/models/feed.ts:223-225`
  - Scenario: Every focus of the tab runs loadBlocks, then friends load (2 requests), then feed refresh (up to 3 requests) in sequence. Feed_needsRefresh, the 10 minute gate, is never called.
  - Fix: Run loadBlocks and FriendsClient_load with Promise.all. Skip the feed refresh when Feed_needsRefresh is false, except for pull to refresh.
  - Effort: 1 hours.
- **N6. Unused prop, test-only function, unused staleness gate, stale comment**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/addFriendSheet.tsx:19-23, src/components/friendsPeople.tsx:16, api/_reportEmail.mjs:48-51, src/models/feed.ts:223`
  - Scenario: FriendsAdd never reads props.lists, and AddFriendModal passes fake empty lists. ReportEmail_parse is called only by tests. Feed_needsRefresh is called only by tests. The comment in friendsPeople.tsx about batch B1 is old.
  - Fix: Remove the lists prop from FriendsAdd. Point the tests at ReportEmail_classify and delete ReportEmail_parse. Use or delete Feed_needsRefresh. Delete the comment.
  - Effort: 0.5 hours.
- **N7. Handle pattern and the offline error text are written several times**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/invite.ts:11, src/models/friends.ts:29, src/models/invite.ts:128, src/utils/feedClient.ts:38, src/components/feedShareToggle.tsx:78, src/utils/supabaseClient.ts:37`
  - Scenario: Invite_parseHandle repeats the regex in friends.ts handlePattern. The text 'No connection' is a literal in four files. A change in one place breaks retry or hiding of the error elsewhere.
  - Fix: Export handlePattern from friends.ts. Export one Supabase_offline constant from supabaseClient.ts and use it in the other three.
  - Effort: 0.5 hours.
- **N8. Friends screen and add-friend sheet repeat the same wiring**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/screenFriends.tsx:73-93, src/components/addFriendSheet.tsx:76-91, src/components/screenFriends.tsx:35, src/components/addFriendSheet.tsx:25`
  - Scenario: Both components own a FriendsForm reducer, an effect that runs FriendsCommand_run, and an Invite share button with a share message. The input class string is also written in both.
  - Fix: Move the reducer plus effect into one hook, useFriendsForm. Move the invite button into one component.
  - Effort: 1.5 hours.
- **N9. Add-friend sheet picks its state and button label in the view**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/addFriendSheet.tsx:103-141`
  - Scenario: A three-way test on userId, hasLoaded and me chooses the body. A second ternary chooses the button label. CLAUDE.md puts such decisions in a pure module.
  - Fix: Add Friends_addSheetState(userId, hasLoaded, me) returning a kind and a button label in friends.ts, with a test.
  - Effort: 0.75 hours.
- **N10. Moderation filter and command modules have no tests**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/models/feedModeration.ts:58-66, src/utils/friendsCommand.ts, src/utils/moderationCommand.ts, src/utils/inviteClient.ts:132`
  - Scenario: FeedModeration_items, FriendsCommand_run, ModerationCommand_report, _block, _unblock and InviteClient_share are not in any test file. FeedModeration_items is what hides a blocked user's posts.
  - Fix: Add cases to test/feedModeration.test.ts for FeedModeration_items. Add test/friendsCommand.test.ts and test/moderationCommand.test.ts with stubbed clients and Dialog.
  - Effort: 2.5 hours.
- **N11. FeedModeration_items names a set of posts as ids**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/models/feedModeration.ts:59-65`
  - Scenario: The set holds post objects, not ids. It filters by object identity, which breaks if a caller copies a post.
  - Fix: Filter items by item.post.userId with the blocked user id set. Drop the nested FeedModeration_filter call.
  - Effort: 0.25 hours.

## Findings from the 26 October audit

- S8: fixed. supabase/migrations/20261027000003_request_friend_limit.sql adds a requests counter, 20 per day, in request_friend. Commit 1fad4acf. The PT429 error is not caught by the generic handler.
- S9: partly fixed. Commit 7c4df62e adds api/moderation/report.mjs, api/_reportEmail.mjs, tests and docs/moderation.md. The Supabase hook is a manual dashboard step, so the repo cannot prove it exists. Listed in findings.

## Checked with no finding

- request_friend migration: counter rolls back on a failed insert, blocked pair raises the generic error
- post_reports RLS and unique indexes cover workout and meal posts, reporter cannot report own post
- Billing_webhookAuthorized compares the header with timingSafeEqual and refuses a missing secret
- Block trigger deletes the friendship and reject_blocked_friendship stops a new one
- Sign-out clears FriendsStore, BlocksStore, FeedStore and InviteStore
- Feed_items hides posts from non-friends and Friends_forUser hides another account's cache
- Outbox is keyed by user, so a sign-in switch never posts under the other account
- MealPost_parse checks photo path against user and post id
- All 12 related test files pass, 118 tests
- pressFeedback.ts is web-only and installed from src/index.tsx; no problem found
- Invite reducer never accepts a request without an explicit tap
