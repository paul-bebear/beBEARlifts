# Phase 1 findings: Bear

Slice `bear` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 2 medium, 12 low. 0 dropped by the checker.
Coverage: 78 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **R1. Bear, house calendar and bowl keep yesterday's date after the app stays open overnight**
  - Severity: medium. Suspect. Kind: bug.
  - File and line: `src/utils/useBear.ts:38-52, src/utils/useBearHouse.ts:17-27`
  - Scenario: Open the app in the evening and leave it in the background. Open it next morning on the home screen. Both hooks read Date.now() inside useMemo. The deps hold no clock, only isFocused in useBear. If nothing else changes, the calendar date, bowl fullness, mood and board lines show the old day.
  - Fix: Add a day key (FoodLog_dayKey(new Date())) read on each focus and on AppState 'active' to the useMemo deps of useBear and useBearHouse. Compute the key in a small pure helper with a test.
  - Effort: 2 hours.
  - Checker: suspect. Both memos read Date.now() with no clock or day key in their deps, and isFocused does not change on an app wake, but the AppState 'active' handler in App.native.tsx runs Thunk_sync2 and other thunks that may replace the history, stats or foodLog references and recompute the memos, so whether the old day stays on screen depends on runtime sync behaviour.
- **R2. Weight line says 'in 30 d' for any span**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/models/bearBoard.ts:96-107`
  - Scenario: The base entry is the newest weigh-in at or before 30 days ago, or entries[0] if none. A user who weighed in 200 days ago and today sees '+5.0 in 30 d'. A user whose first weigh-in was 10 days ago sees the same label for a 10 day change.
  - Fix: In weightLine, compute the real day span between base and latest and print it ('in 10 d'). Drop the change line when the span is over 60 days. Add cases to test/bearBoard.test.ts.
  - Effort: 1 hours.
  - Checker: keep. weightLine always prints the constant trendDays (30) in the label, but base falls back to entries[0] when no weigh-in is 30 or more days old, and it is the newest entry at or before the window start, so the real span can be 10 days or 200 days.

## Low

- **R3. A second workout on the same day does not count for the bear's mood**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/models/bearGrowth.ts:131-134, src/models/bear.ts:45-46`
  - Scenario: Train at 8am, then train again at 7pm. BearGrowth_history skips the second record with 'continue', so it is not in workouts. lastCountedWorkoutAt stays at 8am. At 8pm the bear is not 'pumped' and the energy clock runs from 8am.
  - Fix: Keep skipped same-day records in a separate list. Use the newest finished record for lastCountedWorkoutAt, and keep countedKg at 0 for the extras. Add a test in test/bear.test.ts.
  - Effort: 1.5 hours.
- **R4. Badges '100 workouts', Early bear and Night bear count workouts the bear ignores**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/models/bearBadges.ts:168-193`
  - Scenario: BearBadges_compute loops over all history records. The growth rule counts only workouts of 10 minutes or more with a completed set, one per day. A 3-minute or empty record counts toward '100 workouts', and gives the Early bear badge. The same record gives the bear no growth.
  - Fix: Pass the counted workouts (sources.workouts) to the per-record loop, or filter history with the growth eligibility rule. Export that rule from bearGrowth.ts.
  - Effort: 1.5 hours.
- **R5. The 'beat a previous best' rule is written three times**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/bear.ts:55-57, src/models/bearBadges.ts:163-165, src/models/workoutStoryCard.ts:179`
  - Scenario: Each copy tests prevMaxWeightSet != null || prevMax1RMSet != null. A change to what counts as a PR (for example the bodyweight rule) must be made three times. One copy left behind makes the mood, the First PR badge and the share card disagree.
  - Fix: Add History_hasBeatenPrevious(prs, recordId) in src/models/history.ts with a test. Call it from the three places.
  - Effort: 1 hours.
- **R6. Badge celebration sheet hook has no caller**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/utils/useBearBadges.ts:61-101, src/models/badgeCelebration.ts, test/badgeCelebration.test.ts`
  - Scenario: useBadgeCelebration, BadgeCelebration_step, BadgeCelebration_next and BadgeCelebration_isLevelUpDue are used only by each other and by their test. No component calls the hook. The store fields seenBadges and badgesSeeded exist only for it.
  - Fix: Delete the hook, badgeCelebration.ts and its test. Then drop seenBadges and badgesSeeded from IBearStoreData and the parse, keeping old saved data readable. Or wire the sheet in if it is still planned.
  - Effort: 1.5 hours.
- **R7. The honey 'spent' field is stored and backed up but never read**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/bearStoreData.ts:11,17,39, src/models/fullBackup.ts:41`
  - Scenario: Honey left the house. Nothing in src reads or writes spent except the parser, the empty store and the backup help text. It stays in every backup file.
  - Fix: Remove spent from IBearStoreData and BearStoreData_parse. Remove the backup help sentence. Update test/bearStoreData.test.ts line 40.
  - Effort: 0.5 hours.
