# App Store checklist for beBEAR V1

Status on 2026-10-23: the release script builds a signed `.ipa`. The upload waits for the App Store Connect app record for `com.paulbebear.bebear`, which does not exist yet.

V1 ships with no paywall. Tracking is free. AI runs under the caps in `api/_auth.mjs`: 3 uses a day, 10 a week. beBEAR+ billing comes in a later release. Until then the owner grants beBEAR+ by hand, as the section on making someone beBEAR+ shows.

Anton Astashov agreed to the release on 2026-10-21. His one condition was to stop using Liftosaur's exercise images and servers, which the fork already did.

## Release path

The app ships from Victor Backouche's Individual team `GKY9GR7VHG`. The owner is an App Store Connect Admin.

1. Create the app record by hand. App Store Connect, Apps, +, New App. Platform iOS, name beBEAR, primary language English (U.S.), bundle ID `com.paulbebear.bebear`, SKU `bebear`, full access.
2. Check the version. `MARKETING_VERSION` is `124` in `ios/Liftosaur.xcodeproj/project.pbxproj`, the upstream Liftosaur number. The store shows it as "Version 124". Change it to `1.0` in all 8 build configurations before the first upload if the owner wants that. App Store Connect never accepts a lower version after the first one.
3. Run a TestFlight upload: `./scripts/release-ios-production.sh --testflight`.
4. Each later upload needs a higher `CURRENT_PROJECT_VERSION`. The script reads the last uploaded build number from App Store Connect and stops early when the number is not higher.
5. Submit for review: `./scripts/release-ios-production.sh` asks for release notes, uploads, waits for processing, and submits. `--no-submit` stops before the submission. `--skip-build` submits a build that is already uploaded.

What the script does:

- It reads `ASC_KEY_ID` and `ASC_ISSUER_ID` from `~/.appstoreconnect/bebear.env`. The key file is `~/.appstoreconnect/private_keys/AuthKey_3MV54P3QWH.p8`.
- It asks `scripts/ios-signing.ts app <version>` whether the app record exists and which build was uploaded last.
- It runs `scripts/ios-signing.ts profiles appstore`. That deletes and recreates the 4 App Store profiles (app, widget, watch app, complication) through the API and installs them.
- It archives with manual signing, `Apple Distribution` and the `BEBEAR_PROFILE_<target>` settings from `scripts/ios-signing.ts build-settings appstore`. `xcodebuild -authenticationKeyPath` rejects this key on Xcode 26.6, so the script never passes the key to `xcodebuild`.
- It exports the `.ipa` to `ios/build/archive/export/` with the plist from `scripts/ios-signing.ts export-options export`.
- It uploads with `xcrun altool --upload-package` and the same API key.
- `--dry-run` stops after the export and changes nothing in App Store Connect.

A fresh worktree needs `localdomain.js` and `ios/.xcode.env.local` copied from the main checkout, and `pod install` in `ios/` with `LANG=en_US.UTF-8`. Without the locale, CocoaPods 1.16 on Ruby 4 fails with `Unicode Normalization not appropriate for ASCII-8BIT`.

## Privacy nutrition label

These answers come from the code on 2026-10-23. Every native build is offline (`ForkOfflineOnly` in `ios/Liftosaur/Info.plist`, `__OFFLINE_ONLY__` from `babel.config.js`). `ForkServices_plan` in `src/utils/forkServices.ts` then turns off Rollbar, AppsFlyer, telemetry, push, OTA updates and upstream login. No request goes to liftosaur.com.

Everything below happens only after the user opts in: they sign in, back up, share a post, allow AI or connect Spotify. Tracking and food logging alone send nothing that names the user.

### Data used to track you

None. The app shows no ads. It has no `NSUserTrackingUsageDescription` and never asks for tracking permission.

### Data linked to you

Purpose for every row: App Functionality. No row is used for analytics, ads or product personalization.

