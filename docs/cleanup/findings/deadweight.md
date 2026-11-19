# Phase 1 findings: Dead weight

Slice `deadweight` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 0 medium, 10 low. 0 dropped by the checker.
Coverage: 27 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Low

- **Z1. The badge unlocked pop-up and its hook are never shown**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/badgeUnlockedSheet.tsx:1-105; src/components/shareCards/badgeCard.tsx:1-29; src/utils/useBearBadges.ts:61-101; src/models/badgeCelebration.ts:1-51; test/badgeCelebration.test.ts`
  - Scenario: Commit 74ad0c87 (T1) took the pop-up off the screens. No file imports BadgeUnlockedSheet. BadgeCard is only used inside it. useBadgeCelebration has no caller. BadgeCelebration_step, _next and _isLevelUpDue are only called by that hook, and the test.
  - Fix: Delete badgeUnlockedSheet.tsx, shareCards/badgeCard.tsx, useBadgeCelebration (keep useBearBadges), badgeCelebration.ts and its test. Then check whether seenBadges, badgesSeeded and celebratedLevel in bearStoreData.ts still have a reader. Keep them in the parser for old backups.
  - Effort: 1 hours.
- **Z2. The bear look picker and the bearLook model have no screen**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/bearLookSheet.tsx:1-82; src/models/bearLook.ts:1-24; test/bearStoreData.test.ts:4,41-51; src/models/bearArt.ts:13`
  - Scenario: Nothing imports BearLookSheet. BearLook_setFur and BearLook_summary have no caller in src, only in test/bearStoreData.test.ts. BearArt_sprite ignores both its line and fur arguments, so the picker would change nothing on screen anyway.
  - Fix: Delete bearLookSheet.tsx and bearLook.ts. Cut the BearLook cases from test/bearStoreData.test.ts. Keep line and fur in the store parser for old backups.
  - Effort: 0.5 hours.
- **Z3. The glass bar, its model, its CSS and the liquid-glass package are unused**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/primitives/glassBar.tsx; src/components/primitives/glassBar.native.tsx; src/models/glassSurface.ts; test/glassSurface.test.ts; src/index.html:142-280; package.json (@callstack/liquid-glass)`
  - Scenario: Commit edb14bc0 (T3) removed the glass tab bar. A grep for GlassBar and GlassTabLens finds only the two definitions. Both platform files are dead. glassSurface.ts is used only by the native file and its test. The .glass-bar and .glass-tab-lens rules in index.html have no element. @callstack/liquid-glass is required only by the native file. The pod (ios/Podfile.lock LiquidGlass 0.8.2) still builds into the app.
  - Fix: Delete both glassBar files, glassSurface.ts, its test and the CSS block. Remove @callstack/liquid-glass from package.json and run pod install. Keep @react-native-community/blur because locker.native.tsx uses it.
  - Effort: 1.5 hours.
- **Z4. FoodSearchBar is replaced and nothing imports it**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/foodSearchBar.tsx:1-43`
  - Scenario: The food page now uses foodBrowsePanel.tsx and foodAiPanel.tsx. The testIDs food-search, food-barcode and food-photo appear in no test or other component. AiConsent_showFeatures is still used by appStoreSettings.tsx.
  - Fix: Delete foodSearchBar.tsx. IconBarcode and IconCamera have other users.
  - Effort: 0.25 hours.
- **Z5. Other components and exports with no caller anywhere**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/workoutReportCard.tsx:94; src/components/progressHubCards.tsx:72,96; src/components/icons/iconFoodUi.tsx:37; src/utils/foodLogStore.ts:10,12`
  - Scenario: WorkoutReportCard, ProgressStepsCard, ProgressPhotosCard, IconCopyDay, FoodLogStore_get and FoodLogStore_subscribe appear once in src, at their definition. No test names them. The same file still has live exports (WorkoutReportView, ProgressExpandRow, ProgressDetailLine, ProgressDetailLink).
  - Fix: Delete the six exports. Drop imports they alone used.
  - Effort: 0.5 hours.
- **Z6. About 33 model exports are used only by tests, so the feature has no screen**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/bearBadges.ts:127 BearBadges_all; bearHouse.ts:112 BearHouse_images; foodLog.ts:470 FoodLog_copyDay; exerciseDemos.ts:63 ExerciseDemos_allKeys; feed.ts:223 Feed_needsRefresh; foodAddFlow.ts:164 FoodAddFlow_entriesFromPhoto; songPerSet.ts:49 SongPerSet_trackAt; houseFrame.ts:53 HouseFrame_safeRect; rulerTape.ts:262,278,364 (RulerTape_snap, _valueForOffset, _flickValue); onboardingAnswers.ts:78 OnboardingAnswers_isYouth; quickActions.ts:59 QuickActions_inProgressLine; dailyChecklist.ts:65,72 (DailyChecklist_toggleCheckIn, _commit); progressPhotos.ts:77,96 (ProgressPhotos_add, _removeTakenAt); bearComparison.ts:28 BearComparison_all; bearThemeColors.ts:60 BearThemeColors_monoOverrides; foodMicros.ts:69,73 (FoodMicros_row, _isKey); homeToday.ts:3 HomeToday_card; liftEquivalents.ts:55,86 (LiftEquivalents_all, _count)`
  - Scenario: Each name appears once in src (its definition) and at least once in test/. No other src, lambda or api file calls it. The test keeps the code looking alive. FoodLog_copyDay and IconCopyDay together show a copy-day feature with no button. FreeExerciseDbImages_allIds is used by scripts/importFreeExerciseDbImages.ts, so it stays.
  - Fix: Ask the owner per name, since removals need an explicit OK. For each dead name, delete the function and its test case. Keep a name only if a screen is planned for it soon.
  - Effort: 2 hours.
