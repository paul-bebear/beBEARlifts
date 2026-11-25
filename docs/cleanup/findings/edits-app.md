# Phase 1 findings: Our edits to Anton's files: app, navigation, pages, iOS

Slice `edits-app` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 1 medium, 8 low. 0 dropped by the checker.
Coverage: 87 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **E1. Copy link to workout is a dead end in the offline build**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/navigation/modals/NavModalWorkoutShare.tsx:96-109`
  - Scenario: User finishes a workout and taps Share, then Copy link to workout. WorkoutShareMenu_rows always lists the link row. It needs state.user.id. Only the upstream login sets state.user, and the offline build hides that login. So the user always gets the alert 'You should be logged in'. The fork host also has no /record route.
  - Fix: Add a hasAccount input to WorkoutShareMenu_rows in src/models/workoutShareMenu.ts. Drop the link row when state.user is null. Add a case in test/workoutShareMenu.test.ts.
  - Effort: 1 hours.
  - Checker: keep. WorkoutShareMenu_rows always adds "link", getInitialState sets user to undefined, and the only places that set state.user are the upstream Login dispatches in thunks.ts (which the offline fetch guard blocks) and the debug-only Thunk_adminEnableServerSync, so in the default offline build tapping Copy link to workout always shows the 'You should be logged in' alert.

## Low

- **E2. Beat progression shows no summary in the program editor or share output**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/pages/planner/models/plannerProgramExercise.ts:838-872`
  - Scenario: A program uses progress: beat(5lb, 12), as all the bear plans do. PlannerProgramExercise_progressionType has branches for lp, dp, sum and custom, and returns undefined for beat. editProgramUiProgress.tsx and programShareOutput.tsx then render nothing for that exercise.
  - Fix: Add a beat type to IProgressionType and a branch in PlannerProgramExercise_progressionType. Render a line in both Progression components. Add a case in test/plannerProgramExercise.test.ts.
  - Effort: 0.75 hours.
- **E3. Instagram and TikTok native share code has no caller**
  - Severity: low. Seen. Kind: dead.
  - File and line: `ios/Liftosaur/LiftosaurShareImpl.swift:9-10,92-108; src/utils/imageshare.native.ts:47-70; src/utils/imageshare.ts:22`
  - Scenario: Our edit removed the Instagram and TikTok rows and deleted WorkoutSocialShareSheet. Nothing calls ImageShareUtils.shareToSocial any more. shareToTiktok and the IG paths in LiftosaurShareImpl.swift stay in the binary. The TikTok redirect we changed is checked against Anton's registered TikTok client key (Info.plist TikTokClientKey), so it could not work for the fork anyway.
  - Fix: Remove shareToSocial, the three native methods in src/specs/NativeLiftosaurShare.ts, the Swift methods, igAppId, the TikTok redirect and key, and the TikTok pod. Redo codegen and pod install.
  - Effort: 2 hours.
