# beBEARlifts on iPhone: native app plan

How to ship this fork as a native iPhone app on TestFlight. Written 2026-10-21 against master at `638c5dec`.

Status: step 1 of 14 is done (the native build compiles with the fork's tabs). The task list at the end has the rest.

## Why native

The PWA on lifts.paulbebear.com cannot read Apple Health, cannot talk to an Apple Watch, and stops running when the screen locks. Upstream Liftosaur is a bare React Native app (Fabric, New Architecture) that already has all three. The fork already shares that code, so the native app is mostly a matter of switching things off and pointing things at the fork's servers.

## How the build works

- Web: webpack builds `src/index.tsx`. `npm run build:pwa` sets `LFT_OFFLINE_ONLY=1`, and webpack's DefinePlugin turns `__OFFLINE_ONLY__` into `true`.
- Native: Xcode's "Bundle React Native code and images" phase runs Metro on `index.js`, which loads `index.native.ts` and `src/App.native.tsx`. Metro picks `foo.native.ts` over `foo.ts` when both exist. That is how every fork stub for native works.
- Native app shell: `src/App.native.tsx` is a separate shell from the web `src/components/app.tsx`. Anything mounted only in `app.tsx` (for example `MusicTracker`) does not run on native.
- Pods: `cd ios && RCT_USE_PREBUILT_RNCORE=1 RCT_NEW_ARCH_ENABLED=1 USE_FRAMEWORKS=static pod install`. It took 77 seconds here with a warm CocoaPods cache. It updates `ios/Podfile.lock` (Reanimated 4.3.0 to 4.5.5, to match `package-lock.json`).
- Watch JS: the iOS target embeds `dist/watch-bundle.js`. Build it first with `npm run build:watch-bundle`. That needs `localdomain.js`; run `npm run ensure:localdomain` once in a fresh checkout.

## The offline flag on native

`babel.config.js` now inlines `__OFFLINE_ONLY__` for Metro builds. Metro identifies itself to Babel as the caller `metro`, so the web build and the mocha tests do not see this plugin.

- Default: on. Xcode builds from the GUI carry no custom environment, so an archive gets the fork's offline app with no extra setup.
- Off: `LFT_OFFLINE_ONLY=0` builds upstream's online app. Metro caches transformed files, so start Metro with `--reset-cache` after changing the variable.

What the flag changes on native, all through `OfflineOnly_isEnabled()`:

- `Thunk_sync2` stops syncing to upstream's server.
- The Account, Nickname and API Keys rows leave Settings.
- The Friends tab replaces the Program tab. Program moves under Progress, as on the web.
- `lg()` in `src/utils/log.ts` sends no events. The signup prompt and "hear about us" prompt never show.
- Effort rating per set is on by default, and the weekly backup reminder runs.

The web build also installs `OfflineOnly_installFetchGuard`, which blocks every origin except Spotify and Supabase. Native has no such guard. Upstream calls that are not behind the flag still reach upstream's servers on native. The section on upstream services lists them.

## Fork features that use web-only code

Found with a grep for `Platform.OS === "web"`, `document`, `window`, `navigator.clipboard`, `navigator.share`, `html-to-image`, `localStorage` and `<input type="file">` over every file the fork added or changed since upstream commit `a7a402c2`.

Fixed in the first PR:

- Food, warmup and report API calls: `src/utils/foodApi.ts`, `src/utils/warmupApi.ts` and `src/utils/reportStore.ts` fetched relative `/api/...` paths. They now go through `ApiUrl_for`. The section on Vercel functions has the detail.
- Paste history from clipboard: `src/components/importerLiftosaurCsv.tsx` called `navigator.clipboard.readText()`, which does not exist on native. Native now reads through `ClipboardUtils_paste`, which uses `@react-native-clipboard/clipboard`. The web path is unchanged, because Safari only shows its Paste bubble when `readText` runs directly inside the tap.
- Backup reminder marks: `src/utils/backupReminderMarks.ts` keeps two timestamps in `localStorage`. Native has no `localStorage`, so the reminder would show after every workout once due. `backupReminderMarks.native.ts` keeps them in MMKV instead.
- Music screen: `SpotifyClient_takeError` read `localStorage` during render, which throws a ReferenceError on native and takes down the screen. It now returns nothing when `localStorage` is missing. The "Connect Spotify" button is replaced on native with a line that says login is not in the iPhone app yet.
- Native navigator: `src/navigation/AppNavigator.native.tsx` had no Friends tab and no Music, Reports or Body scans screens. The footer would show a Friends button with no screen behind it. The native navigator now mirrors the web one.

Already stubbed on native before this work (each `.native.tsx` file shows one line of text or renders nothing):

- Barcode scanner, `src/components/foodBarcodeScanner.tsx`: uses `@zxing/browser` and a `<video>` element. Native fix: `react-native-vision-camera` has a built-in code scanner that reads EAN-13, EAN-8, UPC-A and UPC-E. It is a new pod and needs a camera permission text. Size: 1 day, most of it testing scans on the phone.
- Plate photo, `src/components/foodPhotoPanel.tsx`, and nutrition label photo, `src/components/foodLabelPanel.tsx`: use `<input type="file">` and a canvas resize in `src/utils/imageResize.ts`. Native fix: `react-native-image-picker` is already installed (upstream uses it for share backgrounds). Its `maxWidth`, `maxHeight` and `includeBase64` options replace the canvas resize, and the result goes to the same `FoodApi_*` calls. Size: 4 hours for both panels.
- Story card, `src/components/workoutStoryCard.tsx`: draws HTML `<div>`s and turns them into a PNG with `html-to-image`. Native fix: rebuild the card from React Native views, capture it with `react-native-view-shot`, and share it with `react-native-share`. Both are installed. Size: 2 days, because the layout is CSS and every piece needs a native equivalent.

Hidden on native by an existing `Platform.OS === "web"` check:

- Food log import in `src/components/foodGoalsContent.tsx`: uses `<input type="file">`. Native fix: call `FileImport_pickFile` from `src/utils/fileImport`, which upstream already implements with `react-native-document-picker`. Size: 1 hour.

Not mounted on native:

- Music tracking, `src/components/musicTracker.tsx`: uses `document.visibilityState`, `window.setInterval` and the `visibilitychange` event. Only the web shell mounts it. Native fix: replace the visibility checks with React Native's `AppState`, which also works on the web through react-native-web, and mount it in `App.native.tsx`. Size: 2 hours. It is useless until Spotify login works on native.

Works on native with no change:

- Exports ("Export everything", food log, music log): `src/utils/exporter.ts` uses `navigator.share`, but upstream's `exporter.native.ts` takes over on native and opens the iOS share sheet.
- Cloud backup: `src/utils/cloudBackupClient.ts` calls the Supabase URL directly with `fetch`.
- Storage: every fork store goes through `JsonStore_create` and `IndexedDBUtils_*`, which upstream maps to MMKV on native.

## Vercel functions from the native app

The web app calls its own origin, so `fetch("/api/food/search")` reaches lifts.paulbebear.com. The native app has no origin, so a relative URL has no host.

`src/utils/apiUrl.ts` returns the path unchanged for the web. `src/utils/apiUrl.native.ts` prefixes `https://lifts.paulbebear.com`. Native `fetch` does not apply CORS, so the functions need no change. `vercel.json`'s Content-Security-Policy only applies to web pages.

The functions in `api/` check no origin and no key. Anyone who finds the URL can call `api/ai/warmup` and `api/ai/report`, which spend the fork's AI credit. That is true today for the web app too, and the native app does not change it. A shared secret in the app would not stop a determined caller, because anyone can read it from the app bundle.

## Spotify login on native

The web flow (`src/utils/spotifyClient.ts`) leaves the page for Spotify and comes back to `https://lifts.paulbebear.com/app/`. It keeps the PKCE verifier in `localStorage` and hashes it with `crypto.subtle`. None of those exist on native.

The native flow:

- Redirect URI: a custom URL scheme, `bebearlifts://spotify-callback`. Add it to `CFBundleURLTypes` in `ios/Liftosaur/Info.plist`. A universal link would also work, but it needs the Associated Domains capability, an `apple-app-site-association` file on lifts.paulbebear.com, and the friend's team ID in that file. The custom scheme needs none of that.
- Spotify dashboard: add `bebearlifts://spotify-callback` as a second redirect URI for client ID `3eaf01f171e440139aa2774df77e5f6f`. Keep `https://lifts.paulbebear.com/app/` for the web.
- Login window: `react-native-inappbrowser-reborn` is installed. Its `openAuth(url, redirectUri)` uses `ASWebAuthenticationSession` and returns the redirect URL with the code, so the app never leaves.
- PKCE: Hermes has no `crypto.subtle`. Use a small pure-JS SHA-256 and a random source such as `react-native-get-random-values`. Keep the verifier in a variable for the length of `openAuth`. It does not need storage.
- Code layout: move the web-only parts (`SpotifyClient_login`, `SpotifyClient_handleRedirect`, `readPkce`, `redirectUri`) into `spotifyLogin.ts`, and add `spotifyLogin.native.ts`. The token refresh and every API call stay shared.
- Limit: Spotify Development Mode still caps the app at 5 users, each added by email in the dashboard. Native changes nothing there.

Size: 1 day, plus 1 hour of testing on the phone.

## Upstream services to switch off in the native build

The offline flag covers sync and in-app events. These still reach upstream's servers or use upstream's keys on native:

- Over-the-air JS updates. This one matters most. `ios/Shared/LftUpdater/` downloads new JS from `https://www.liftosaur.com/api/updates/manifest` (the `LftUpdatesManifestURL` key in `Info.plist`). A Release build would replace the fork's JS with upstream's Liftosaur. The Swift code already has a `DISABLE_OTA` switch. Add `DISABLE_OTA` to `SWIFT_ACTIVE_COMPILATION_CONDITIONS` for Release in all four targets, so the app always loads the embedded `main.jsbundle` and `watch-bundle.js`.
- Rollbar: `App.native.tsx` configures Rollbar with upstream's token, so the fork's crashes would land in upstream's dashboard with the user's id. Turn it off when the offline flag is on.
- AppsFlyer and EventManager telemetry: `Analytics_initialize` and `EventManager_initTelemetry` in `App.native.tsx` use upstream's keys and API. Turn both off when the flag is on.
- `Thunk_fetchInitial`: fetches upstream's program list and checks subscription receipts. The receipts check does nothing for the fork, because `Subscriptions_isUnlockedByFork()` already unlocks premium. Skip the server parts when the flag is on.
- Login: Settings already hides Account. Remove Sign in with Apple (`com.apple.developer.applesignin`) and the Google URL scheme from the entitlements and `Info.plist`, because the friend's App ID does not have them set up.
- Paywall and purchases: premium is already unlocked by `Subscriptions_isUnlockedByFork()`. The StoreKit listener in `App.native.tsx` still starts. Skip it when the flag is on, and remove `ios/Store.storekit` from the scheme.
- Universal links: the `applinks:liftosaur.com` entitlement only works for upstream's team ID. Remove it. `ImportExporter_handleUniversalLink` then never runs.
- Push: `aps-environment` is set for upstream's server push (`LiftosaurPushImpl.swift`). The live activity starts with `pushType: nil`, so it updates locally. Remove the entitlement and skip push registration when the flag is on.
- TikTok and Google Ads pods: used by upstream's share and ad attribution. They stay unused. Removing them from `ios/Podfile` is optional and shortens the build.

Size: 4 hours for the JS gates, 3 hours for the Xcode and plist clean-up.

## Apple Health, Apple Watch and live activities

All three come from upstream and need no new code. They need the right capabilities on the friend's App IDs and a shared App Group.

- Apple Health: `src/utils/health.ios.ts` and `Thunk_syncHealthKit`. It runs without an account. The user turns it on in Settings → Apple Health. Needs the HealthKit capability on the main app and the watch app. Rewrite the two `NSHealth*UsageDescription` texts in `Info.plist`, because they say "Liftosaur".
- Live activity and lock-screen rest timer: `LiftosaurWorkoutWidgetExtension`, with `NSSupportsLiveActivities` set. The app and the widget share data through the App Group `group.com.liftosaur.workout`.
- Apple Watch: `LiftosaurWatch` and `LiftosaurWatchComplication`. The watch runs the fork's JS in QuickJS from `watch-bundle.js`. It syncs with the phone over WatchConnectivity, which needs no account. Its server sync path (`WatchSyncManager.syncViaServer`) only runs with upstream login, so it stays unused.
- App Group rename: the group ID appears in 4 entitlements files and 14 places in 5 Swift files (`LiftosaurLiveActivityImpl.swift`, `ComplicationStore.swift` and three widget files). The friend's team cannot use `group.com.liftosaur.workout`, so all of them move to the new group ID.
- Watch build on a Mac: Xcode refuses to build the `Liftosaur` scheme without the watchOS simulator runtime: "This scheme builds an embedded Apple Watch app. watchOS 26.5 must be installed". Install it in Xcode → Settings → Components, or with `xcodebuild -downloadPlatform watchOS`. It is several GB.

## Name, bundle ID and signing

Proposed. The user and the friend decide.

- Display name: "beBEAR lifts", the name the story card and the playlist description already use.
- Bundle IDs: `com.paulbebear.lifts`, `com.paulbebear.lifts.watchkitapp`, `com.paulbebear.lifts.watchkitapp.complications` and `com.paulbebear.lifts.LiftosaurWorkoutWidgetExtension`.
- App Group: `group.com.paulbebear.lifts`.
- App icon and launch screen: replace upstream's Liftosaur dinosaur. The name and logo are upstream's branding, and the licence does not cover them.
- Encryption: add `ITSAppUsesNonExemptEncryption = NO` to `Info.plist`. The app uses only HTTPS, so App Store Connect stops asking at every upload.

What the friend does with their Apple Developer account:

1. In Certificates, Identifiers & Profiles, register the 4 bundle IDs and the App Group. Turn on HealthKit for the app and the watch app, and App Groups for all 4.
2. In App Store Connect, create a new app with the main bundle ID and the name "beBEAR lifts".
3. In Xcode, open `ios/Liftosaur.xcworkspace`. For each of the 4 targets, pick their team under Signing & Capabilities and keep "Automatically manage signing" on.
4. Choose the "Any iOS Device (arm64)" destination, then Product → Archive. It needs the pods installed, the watch bundle built and the watchOS platform installed.
5. In the Organizer, Distribute App → App Store Connect → Upload.
6. In App Store Connect → TestFlight, wait for processing (10 to 30 minutes). Then add the build to an external testing group and turn on the public link.
7. The first build of an external group goes through Beta App Review, which usually takes under 48 hours. Later builds of the same version mostly skip it.
8. Testers install TestFlight from the App Store and open the link. Builds expire after 90 days, so upload a new one before then.

Internal testing skips review, but each tester must be a user on the friend's App Store Connect team. External testing with a public link fits a group of friends better.

## Licence

Liftosaur is licensed AGPL-3.0, and so is this fork. Apple's App Store terms add usage rules and DRM. The AGPL forbids any further restrictions on recipients. The FSF made this argument when GPL apps such as VLC were pulled from the App Store in 2011. Only the copyright holder can resolve it, by granting an exception or a separate licence.

- Before a public App Store release, ask Anton Astashov, Liftosaur's author.
- TestFlight for a few friends is lower risk. It is still distribution under Apple's terms, so keep the source public at github.com/paul-bebear/beBEARlifts and keep the "source code" link in Settings.
- Use a different name and icon either way.

Draft message to Anton:

> Hi Anton. I use Liftosaur a lot, and I made a personal fork called beBEARlifts for me and a few friends: github.com/paul-bebear/beBEARlifts. It adds food logging, Spotify song tracking and a few other things. It is offline, with no accounts and no server sync. A friend of mine has an Apple Developer account and could put it on TestFlight for our group, with a different name and icon. I know the App Store terms do not fit well with the AGPL. Would you be OK with a TestFlight build for friends? And if I ever wanted a public App Store release, would you consider an exception for this fork? Happy to do it however you prefer, or not at all if you would rather I didn't. Thanks for building Liftosaur.

## Task list

In order. "Codex" means a written handoff can do the task without a phone. "Phone" means it needs testing on the iPhone.

1. Done in the first PR: native build with the offline flag on, the fork's tabs, and web-only features guarded. 1 day.
2. Make the build the fork's own: bundle IDs, display name, icon, App Group in 4 entitlements and 14 Swift references, remove applinks, Sign in with Apple, the Google URL scheme and `aps-environment`, `DISABLE_OTA` for Release, `ITSAppUsesNonExemptEncryption`. 3 hours. Codex, with the exact list from the upstream-services and signing sections. The icon artwork comes from the user.
3. Switch off upstream services in JS: Rollbar, AppsFlyer, EventManager telemetry, the server parts of `Thunk_fetchInitial`, the StoreKit listener. 4 hours. Codex.
4. The friend signs, archives and uploads build 1 to TestFlight. 2 hours of the friend's time, plus up to 48 hours of Beta App Review.
5. The user tests build 1 on the iPhone: a workout, the lock-screen timer, Apple Health, Food search, warmup, cloud backup, export. 1 hour. Phone.
6. Spotify login on native. 1 day. Codex can write it. Phone for the redirect.
7. Music tracking on native with `AppState`. 2 hours. Codex. Phone to check the lock-screen catch-up.
8. Plate and label photos with `react-native-image-picker`. 4 hours. Codex. Phone.
9. Barcode scanner with `react-native-vision-camera`. 1 day. Codex for the code. Phone for real scans.
10. Food log import with `FileImport_pickFile`. 1 hour. Codex.
11. Apple Watch: install the watchOS platform, build, pair, and run a workout on the watch. Half a day. Phone and watch.
12. Story card rebuilt with native views. 2 days. Not Codex: the layout needs looking at.
13. Set clips on native with `react-native-image-picker` in video mode. 1 day. Codex for the code. Phone for filming.
14. Before any public App Store release: send the message to Anton and wait for a yes.

Friends on Supabase is being built in another session. Its code must also avoid `localStorage`, `window` and relative URLs, or carry a `.native.ts` variant, so it runs in this build.

## Build problems found and fixed

- `ios/.xcode.env.local` was committed with upstream's node path, `/opt/homebrew/Cellar/node/23.5.0/bin/node`. Every Xcode script phase that runs node failed on a machine without that exact version. Xcode reported it as "Internal inconsistency error: never received target ended message" after the "[Hermes] Replace Hermes for the right configuration" phase failed with no output. Fix: the file is untracked and in `.gitignore`. `pod install` writes it per machine. If it is missing, run `echo "export NODE_BINARY=$(command -v node)" > ios/.xcode.env.local`.
- The watchOS runtime error in the section on Apple Watch. For a compile check without it, remove the "Embed Watch Content" phase and the `LiftosaurWatch` dependency from the `Liftosaur` target in a scratch copy. Never commit that.

## Next action

Send the friend the eight signing steps from the bundle ID section. Ask for their Team ID, so task 2 can use the right bundle IDs.
