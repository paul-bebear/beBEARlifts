# Phase 1 findings: App shell and shared UI

Slice `shell` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 0 medium, 11 low. 0 dropped by the checker.
Coverage: 38 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Low

- **U1. HomeToday_card and its type have no caller**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/homeToday.ts:1-8`
  - Scenario: grep finds HomeToday_card and IHomeTodayCard only in test/homeToday.test.ts. Only HomeToday_historyLabel is used, by journalDay.ts.
  - Fix: Delete HomeToday_card and IHomeTodayCard and their test cases. Keep HomeToday_historyLabel.
  - Effort: 0.25 hours.
- **U2. QuickActions_inProgressLine has no caller**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/quickActions.ts:59-64`
  - Scenario: Only test/quickActions.test.ts calls QuickActions_inProgressLine. No screen shows the line.
  - Fix: Delete the function and its test, or wire it into the home screen if the line is wanted.
  - Effort: 0.25 hours.
- **U3. isSoon and quickActionsSoon never become true**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/quickActions.ts:9,28,31-35; src/components/plusSheet.tsx:43,49,58`
  - Scenario: Every square sets isSoon to false. The Soon label and the dimmed icon branch in plusSheet.tsx can never run.
  - Fix: Remove isSoon, quickActionsSoon and the three branches in plusSheet.tsx.
  - Effort: 0.5 hours.
- **U4. Day windows use 24-hour maths and drift on daylight-saving days**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/models/localDay.ts:1; src/models/progressDashboard.ts:55-56,102; src/models/progressHub.ts:109`
  - Scenario: windowStart is LocalDay_start(now) minus N times LocalDay_ms. A window with a 25-hour day starts 1 hour after local midnight. A workout logged at 00:30 on the first day drops out of the count and the week streak. The test only covers LocalDay_between, which rounds.
  - Fix: Add LocalDay_shift(timestamp, days) using setDate, test it across both DST changes, and use it in the three places. Then drop the exported LocalDay_ms.
  - Effort: 1 hours.
- **U5. Home bear board keeps yesterday's Done-today state after midnight**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/components/screenHome.tsx:81-102`
  - Scenario: now is read on each render but is not in the useMemo deps of lines. Leave the app open on Home past midnight and nothing re-renders. The pill and board still say Done today or yesterday's day name until some store changes.
  - Fix: Add now truncated to the local day (LocalDay_start(now)) to the deps, or recompute lines without useMemo.
  - Effort: 0.5 hours.
- **U6. Tap routing decisions live in screenHome.tsx**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/screenHome.tsx:30-65`
  - Scenario: openBoardTarget and openHouseTarget decide which screen, tab or sheet each target opens. openHouseTarget is 23 lines. No test covers either. The CLAUDE.md rule says decisions live in a tested module.
  - Fix: Move both to src/models/homeTargets.ts returning a navigation command, with test/homeTargets.test.ts. The component runs the command.
  - Effort: 1.5 hours.
- **U7. Same-local-day rule written with FoodLog_dayKey and with LocalDay_start**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/todayPill.ts:23-25; src/models/progressDashboard.ts:100-102`
  - Scenario: TodayPill_text compares FoodLog_dayKey strings. progressDashboard.ts uses FoodLog_dayKey for one window and LocalDay_start for the next, in the same function. Two ways to say today.
  - Fix: Use LocalDay_between(a, b) === 0 in TodayPill_text, or move all day maths into localDay.ts.
  - Effort: 0.5 hours.
- **U8. The home route name main is written in two modules**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/tabBarLayout.ts:13; src/models/tabRouting.ts:43`
  - Scenario: tabBarLayout.ts has plusScreen = main. TabRouting_showsBack compares routeName to the literal main. Renaming the route breaks one silently.
  - Fix: Export one homeRootScreen constant and use it in both.
  - Effort: 0.25 hours.
- **U9. pillKinds repeats the keys of kindClasses**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/pillButtonClasses.ts:3-9`
  - Scenario: Adding a pill kind needs two edits. Forgetting pillKinds makes Button skip the pill path with no error.
  - Fix: Make PillButtonClasses_isPill check kind in kindClasses and delete pillKinds.
  - Effort: 0.25 hours.
- **U10. TickRow_toggle, imageResize, useReduceMotion and the nav hooks have no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/components/tickRow.tsx:29-37; src/utils/imageResize.ts; src/utils/useReduceMotion.ts; src/navigation/useIsShownUnderSheets.ts`
  - Scenario: TickRow_toggle is pure logic inside a .tsx file with no test. The scale and size maths in ImageResize_toJpegDataUrl has no test. Zero-size images give a 0 by 0 canvas and an empty data URL.
  - Fix: Move TickRow_toggle to src/models/checkedSet.ts with a test. Extract the scaled-size maths from imageResize.ts, test it, and throw on a zero side.
  - Effort: 1 hours.
- **U11. PullToRefresh tests sit in workoutFeed.test.ts**
  - Severity: low. Seen. Kind: name.
  - File and line: `test/workoutFeed.test.ts:433-445; src/models/pullToRefresh.ts`
  - Scenario: pullToRefresh.ts has no test file of its own. Its cases hide in the feed test. Only screenFriends.tsx uses the module. It has no cancel step, so a touch cancel leaves the pull state set.
  - Fix: Move the describe block to test/pullToRefresh.test.ts. Add PullToRefresh_cancel and call it from onTouchCancel in screenFriends.tsx.
  - Effort: 0.5 hours.

## Findings from the 26 October audit

- H4: fixed. package.json:85 now has a pretest script running ensure:localdomain, build:markdown, build:programs and build:exercises. engines.node is 22.x at package.json:99. The test script is node scripts/run-tests.mjs (line 86). I did not run npm test on a fresh checkout.

## Checked with no finding

- TabRouting functions: all six have a caller and cases in test/tabRouting.test.ts
- TabBarLayout functions: all used by NavScreenFooter2, NavScreenContent, screenFoodAdd or dayLiftoEditorInline, and tested
- ScreenUnderSheets_isShown: handles partial states and has a test; useIsShownUnderSheets has one caller and cleans up its listener
- GlassSurface_pick and GlassSurface_lensColor: used by glassBar.native.tsx and tested
- PhotoSourceChoice_for and PhotoSourceMenu: three callers and a test
- FeatureLayer: used by reportsHub, journalDay and quickActions, tested
- TodayPill_text and TodayPill_dayName: tested, used by bearBoard and screenHome
- useReduceMotion: handles the race between the first read and the change event, and removes its subscription
- ScreenHome: no entry in lint-views-baseline.json, file is 119 lines
- useTabBarContentPadding: three callers, wraps a tested function