- Contact Info, Email Address. Supabase Auth stores it for email-code, Apple or Google sign-in.
- Contact Info, Name. Friends use a display name and a handle the user picks, stored in the Supabase `profiles` table.
- Identifiers, User ID. The Supabase user id keys the backups, posts and AI counters.
- Health & Fitness, Health. Bodyweight, body fat, waist, sleep, calories and protein read from Apple Health go into the cloud backup in the Supabase `backups` bucket.
- Health & Fitness, Fitness. Workouts, steps and run logs go into the cloud backup. A shared workout post holds the program and day name, duration, volume, top sets and PRs.
- Location, Precise Location. Run routes with GPS points go into the cloud backup.
- User Content, Photos or Videos. Meal posts upload a photo to the `meal-photos` bucket. The backup holds small thumbnails of filmed sets. AI features send a meal, label or body scan photo, or onboarding screenshots.
- User Content, Other User Content. Food log, notes, meal post text, report notes, onboarding answers, and the workout summary sent for an AI report.
- Other Data. Spotify listening history in the backup, with tokens stripped.

### Data not linked to you

None to declare. Barcode and food search text go through `api/food/*.mjs` to Open Food Facts and USDA FoodData Central. That route sends no user id, and the server does not keep the query.

### Data not collected

Usage Data, Diagnostics, Purchases, Financial Info, Browsing History, Search History, Contacts, Sensitive Info and Audio are not collected. Heart rate from the watch stays in memory on the device.

### Third parties

- Supabase (project `qvqwvuuwfueccrmzwyct`): accounts, backups, friends, feed, reports and AI counters.
- Vercel: hosts `lifts.paulbebear.com` and the `api/` functions.
- Google Gemini (`gemini-flash-lite-latest` when `GEMINI_API_KEY` is set), otherwise Anthropic Claude through Vercel AI Gateway: AI answers in `api/_ai.mjs`. The request body holds the prompt and images only, with no user id or email. The app does not use OpenAI.
- Open Food Facts and USDA: food lookups with no user id.
- Spotify: the user's own Spotify account, after they connect it.
- Apple and Google: sign-in. Only the ID token goes on to Supabase.

### Fixed on this branch

- `lg` in `src/utils/posthog.ts` posted app events to `lifts.paulbebear.com/api/event` even in the offline build, with the user id, device model and iOS version. That endpoint does not exist, so the requests failed with 404, but the data still left the phone. `lg` now checks `ForkServices_plan(...).telemetry` first, so the offline build sends nothing.
- `api/account/delete.mjs` deleted the `backups` bucket and the auth user but left the `meal-photos` objects. It now deletes both buckets before the auth user.

### Still to settle before review

- The phone app still links the AppsFlyer and Google Ads on-device conversion SDKs (`ios/Podfile`), and `Info.plist` lists about 50 `SKAdNetworkItems`. The offline build never starts them. `SceneDelegate.swift` still calls `AppsFlyerLib.handleOpen` without the offline check. App Review reads the privacy manifests of linked SDKs, so removing both pods and the SKAdNetwork entries is safer than explaining them.
- `ios/Liftosaur/PrivacyInfo.xcprivacy` declares no collected data types. Add the rows above so the manifest matches the label.
- The privacy policy at `https://lifts.paulbebear.com/privacy.html` says sign-in uses an email code. It does not mention Apple or Google sign-in. Check that it covers meal posts with photos and the body scan photo sent to AI.
- Check which AI provider production uses and how long it keeps prompts. Vercel AI Gateway offers zero data retention.

## Usage descriptions

The phone app strings live in `ios/Liftosaur/Info.plist`. `$(APP_DISPLAY_NAME)` becomes `beBEAR` from `ios/AppBranding.xcconfig`.