- **Z7. About 30 exports are used inside their own file only, and 217 types are exported for nothing**
  - Severity: low. Seen. Kind: dead.
  - File and line: `knip report (src/models/*.ts, src/utils/*.ts)`
  - Scenario: The remaining function exports in knip are called only inside the same file. 33 of them also have no test, for example OfflineOnly_allowedOrigins, PRESSED_ATTRIBUTE, CloudBackup_ownerQuestion, Season_all, RecipeCatalog_book, BodyScanMassShare_toMass and PlusOffer_afterNavigationMs. All 217 type exports are used in their own file only.
  - Fix: Drop the export keyword from these names. Do it in one pass with knip --fix on our files only.
  - Effort: 1 hours.
- **Z8. Bear lifting sprite branch can never run**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/bearArt.ts:23-35; test/bearArt.test.ts:45-55`
  - Scenario: BearArt_liftingSizes is an empty constant. BearArt_cardSprite picks a lift-<size>.webp path only when the size is in that list. No lift-*.webp file exists in images/bear/brown. Only a test passes a non-empty list.
  - Fix: Remove BearArt_liftingSizes and the liftingSizes branch. BearArt_cardSprite then returns BearArt_sprite(..., 'pumped'). Update the two test cases.
  - Effort: 0.25 hours.
- **Z9. Calorie pill and logged-ago text on the progress dashboard still have no screen**
  - Severity: low. Seen. Kind: dead. Still open from the 26 October audit: H1.
  - File and line: `src/models/progressDashboard.ts:36-47,64-82,100-102; test/progressDashboard.test.ts:78-83`
  - Scenario: screenProgressDashboard.tsx reads only nutrition.daysLogged, ProgressDashboard_days and ProgressDashboard_workoutsLine. ProgressDashboard_caloriesPill and ProgressDashboard_loggedAgo have no caller in src. The build still runs caloriesStatus on every render for nutrition.today, which nothing reads. progressHub.ts has its own private loggedAgo that does the same job.
  - Fix: Delete ProgressDashboard_caloriesPill, ProgressDashboard_loggedAgo, caloriesStatus, IProgressCaloriesStatus and nutrition.today, with their tests. Or wire the pill into the screen.
  - Effort: 0.5 hours.
- **Z10. Two loggedAgo rules**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/progressDashboard.ts:64-69; src/models/progressHub.ts:60`
  - Scenario: Both files write the same Logged today / yesterday / N days ago text. Only the progressHub copy is used.
  - Fix: Fixed by deleting the dashboard copy in the dead-pill finding.
  - Effort: 0 hours.

## Findings from the 26 October audit

- H1: partly fixed. The test failure is fixed: caloriesStatus in src/models/progressDashboard.ts:36-47 returns none when FoodLog_hasGoals is false, and test/progressDashboard.test.ts:132-141 covers it. test/progressDashboard.test.ts, test/badgeCelebration.test.ts, test/bearStoreData.test.ts and test/glassSurface.test.ts all pass (31 passing). The unused pill is still open: ProgressDashboard_caloriesPill has no screen.

## Checked with no finding

- All 7 files confirmed unused: no import, no .native or .web pair that imports them, no dynamic require, no string reference in src, lambda, api, scripts, test or package.json. BadgeCard is only imported by badgeUnlockedSheet.tsx. BearLook is only imported by bearLookSheet.tsx and test/bearStoreData.test.ts. GlassBar has a .native twin, and that twin is unused too.
- Packages: nothing in package.json that only dead parts need except @callstack/liquid-glass. @react-native-community/blur stays (locker.native.tsx). react-native-nitro-image has no import but is a peer dependency of react-native-vision-camera 5.0.11, so it stays.
- Knip lists many dependencies as unused (codemirror, prismjs, openai, zingtouch, pulltorefreshjs, aws-cdk-lib, constructs, upng-js and others). They are Liftosaur packages. I grepped src, lambda, api, scripts, test and root config for imports and found none for most of them. That is outside our added code, so I did not rule on it.
- @zxing/browser and @zxing/library (foodBarcodeScanner.tsx), react-native-purchases and -ui (purchases.native.ts), react-native-vision-camera (foodBarcodeScanner.native.tsx) and @vercel/oidc (api/_ai.mjs) are all imported.
- Images: every file in images/bear (brown, gyms, house, phone), images/recipes and images/exercises/demo is named in src, a manifest or a require map in bearImage.native.ts. All 194 small and 194 large exercise photos match the ids in freeExerciseDbImages.ts. Every landing/a and landing/b image is named in its index.html. icons/launch files are linked from src/index.html.
- Exports: all 190 function exports listed by knip have a test or an in-file caller. The 7 with no caller anywhere except their definition and no test are in the dead-exports finding.
- api/*.mjs and scripts/* knip entries treated as false positives, as the brief says.
- badgeUnlockedSheet, bearAvatar, bearLookSheet, foodSearchBar and glassBar hold no logic that breaks a rule or crashes. They are dead, so no bug hunt.