- **E4. lint-views never scans src/App.native.tsx or src/index.tsx**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `scripts/lint-views.ts:10; src/App.native.tsx:481-501`
  - Scenario: VIEW_DIRS lists only components, navigation and pages. App.native.tsx (846 lines) and index.tsx escape the 400-line and 20-line checks. AppRoot holds decisions in effects. One is the universal-link filter: origin check plus the /program?data and /p/ path test. The new returnsViewType helper in lint-views.ts also has no test.
  - Fix: Scan root src/*.tsx in listViews. Move the link filter to a pure ForkLinks_importPath(url) in a model with a mocha test. Baseline the rest with reasons. Add one test for returnsViewType.
  - Effort: 2 hours.
- **E5. Service worker routing rules have no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/webpushr-sw.ts:36-125`
  - Scenario: Which URLs skip the cache (/api/food/, spotify.com), which are fetch-first (every navigation) and which are cached (regex list) live inside the worker. Only BundleNames_assetsInPage is tested. A wrong regex or a cached 403 would show up only on a phone offline.
  - Fix: Extract a pure ServiceWorkerRoutes_decide(url, method, mode) to src/utils. Cover the skip, network-first and cache-first cases in a new test.
  - Effort: 1.5 hours.
- **E6. Service worker caches every navigated URL until the next deploy**
  - Severity: low. Suspect. Kind: waste.
  - File and line: `src/webpushr-sw.ts:82-96`
  - Scenario: The new e.request.mode === navigate test sends every page load through cacheRequest. Each distinct URL gets its own cache entry, for example a /program?data=... link or the OAuth return ?code=... URL. Entries are removed only when the cache name changes. The regexes /\/images\// and /\/programdata\// also match on any host.
  - Fix: Network-first and cache only the paths /, /app and /app/. Match the regexes against url.origin === location.origin.
  - Effort: 0.75 hours.
- **E7. App Store submit script fails with a vague error when env vars are missing**
  - Severity: low. Seen. Kind: bug.
  - File and line: `scripts/releaseIos/submitToAppStore.ts:5-12`
  - Scenario: A release runs without ASC_ISSUER_ID or ASC_KEY_ID. The non-null assertions hide it. KEY_PATH becomes AuthKey_undefined.p8, and the script dies later in readFileSync or jwt.sign. The xcconfig read at import time also fails if the cwd is not the repo root.
  - Fix: Add a requireEnv(name) helper that throws a clear message. Resolve the xcconfig path from __dirname.
  - Effort: 0.25 hours.
- **E8. Anton's Rollbar token is still in the client for the online build**
  - Severity: low. Suspect. Kind: security.
  - File and line: `src/App.native.tsx:113-114`
  - Scenario: The offline build skips RollbarClient. A build with LFT_OFFLINE_ONLY=0 still constructs it with Anton's upstream accessToken. Crash reports with fork user ids would go to his Rollbar project.
  - Fix: Replace the token with the fork's own, read from an env define. Or delete the online Rollbar branch.
  - Effort: 0.5 hours.
- **E9. The graphs tab holds Progress, programs and every Me screen**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/navigation/types.ts:52-66; src/models/tabRouting.ts:16-18`
  - Scenario: ITab value graphs now hosts the Progress dashboard, the program screens (TabRouting_programTab returns graphs when offline) and all Me screens. IGraphsStackParamList extends IMeStackParamList. A reader looking for program routing will not look in graphs.
  - Fix: Rename the tab to progress in ITab, types.ts, AppNavigator.tsx, AppNavigator.native.tsx and tabRouting.ts. Update test/tabRouting.test.ts.
  - Effort: 2 hours.

## Findings from the 26 October audit

- D1: fixed. src/App.native.tsx:340 dispatches Thunk_cloudCatchUp after launch, and :523 does it in the active handler. Both run only when OfflineOnly_isEnabled. Fixed in bbdb7502. Thunk_cloudCatchUp is throttled by CloudBackup_isCatchUpDue.
- H2: fixed. npx eslint on all 43 .ts and .tsx files of this slice reports 0 errors. The planner files and NavModalDayStats are reformatted. scripts/screenshots/run.ts uses i += 1 and failed += 1. Files outside this slice were not linted.

## Checked with no finding

- ios Swift hunks: AppConfiguration.swift is compiled into all four targets, and every Info.plist has AppGroupIdentifier and ForkOfflineOnly. Watch offline guards, DISABLE_OTA and the bear image asset exist.
- SceneDelegate GIDSignIn.handle(url) returns early only for Google URLs.
- App.native.tsx: Thunk_sync2 is itself gated by OfflineOnly_isEnabled, so the unconditional dispatch in the active handler is safe.
- ForkServices_plan and ForkServices_hosts have tests in test/forkServices.test.ts. tabRouting, tabBarLayout, workoutShareMenu, workoutSupersetPair, firstUseTips and bundleNames have tests.
- History_getHistoryRecordsForTimerange replaces the removed getWeekHistory wrapper with identical behaviour. The date passed is already the first day of the week.
- Beat progression: parser, validator, programToPlanner and programGrid all handle beat, and test/plannerProgramExercise.test.ts runs it.
- NavModalProgramPreviewMuscles calls usePlusAccess before the early return, so hook order is stable. Muscles is a beBEAR+ feature by design.
- navigationService.navigateTo keeps the old tab-reset path and only adds the offline program-tab redirect. No caller passes tab program.
- NavScreenContent padding and tab-bar math go through TabBarLayout_* functions that are tested.
- SupabaseOAuth_finishReturn catches its own errors, so main() always runs after it.
- npx tsc --noEmit shows one error, in src/components/foodQuickAddPanel.tsx:28 (missing micros). It is outside this slice and none of its hunks are ours.
- scripts/lint-views.ts now reports one warning (src/components/foodLabelPanel.tsx onFile), outside this slice.