- `NSCameraUsageDescription`: "beBEAR uses your camera to film sets, take progress and food photos, scan barcodes and nutrition labels, and create workout share backgrounds."
- `NSPhotoLibraryUsageDescription`: "beBEAR uses photos and videos you choose for progress photos, filmed sets, food and nutrition label scans, and workout share backgrounds."
- `NSPhotoLibraryAddUsageDescription`: "beBEAR saves workout share images and filmed sets to your photo library when you choose to save them."
- `NSHealthShareUsageDescription`: "beBEAR reads your bodyweight, body fat, waist, sleep, steps, and nutrition (calories and protein) from Apple Health to show them alongside your workouts."
- `NSHealthUpdateUsageDescription`: "beBEAR writes your bodyweight, body fat, and waist measurements, plus completed workouts and their active energy, to Apple Health."
- `NSLocationWhenInUseUsageDescription`: "beBEAR uses your location while recording a run to calculate distance, pace, splits, and your route."

The watch app strings live in `ios/LiftosaurWatch/Info.plist` and the `INFOPLIST_KEY_NSHealthShareUsageDescription` build setting. They said "App will sync this data with Apple Health" with read and write swapped. This branch fixes them:

- `NSHealthShareUsageDescription`: "beBEAR reads your heart rate and active energy from Apple Health during a workout to show them on the watch."
- `NSHealthUpdateUsageDescription`: "beBEAR saves your completed workouts and their active energy to Apple Health."

`ITSAppUsesNonExemptEncryption` is `false` in both plists, so App Store Connect asks no export compliance question.

The phone `Info.plist` still carries upstream's AppsFlyer entries: `NSAdvertisingAttributionReportEndpoint` set to `https://appsflyer-skadnetwork.com/` and a `SKAdNetworkItems` list. They only matter if an ad network SDK runs. See the tracking answer in the privacy section.

## Age rating

Answer the questionnaire with these facts:

- Violence, sexual content, nudity, profanity, horror, gambling, contests: none.
- Alcohol, tobacco or drug references: none. The food log can hold any food name a user types, but the app shows no such content itself.
- Medical or treatment information: none. The app shows body fat estimates and nutrition totals, which are fitness data.
- Health or wellness topics: yes. Training, nutrition, bodyweight and body measurements are the core of the app.
- Unrestricted web access: no. Links open fixed pages: the privacy policy, terms, licenses, docs and GitHub.
- User-generated content: yes. Friends see each other's shared workout posts, meal posts with photos, handles and display names. Posts are visible only to accepted friends (`supabase/migrations/20261021130000_workout_posts.sql`).
- Messaging or chat: no. There are no comments or messages between users. A report note goes only to the developer.
- Advertising: no.
- Parental controls and age assurance: no.

App Store Connect computes the rating from these answers. The target audience is 16 to 23, so a 13+ or 16+ result is fine. An 18+ result means an answer is wrong.

## Guideline checks

