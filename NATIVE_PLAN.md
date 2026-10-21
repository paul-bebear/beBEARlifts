# beBEARlifts on iPhone: native app plan

How to ship this fork as a native iPhone app on TestFlight. Written 2026-10-21 against master at `638c5dec`.

Current configuration after `HANDOFF-xcode.md`: native startup disables upstream services, Release disables OTA, and native food photos use the camera picker. `ios/AppBranding.xcconfig` owns the display name, bundle prefix, signing team, and derived App Group. The signing team remains empty. Device testing and App Store Connect setup remain separate steps.

Verified on 2026-10-21 with Xcode 26.6 and SDKs 26.5:

- Full Debug scheme built for arm64 iOS Simulator, including the Watch app. No simulator was booted or app launched.
- An unsigned Release archive built for `generic/platform=iOS`. All four archived plists contain beBEAR, the derived App Group, and offline mode.
- The archive contains the Hermes phone bundle and the production watch bundle. The watch bundle uses the fork host.
- TypeScript, changed-file ESLint, and 48 focused mocha tests passed. Camera, AI results, HealthKit, and Watch behavior still need device testing.

Build Debug without launching a simulator:

```bash
npm run ensure:localdomain
npm run build:watch-bundle
cd ios
RCT_USE_PREBUILT_RNCORE=1 RCT_NEW_ARCH_ENABLED=1 USE_FRAMEWORKS=static pod install
cd ..
xcodebuild -workspace ios/Liftosaur.xcworkspace -scheme Liftosaur -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO ARCHS=arm64 ONLY_ACTIVE_ARCH=YES build
```

Rebuild the embedded watch bundle for Release, then create an unsigned archive:

```bash
NODE_ENV=production npm run build:watch-bundle
xcodebuild -workspace ios/Liftosaur.xcworkspace -scheme Liftosaur -configuration Release -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO archive
```

All four Release targets define `DISABLE_OTA` and read `AppGroupIdentifier` from their processed plists. Cached OTA bundles are ignored. `forkServices.ts` disables Rollbar, AppsFlyer, telemetry, upstream login, push, purchases, and receipt checks when the offline flag is on. The phone and watch use the fork's host. Watch server sync is disabled. The scheme has no StoreKit test configuration. The phone retains HealthKit and App Groups entitlements.

Set `APP_DEVELOPMENT_TEAM` and the friend's bundle prefix in `ios/AppBranding.xcconfig` before signing. Register the resulting `APP_GROUP_IDENTIFIER` for all four targets. The release script reads those settings and stops while the team is empty. Configure the friend's App Store Connect credentials separately before uploading.

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
- Off: `LFT_OFFLINE_ONLY=0` opts JavaScript into upstream services. Reset Metro's cache after changing the variable. Removed entitlements, Release OTA protection, and the native `ForkOfflineOnly` plist flag remain unchanged.

What the flag changes on native, all through `OfflineOnly_isEnabled()`:

- `Thunk_sync2` stops syncing to upstream's server.
- The Account, Nickname and API Keys rows leave Settings.
- The Friends tab replaces the Program tab. Program moves under Progress, as on the web.
- `lg()` in `src/utils/log.ts` sends no events. The signup prompt and "hear about us" prompt never show.
- Effort rating per set is on by default, and the weekly backup reminder runs.

The web build also installs `OfflineOnly_installFetchGuard`. Native gates upstream startup services through `ForkServices_plan`. Fork APIs and Supabase remain available.

## Fork features that use web-only code

Found with a grep for `Platform.OS === "web"`, `document`, `window`, `navigator.clipboard`, `navigator.share`, `html-to-image`, `localStorage` and `<input type="file">` over every file the fork added or changed since upstream commit `a7a402c2`.

Fixed in the first PR:

- Food, warmup and report API calls: `src/utils/foodApi.ts`, `src/utils/warmupApi.ts` and `src/utils/reportStore.ts` fetched relative `/api/...` paths. They now go through `ApiUrl_for`. The section on Vercel functions has the detail.
- Paste history from clipboard: `src/components/importerLiftosaurCsv.tsx` called `navigator.clipboard.readText()`, which does not exist on native. Native now reads through `ClipboardUtils_paste`, which uses `@react-native-clipboard/clipboard`. The web path is unchanged, because Safari only shows its Paste bubble when `readText` runs directly inside the tap.
- Backup reminder marks: `src/utils/backupReminderMarks.ts` keeps two timestamps in `localStorage`. Native has no `localStorage`, so the reminder would show after every workout once due. `backupReminderMarks.native.ts` keeps them in MMKV instead.
- Music screen: `SpotifyClient_takeError` read `localStorage` during render, which throws a ReferenceError on native and takes down the screen. It now returns nothing when `localStorage` is missing. The "Connect Spotify" button is replaced on native with a line that says login is not in the iPhone app yet.
- Native navigator: `src/navigation/AppNavigator.native.tsx` had no Friends tab and no Music, Reports or Body scans screens. The footer would show a Friends button with no screen behind it. The native navigator now mirrors the web one.

Native camera support:

- Plate and nutrition label photos use `react-native-image-picker`. `nativeFoodCapture.native.ts` checks AI consent before camera permission or library access. The picker limits images to 1024 pixels for meals and 1600 for labels. Results use the existing `FoodApi_*` calls. Label values remain editable before saving. Cancellation and permission denial send no photo.

Still stubbed on native:

- Barcode scanner, `src/components/foodBarcodeScanner.tsx`: uses `@zxing/browser` and a `<video>` element. Native fix: `react-native-vision-camera` has a built-in code scanner that reads EAN-13, EAN-8, UPC-A and UPC-E. It is a new pod and needs a camera permission text. Size: 1 day, most of it testing scans on the phone.
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

Completed by `HANDOFF-xcode.md`:

- OTA: all four Release configurations define `DISABLE_OTA`. `effectiveBundleURL` ignores cached downloads and returns embedded JS. Watch bundle fetching is disabled.
- Rollbar, AppsFlyer and EventManager telemetry return without initialization or uploads when the offline flag is on. Native Watch telemetry, saved event retries, and crash reports are also disabled.
- `Thunk_fetchInitial` loads the fork's program catalog, then skips upstream subscription and account requests.
- Login: Apple sign-in and the Google URL scheme are removed. Google SDK setup and watch auth handoff are disabled offline.
- Purchases: the IAP adapter and StoreKit listener are disabled offline. The scheme has no StoreKit configuration.
- Universal links and push: the upstream entitlements and startup registration are removed. Local live activities remain available.
- Watch: Release hosts and webpack's default watch host point to the fork. Watch server sync and cached-auth server fetches are disabled offline.
- TikTok and Google Ads pods: used by upstream's share and ad attribution. They stay unused. Removing them from `ios/Podfile` is optional and shortens the build.

The pure decisions and startup behavior are covered by `test/forkServices.test.ts`.

## Apple Health, Apple Watch and live activities

All three come from upstream and need no new code. They need the right capabilities on the friend's App IDs and a shared App Group.

- Apple Health: `src/utils/health.ios.ts` and `Thunk_syncHealthKit` run without an account. Enable HealthKit for the phone and watch App IDs. The permission descriptions use beBEAR.
- Live activity and lock-screen rest timer: `LiftosaurWorkoutWidgetExtension`, with `NSSupportsLiveActivities` set. The app and widget share `APP_GROUP_IDENTIFIER`.
- Apple Watch: `LiftosaurWatch` and `LiftosaurWatchComplication`. The watch runs the fork's JS in QuickJS from `watch-bundle.js`. It syncs with the phone over WatchConnectivity, which needs no account. Its server sync path (`WatchSyncManager.syncViaServer`) only runs with upstream login, so it stays unused.
- App Group: all four entitlements use `$(APP_GROUP_IDENTIFIER)`. Shared Swift code reads the expanded `AppGroupIdentifier` plist value.
- Watch build on a Mac: Xcode refuses to build the `Liftosaur` scheme without the watchOS simulator runtime: "This scheme builds an embedded Apple Watch app. watchOS 26.5 must be installed". Install it in Xcode → Settings → Components, or with `xcodebuild -downloadPlatform watchOS`. It is several GB.

