# Handoff: make the native iPhone app build and ship as beBEAR

Branch `handoff-xcode`. Run this on the user's Mac, not in a cloud sandbox, because it needs Xcode and `xcodebuild`. Read `AGENTS.md` and `NATIVE_PLAN.md` first. Follow the `AGENTS.md` rules: logic in pure modules with mocha tests, thin `.tsx` files, no AI attribution lines in commits. Build with `xcodebuild`, but do not launch the app on a simulator; the user tests on their iPhone. Run `npx tsc --noEmit`, eslint on the changed files and the new tests, then open a PR against `master` with a short "Check on your iPhone" list.

## Goal

A friend will publish the app from their Apple developer account. Today a Release build still talks to upstream Liftosaur's servers, and nobody has built the native app since PR #39. After this handoff, a Release archive builds cleanly and runs only the fork's code. Switching to the friend's team takes one edit.

## 1. Prove it builds

- Prepare: `npm run ensure:localdomain`, `npm run build:watch-bundle`, then the pod install line in `NATIVE_PLAN.md`.
- Debug: build the `Liftosaur` scheme for an iOS simulator destination. Build only; do not boot or launch.
- Release: build for `generic/platform=iOS` with `CODE_SIGNING_ALLOWED=NO`.
- Fix every compile error, in Swift and in the JS bundle step. PR #39 added `ios/AppBranding.xcconfig`, so check that all four targets pick up `APP_BUNDLE_PREFIX` and `APP_DISPLAY_NAME`.
- If Xcode refuses the watch target because the watchOS platform is missing, say so in the PR. Do not download the platform without asking.

## 2. Switch off upstream services

`NATIVE_PLAN.md` has a section "Upstream services to switch off in the native build". Do every item in it:

- **Over-the-air updates:** add `DISABLE_OTA` to `SWIFT_ACTIVE_COMPILATION_CONDITIONS` for Release in all four targets. Without it, a Release build downloads upstream's JS from `LftUpdatesManifestURL` (`https://www.liftosaur.com/api/updates/manifest`) and replaces beBEAR with Liftosaur. This is the most important item.
- **Rollbar, AppsFlyer and `EventManager_initTelemetry`:** off when the offline flag is on.
- **`Thunk_fetchInitial`:** skip its server parts. PR #40 already loads the program list from `https://lifts.paulbebear.com`.
- **StoreKit:** skip the listener and remove `ios/Store.storekit` from the scheme. Premium is already unlocked by `FORK_UNLOCKS_PREMIUM`.
- **Entitlements:** remove `applinks:liftosaur.com`, `aps-environment` and Sign in with Apple, then skip push registration. The friend's App ID has none of them set up. The fork signs in through Supabase email codes.
- **Watch release host:** `ios/Shared/Settings.swift` points the Release `baseUrl` and `baseImageUrl` at `www.liftosaur.com`. With OTA off, the watch must use the embedded `watch-bundle.js`. Make sure nothing on the watch downloads JS from upstream.

Put each "is this on in the fork" decision in one pure module, for example `src/utils/forkServices.ts`, tested in `test/forkServices.test.ts`. `App.native.tsx` only reads it.

## 3. One place for the signing team

`DEVELOPMENT_TEAM` is hard-coded in `ios/Liftosaur.xcodeproj/project.pbxproj` as upstream's team. Add `APP_DEVELOPMENT_TEAM` to `ios/AppBranding.xcconfig` and use it in every target and configuration. Leave it empty; the friend fills it in. Also move the App Group id (`group.com.liftosaur.workout`) into a build setting derived from `APP_BUNDLE_PREFIX`. Read it in Swift from `Info.plist`, not from string literals. PR #39 lists the files that use it.

## 4. Native food photo and nutrition label

`src/components/foodPhotoPanel.tsx` and `src/components/foodLabelPanel.tsx` show web-only placeholders on native. App Review rejects buttons that do nothing (Guideline 2.1). Port them with `react-native-image-picker`, which is already installed. Use its `maxWidth`, `maxHeight` and `includeBase64` options in place of the canvas resize in `src/utils/imageResize.ts`, then send the result to the same `FoodApi_*` calls. The AI consent gate from PR #39 must run before the picker opens.

## Check on your iPhone list for the PR

- Install a Release build. The app name under the icon reads beBEAR. Open the app in airplane mode; it starts and shows your data.
- Settings shows no Account or Apple sign-in section. No purchase prompt appears anywhere.
- Food → AI Scan: the consent sheet appears first. After Allow, the camera opens. A photo of a plate returns food items.
- Choose a program → search "beBEAR" shows the 5-day program.
- The Apple Watch app opens and shows the current workout.