- 3.1.1, codes outside in-app purchase. The "Enter a code" field for beBEAR+ `pro_codes` shows only when `StoreBuild_showsProCodes` in `src/models/storeBuild.ts` allows it. On iOS that is a TestFlight or dev install, where the receipt file is named `sandboxReceipt`. An App Store install has a receipt named `receipt`, so the field is hidden. The native constant `receiptName` comes from `ios/Liftosaur/RCTBebearSignInConfig.mm`. An account that already has the plus plan still sees the line "beBEAR+: 30 AI uses a day, 150 a week." It unlocks nothing new.
- 3.1.1, upstream subscription screen. `src/components/screenSubscription.tsx` has a "Redeem coupon" button. `Subscriptions_hasSubscription` in `src/utils/subscriptions.ts` returns true for the fork, so `Thunk_pushScreen` never redirects to that screen. On iOS its button opens Apple's own offer code sheet.
- 4.8, Sign in with Apple. The app offers Google sign-in, so it must offer Apple sign-in too. Both ship since the commit "S2: native Apple and Google sign-in".
- 5.1.1(v), account deletion. Settings, the cloud backup card, Delete account. The card types `DELETE` to confirm and calls `CloudBackupClient_deleteAccount` in `src/utils/cloudBackupClient.ts`, which posts to `/api/account/delete`. `api/account/delete.mjs` removes the cloud backups, then the Supabase auth user. Every user table cascades from `auth.users`. The card renders through `SettingsBackupRows` in `src/components/settingsForkRows.tsx` whenever `OfflineOnly_isEnabled()` is true, which `babel.config.js` makes true for every native build.
- 5.1.2(i), AI consent. Every AI call goes through `AiRequest_post` in `src/utils/aiRequest.ts`. It calls `AiConsent_ensure` first and checks the stored answer again before the `fetch`. Meal photo, nutrition label, Describe and body scan all reach it through `askAiAnswer` in `src/utils/foodApi.ts`. Warmup, workout report and the onboarding chat call `AiRequest_post` directly. The prompt text is `AiConsent_disclosure` in `src/models/aiConsent.ts` and names Google Gemini and Anthropic Claude. Settings has "Change AI permission".
- 1.2, user-generated content. Each feed post has "Report post" and "Block user" in `src/components/feedPostMenu.tsx`. Reports land in Supabase for the developer. The support address `support@paulbebear.com` is in Settings. The owner has to act on reports within 24 hours. Review may still ask for terms the user accepts before posting. The app has no such step yet.
- 2.5.1 and 5.1.3, HealthKit. Health values are used only inside the app and in the user's own backup. The App Store description must mention Apple Health.

## How to make someone beBEAR+

V1 has no in-app purchase. The owner grants beBEAR+ on the server, and the app only reads the plan from `account_plans`.

1. The person signs in once in the app, so Supabase has their account.
2. Open the Supabase dashboard, SQL Editor, and run this with their email:

```sql
insert into public.account_plans (user_id, plan, updated_at)
select id, 'plus', now() from auth.users where email = 'friend@example.com'
on conflict (user_id) do update set plan = 'plus', updated_at = now();
```

3. "INSERT 0 1" means it worked. "INSERT 0 0" means no account has that email yet.
4. The person sees "beBEAR+: 30 AI uses a day, 150 a week." in Settings the next time the cloud backup card loads.

To take it back, run the same statement with `'free'` in both places.

An Apple sign-in with "Hide My Email" stores a `privaterelay.appleid.com` address. Ask the person for the address shown in the cloud backup card.

## Review notes for App Review

- No account is needed to track workouts, food and runs.
- Cloud backup, friends and AI need an account. Sign in with Apple works for the reviewer. Email sign-in sends a one-time code, which a reviewer cannot read, so do not offer it as the demo path.
- AI features ask for consent before the first use. They are capped at 3 uses a day and 10 a week.
- The Apple Watch app and the workout Live Activity mirror the current workout.

## User-visible Liftosaur strings

Checked on 2026-10-23 in the native screens, the watch app, the widget and the plists.

- App, widget, watch and complication display names all come from `APP_DISPLAY_NAME = beBEAR`.
- Swift code in `ios/` has no user-visible "Liftosaur" literal. The remaining ones are module names, log text, storage keys and the upstream `com.liftosaur.*` identifiers.
- Generated docs and release notes pass through `AppBrand_text` in `src/models/appBrand.ts`.
- Settings keeps "beBEAR is based on Liftosaur by Anton Astashov (AGPL-3.0)". The AGPL attribution needs it.
- Settings still links "📍 Roadmap" to `github.com/astashov/liftosaur/discussions`, upstream's roadmap.
- The "How did you hear about us" survey in `src/components/hearAboutUs/hearAboutUsConfig.ts` lists `r/liftosaur` as a subreddit. It names a real subreddit, so this branch leaves it. Drop the option if review objects to the name of another app.
- Web pages under `src/pages/` still say Liftosaur. They are not in the iOS build.
