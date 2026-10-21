# Handoff: fix App Store rejection risks

Branch `handoff-app-store`. Read `AGENTS.md` first and follow its rules: logic in pure modules with mocha tests, thin `.tsx` files, no AI attribution lines in commits. Do no simulator or browser testing; the user tests on an iPhone. Run `npx tsc --noEmit`, eslint on the changed files and the new tests, then open a PR against `master` with a short "Check on your iPhone" list.

## Goal

A friend will publish the iPhone app from their Apple developer account. Four things in the app today are known reasons App Review rejects an app. Fix them, and move the app name and bundle id into one place so the rename is one edit.

## 1. Report and block in the feed (Guideline 1.2)

Apple requires a way to report a post, block a user, and contact the developer in any app that shows other users' posts. The feed (PR #32) has none.

- **Where:** each post in `src/components/friendsFeed.tsx` gets a "⋯" menu with "Report post" and "Block user". People rows in `src/components/friendsPeople.tsx` get "Block user" too.
- **Report:** insert a row into a new Supabase table `post_reports`: reporter id, post id, reason (spam, abuse, other), optional note, time. Add a migration in `supabase/migrations/`, with RLS so a user can insert their own reports and cannot read anyone's. Show "Thanks, we'll review it" after.
- **Block:** a new table `user_blocks` (blocker id, blocked id, time). RLS: a user reads, inserts and deletes only their own rows. A blocked user's posts disappear from the feed right away, and blocking also removes the friendship. Settings lists blocked users with "Unblock".
- **Contact:** a "Contact us" line at the bottom of the feed that opens `mailto:` with the support address. Put the address in one constant; the user fills it in later.
- **Pure module:** `src/models/feedModeration.ts` owns the report reasons, filtering posts by a block list, and the menu items for a post (none on your own posts). Test it in `test/feedModeration.test.ts`. The clients in `src/utils/feedClient.ts` and `src/utils/friendsClient.ts` do the Supabase calls.

## 2. Consent before data goes to an AI provider (Guideline 5.1.2(i))

Since late 2025 Apple wants the app to name the third-party AI that gets personal data and to ask first. The food photo scan, Describe, the AI warmup, the report and onboarding all send data to Gemini or Claude with no prompt.

- **Gate:** every AI call goes through one check before it sends anything. The calls start in `src/utils/aiRequest.ts`, `src/utils/foodApi.ts` and `src/utils/warmupApi.ts`.
- **Sheet:** the first time, show a sheet: "AI features send your photo or text to Google Gemini or Anthropic Claude to get an answer. They are not used to identify you." Buttons "Allow" and "Not now". Nothing is sent before "Allow".
- **Choice:** store it, versioned, next to the cookie consent in `src/consent/consent.ts` or in its own key. "Not now" hides the AI buttons, with a way to turn them back on in Settings.
- **Pure module:** `src/models/aiConsent.ts` owns the stored shape, parsing, and "may this call send". Test it in `test/aiConsent.test.ts`.

## 3. Info.plist (Guideline 5.1.1)

- `ios/Liftosaur/Info.plist` has `NSLocationWhenInUseUsageDescription` set to an empty string. Nothing in `src/` or `ios/` uses location, so remove the key. If you find a real use, write a real purpose string instead.
- Add `ITSAppUsesNonExemptEncryption` = `false`. The app only uses HTTPS, so App Store Connect stops asking about export compliance on every upload.
- Rewrite the camera and photo library strings. Today they only mention share backgrounds; the fork also uses them for set filming and progress photos.

## 4. One place for the app name and bundle id (Guidelines 4.1 and 4.3)

The app is still "Liftosaur" with bundle id `com.liftosaur.www`. That id belongs to Liftosaur's owner, and an app branded as a copy of a listed app gets rejected. The user has not picked a name yet, so keep today's values and make the change one edit.

- **Targets:** the app, `LiftosaurWatch`, the watch complication and `LiftosaurWorkoutWidgetExtension` each set `PRODUCT_BUNDLE_IDENTIFIER` in `ios/Liftosaur.xcodeproj/project.pbxproj`. Move the prefix into an `.xcconfig` setting (for example `APP_BUNDLE_PREFIX`) and the display name into `APP_DISPLAY_NAME`, and use them in every target and `Info.plist`.
- **List every other place** that has to change for the rename in the PR body: App Group ids, entitlements, the URL scheme, the watch bundle download URL, `app.json`, and user-facing "Liftosaur" strings in the permission texts.

## 5. Check the paywall and report back

`src/App.native.tsx` and `src/utils/subscriptions` still run upstream's subscription code. Its products live in upstream's App Store Connect account, so they won't exist under the friend's account. Find out whether anything in this fork is locked behind a subscription. If it is, add one flag that turns the paywall off and unlocks everything, and default it to off. Write what you found in the PR body.

## Check on your iPhone list for the PR

- Open the feed, tap "⋯" on a friend's post, report it. Block them; their posts are gone. Unblock in Settings; they come back.
- Fresh install, tap AI Scan: the consent sheet shows before the camera. Tap "Not now"; the AI buttons are hidden. Turn AI back on in Settings.
- Settings shows no location permission request anywhere.