- **R8. The 'New' pill path of the house is never switched on**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/bearHouse.ts:222-250`
  - Scenario: BearHouse_objects takes a 'seen' set. Every caller (useBearHouse, houseTourConfig, houseArrange) passes undefined. So isNew is always false, the 'New' pill never shows, and IBearHouseObject.isNew has no reader.
  - Fix: Remove the seen parameter, isNew and the 'New' pill branch. Update test/bearHouse.test.ts.
  - Effort: 1 hours.
- **R9. Lifting-pose sprite branch points at files that do not exist**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/bearArt.ts:23-35`
  - Scenario: BearArt_liftingSizes is an empty array, so the lift-{size}.webp branch of BearArt_cardSprite never runs. No lift-*.webp file exists in images/bear/brown. The test only asserts the list is empty.
  - Fix: Remove BearArt_liftingSizes and the liftingSizes parameter. Make BearArt_cardSprite return the pumped sprite. Update test/bearArt.test.ts.
  - Effort: 0.5 hours.
- **R10. Exports that only tests call**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/bearComparison.ts:28, src/models/bearThemeColors.ts:60, src/models/bearHouse.ts:112, src/models/bearBadges.ts:127, src/components/badgeCoin.tsx:47-52`
  - Scenario: BearComparison_all, BearThemeColors_monoOverrides, BearHouse_images and BearBadges_all have no caller in src. IBearBadgeInfo.image is never set, so the Image branch in BadgeCoin never renders.
  - Fix: Delete the four exports with their tests. Delete the image field and the Image branch in BadgeCoin.
  - Effort: 1 hours.
- **R11. One-off manifest script still in scripts/**
  - Severity: low. Seen. Kind: dead.
  - File and line: `scripts/house-manifest-tall.ts`
  - Scenario: The script moved the manifest to the tall canvas once. A rerun prints 'already on the tall canvas' and exits. It reads a gymExit slot the manifest no longer has, so it fails on any older manifest.
  - Fix: Delete the script. HOUSE_HOME_PLAN.md already records the numbers.
  - Effort: 0.25 hours.
- **R12. Unreachable branch in workoutMinutes**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/bearGrowth.ts:43-49`
  - Scenario: The guard above returns 0 when endTime <= startTime or an interval end is null or before its start. The condition endTime === 0 || interval end === 0 cannot then be true for real timestamps. The reduce branch never runs.
  - Fix: Remove the conditional and always call History_workoutTime(record) after the guard. Run test/bearGrowth.test.ts.
  - Effort: 0.5 hours.
- **R13. Every screen that calls useBear re-reads the whole history on each focus change**
  - Severity: low. Suspect. Kind: waste.
  - File and line: `src/utils/useBear.ts:38-52, src/utils/useBearBadges.ts:38`
  - Scenario: Home, journal, feed toggle, streak and the finish banner each run Bear_state. That runs BearGrowth_history and History_getPersonalRecords over all history. isFocused is in the deps, so each focus or blur runs it again. useBearBadges runs the PR pass a second time. A user with years of workouts pays this on each tab switch.
  - Fix: Share one Bear_state result through a store or context. Compute the PR check for the last record only.
  - Effort: 3 hours.
- **R14. useBearHouse re-renders on every cloud or friends store change**
  - Severity: low. Suspect. Kind: waste.
  - File and line: `src/utils/useBearHouse.ts:15-16`
  - Scenario: CloudStore.use() and FriendsStore.use() return whole stores. The hook needs only the user id and the count of incoming requests. Any sync status change re-renders the home screen and rebuilds the house objects.
  - Fix: Use a selector, or subscribe to a derived value, so the hook re-renders only when userId or the pending count changes.
  - Effort: 1 hours.

## Findings from the 26 October audit

- D6: fixed. BearStoreData_parse in src/models/bearStoreData.ts:25-42 now parses each field with its own fallback (commit f5300b55). One bad celebratedLevel no longer resets spent, line or fur. test/bear.test.ts:280 covers celebratedLevel 1.5.
- H3: fixed. The bearScene.tsx half is gone. src/components/bearScene.tsx was deleted in b8962662, and the breathing effect now lives in src/utils/useBearBreathing.ts:30-52. That folder is outside the lint-views view dirs and has no baseline entry, so the 23-line effect is no longer asked about. The screenReportsHub half is outside this slice.

## Checked with no finding

- BearTier_progress and BearTier_floorKg: level never drops, female thresholds round to 1000 kg, tests pass
- BearCelebration_seed and _step: seeded flag stops replay of old levels
- BearPlan_text: output for the three builtin md files matches programs/builtin/bebear-*.md byte for byte
- BearPlanSlots_table: every slot has a floor or gym pick path, covered by test/bearPlan.test.ts golden files
- BearHouse_objects, HouseFrame_fit and HouseArrange_reduce: 924 tests in the bear, house, badge and share card files pass
- BearBoardSize_layout: heights and widths clamp to a minimum, no division by zero
- bearHouseScene.tsx, houseArrange.tsx, bearSceneParts.tsx: no decision over 20 lines in a .tsx file; none over 400 lines
- HouseArrange tool on web via ?arrange=1: local state and copy only, no network or data write
- useBearBreathing: cleans up the animation and the listener, respects Reduce Motion
- BearFinishBanner: reads the store through BearStore.update so a double mount does not celebrate twice