## Name, bundle ID and signing

The user selected beBEAR. The bundle prefix waits for the friend's Apple team.

- Display name: `beBEAR`. The App Store name is `beBEAR: Lift & Track`.
- Bundle IDs derive from `APP_BUNDLE_PREFIX`, currently `com.liftosaur.www` as a placeholder.
- App Group: `group.$(APP_BUNDLE_PREFIX).workout`. All four targets read the expanded value from `Info.plist`.
- App icon and launch screen: replace upstream's Liftosaur dinosaur. The name and logo are upstream's branding, and the licence does not cover them.
- Encryption: add `ITSAppUsesNonExemptEncryption = NO` to `Info.plist`. The app uses only HTTPS, so App Store Connect stops asking at every upload.

What the friend does with their Apple Developer account:

1. In Certificates, Identifiers & Profiles, register the 4 bundle IDs and the App Group. Turn on HealthKit for the app and the watch app, and App Groups for all 4.
2. In App Store Connect, create a new app with the main bundle ID and the name "beBEAR: Lift & Track".
3. Set `APP_DEVELOPMENT_TEAM` and `APP_BUNDLE_PREFIX` in `ios/AppBranding.xcconfig`. Open `ios/Liftosaur.xcworkspace` and verify all four targets inherit those settings.
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
2. Done: beBEAR display name, shared identity settings, derived App Group, upstream entitlements removed, Release OTA disabled. Icon artwork remains separate.
3. Done: upstream analytics, telemetry, startup account requests, push and StoreKit are disabled offline.
4. The friend signs, archives and uploads build 1 to TestFlight. 2 hours of the friend's time, plus up to 48 hours of Beta App Review.
5. The user tests build 1 on the iPhone: a workout, the lock-screen timer, Apple Health, Food search, warmup, cloud backup, export. 1 hour. Phone.
6. Spotify login on native. 1 day. Codex can write it. Phone for the redirect.
7. Music tracking on native with `AppState`. 2 hours. Codex. Phone to check the lock-screen catch-up.
8. Code complete: plate and label photos with `react-native-image-picker`. Camera, consent and AI results need iPhone testing.
9. Barcode scanner with `react-native-vision-camera`. 1 day. Codex for the code. Phone for real scans.
10. Food log import with `FileImport_pickFile`. 1 hour. Codex.
11. Apple Watch: install the watchOS platform, build, pair, and run a workout on the watch. Half a day. Phone and watch.
12. Story card rebuilt with native views. 2 days. Not Codex: the layout needs looking at.
13. Set clips on native with `react-native-image-picker` in video mode. 1 day. Codex for the code. Phone for filming.
14. Before any public App Store release: send the message to Anton and wait for a yes.

Friends on Supabase is being built in another session. Its code must also avoid `localStorage`, `window` and relative URLs, or carry a `.native.ts` variant, so it runs in this build.

## Build problems found and fixed

- `ios/.xcode.env.local` was committed with upstream's node path, `/opt/homebrew/Cellar/node/23.5.0/bin/node`. Every Xcode script phase that runs node failed on a machine without that exact version. Xcode reported it as "Internal inconsistency error: never received target ended message" after the "[Hermes] Replace Hermes for the right configuration" phase failed with no output. Fix: the file is untracked and in `.gitignore`. `pod install` writes it per machine. If it is missing, run `echo "export NODE_BINARY=$(command -v node)" > ios/.xcode.env.local`.
- watchOS 26.5 was installed with the user's permission for this handoff. Keep the embedded Watch target enabled during build verification.
- A symlinked `node_modules` caused Metro resolution failures and invalid CocoaPods header-copy paths. Use a local dependency directory, then rerun `pod install`.

## Next action

Set the friend's Team ID in `ios/AppBranding.xcconfig` before signing a device build.
