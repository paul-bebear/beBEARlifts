# Phase 1 findings: Progress, body scans and steps

Slice `progress` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 0 medium, 12 low. 0 dropped by the checker.
Coverage: 51 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Low

- **P1. Progress hub computes goal, steps, photos and dashboard weight and calories that no screen shows**
  - Severity: low. Seen. Kind: dead. Still open from the 26 October audit: H1.
  - File and line: `src/models/progressHub.ts:23-31 and 143-152; src/models/progressDashboard.ts:14-18, 24-50; src/components/progressHubCards.tsx:70-111`
  - Scenario: screenProgressDashboard.tsx reads only hub.weight, hub.nutrition and hub.consistency, plus dashboard.nutrition.daysLogged and dashboard.workouts. It never reads hub.goal, hub.steps, hub.photos, dashboard.weight or dashboard.nutrition.today. ProgressStepsCard and ProgressPhotosCard have no caller. ProgressExpandRow's pill prop is never passed. ProgressDashboard_caloriesPill has only a test caller. The screen still loads the goal, steps and photo stores, and rebuilds all of it on every store change.
  - Fix: Delete ProgressStepsCard, ProgressPhotosCard, the pill prop, pillColors, IProgressHubTone use, ProgressDashboard_caloriesPill, caloriesStatus, latestWeight and the unused hub fields with their tests. Drop the three store reads from StatsSections unless a row will use them.
  - Effort: 1.5 hours.
- **P2. 'Logged N days ago' text is written twice with different edge rules**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/progressHub.ts:67-72; src/models/progressDashboard.ts:67-72`
  - Scenario: loggedAgo in progressHub.ts treats daysAgo <= 0 as today. ProgressDashboard_loggedAgo treats only === 0 as today. A weigh-in stamped slightly in the future shows 'Logged -1 days ago' in one and 'Logged today' in the other. The Dashboard copy has no caller outside its test.
  - Fix: Keep one exported function in progressHub.ts, delete ProgressDashboard_loggedAgo and its test case.
  - Effort: 0.25 hours.
- **P3. The latest weigh-in is found by the same reduce in three files**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/progressDashboard.ts:21-24; src/models/progressHub.ts:57-60; src/models/dailyChecklist.ts:119-123`
  - Scenario: Each file reduces stats.weight.weight to the newest by timestamp. A change to the tie rule or an unreadable entry has to be made three times.
  - Fix: Add Stats_latestWeight(values) in one model file and call it from the three places.
  - Effort: 0.5 hours.
- **P4. kg to lb factor and conversion are written in three places**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/bodyScans.ts:187-194; src/models/bodyScanRead.ts:11,40,61`
  - Scenario: bodyScans.ts has BodyScans_massIn with lbPerKg = 2.20462. bodyScanRead.ts declares its own lbPerKg and converts by hand in BodyScanRead_parse and BodyScanRead_merge. The app's Weight model converts a third way. Rounded values can differ by a tenth between screens.
  - Fix: Have bodyScanRead.ts call BodyScans_massIn. Take the factor from the Weight model if it has one.
  - Effort: 0.5 hours.
- **P5. Day streak is computed from doneDays in three places**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/screenJournal.tsx:252; src/models/bearBoard.ts:82-83; src/utils/useBearBadges.ts:40,57`
  - Scenario: Each calls DailyChecklist_doneDays then DailyChecklist_streak with its own inputs. If one adds a source (a run, a check-in), the home streak, the Streak screen and the bear board disagree.
  - Fix: Add DailyChecklist_streakOf(sources, today) in dailyChecklist.ts and call it from all three.
  - Effort: 0.75 hours.
- **P6. Calendar dots and the streak assign a workout to different days**
  - Severity: low. Seen. Kind: data.
  - File and line: `src/models/monthCalendar.ts:75-77; src/models/dailyChecklist.ts:174-176`
  - Scenario: MonthCalendar_workoutDays uses startTime. DailyChecklist_doneDays uses endTime ?? startTime. A workout that starts at 23:40 and ends at 00:20 shows its dot on day 1, but the streak counts day 2. The Streak screen draws doneDays, so it follows the streak, while the journal calendar and check-in chart follow startTime. ProgressDashboard and ProgressHub also count by startTime.
  - Fix: Pick one rule (startTime is what History shows) and use it in both functions. Add a test with a workout that crosses midnight.
  - Effort: 1 hours.
  - Checker: keep. MonthCalendar_workoutDays keys by startTime while DailyChecklist_doneDays keys by endTime ?? startTime, and bearBoard.ts uses both, so a workout that crosses midnight lands on different days; the effect is only a dot or streak day on the wrong date for rare late-night sessions, and no data is lost.
- **P7. Save scan can be tapped twice and stores the scan twice**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/components/screenBodyScans.tsx:129-146, 207`
  - Scenario: save awaits BodyScanStore_update before it clears the form, and the Save button is disabled only while a photo is being read. Two quick taps run BodyScanMassShare_fromForm twice with different Date.now() ids. Two scans and two weight and body-fat stat points are written.
  - Fix: Add a saving flag that disables the button, or clear the form before the first await. Better, move the save rule (store write plus stats write) to a function in bodyScans.ts that returns the stats to dispatch.
  - Effort: 1 hours.
- **P8. Save rule and week-boundary maths sit inside view functions**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/screenBodyScans.tsx:129-146; src/components/screenProgressDashboard.tsx:128-146`
  - Scenario: ScreenBodyScans.save decides which stats to write (weight, percentages) after a scan. StatsSections builds the this-week and last-week ranges inline in a useMemo. Both are decisions with no JSX and no test. Neither is in scripts/lint-views-baseline.json.
  - Fix: Move the stats decision into bodyScans.ts (a BodyScans_saveEffects(scan) returning what to write). Move the week ranges into a progressHub.ts function with a test.
  - Effort: 1.5 hours.
- **P9. A steps count typed with a decimal point is read as a much larger number**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/models/steps.ts:107-111`
  - Scenario: Steps_parseCount removes every comma, dot and space. On the web the user types '8.5' and gets 85 steps. '1.5' gives 15. The test covers only '12,345'.
  - Fix: Reject input with one dot or comma followed by fewer than three digits. Add that case to test/steps.test.ts.
  - Effort: 0.5 hours.
- **P10. Photo and equivalent helpers with no caller in src**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/progressPhotos.ts:77-83 and 103-105; src/models/liftEquivalents.ts:55-57`
  - Scenario: ProgressPhotos_add and ProgressPhotos_removeTakenAt are called only by tests. The native and web file stores use ProgressPhotos_insert and ProgressPhotos_remove. LiftEquivalents_all is called only by a test.
  - Fix: Delete the three functions and their test cases, or move the tests onto ProgressPhotos_insert.
  - Effort: 0.5 hours.
- **P11. Weekday-of-a-day-key code is written in steps.ts and dailyChecklist.ts**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/steps.ts:154-157; src/models/dailyChecklist.ts:69-72`
  - Scenario: Both split 'YYYY-MM-DD', build a noon Date and call getDay. monthCalendar.ts has a third month parser. A fix for one is missed in the others.
  - Fix: Add FoodLog_weekday(day) next to FoodLog_shiftDay and use it in both.
  - Effort: 0.25 hours.
- **P12. Photo file cap comes from the old data-URL limit**
  - Severity: low. Suspect. Kind: name.
  - File and line: `src/models/progressPhotos.ts:23-27; src/utils/progressPhotoFiles.native.ts:25-28`
  - Scenario: ProgressPhotoFiles_put refuses a photo when its data URL is over 1 MB. That cap was meant for the single MMKV value (comment: stops IndexedDB filling). Photos are now files on the phone, so the cap rejects a valid large JPEG with the 'out of space' message, which is wrong.
  - Fix: Apply the 1 MB cap only on the web path. On the phone check the base64 pattern only, and give a size-specific message.
  - Effort: 0.75 hours.

## Findings from the 26 October audit

- H1: partly fixed. test/progressDashboard.test.ts passes now: caloriesStatus returns none when FoodLog_hasGoals is false. ProgressDashboard_caloriesPill is still unused by any screen, so the dead-code half is open (see the dead finding).
- H3: fixed. ReportsHub_actionEffect now exists in src/models/reportsHub.ts:132 with tests in test/reportsHub.test.ts. screenReportsHub.tsx open (line 78) only applies the returned effect.
- D4: partly fixed. Photos are now files with an index (ProgressPhotoFiles_put and _migrate in src/utils/progressPhotoFiles.native.ts). FullBackupFile includes the photo index and progressPhotoCloud.ts uploads each file. Web still keeps data URLs in one IndexedDB value. The 1 MB cap still applies to files (see the name finding).

## Checked with no finding

- src/models/bodyFatEstimate.ts: Navy formula inputs checked, used by goalWizard, tested in bodyFatEstimate.test.ts
- src/models/checkInTrend.ts: segments break on missing days, 4 tests pass
- src/models/monthCalendar.ts: grid maths and visibleWeeks, 6 tests pass
- src/models/steps.ts merge keeps manual counts, prune keeps 400 days, 9 tests pass
- src/models/bodyScanMassShare.ts and bodyScans.ts: percent to mass conversion and unit change, tests pass
- src/models/bodyScanRead.ts: JSON parse guards and permission flow, 18 tests pass
- src/navigation/screens/NavScreen*.tsx: thin wrappers, no logic
- src/utils/useStepsHealthSync.ts: effect cleans up its AppState listener
- src/components/screenStreak.tsx and progressCalendarHeader.tsx: view only, calendar built by monthCalendar.ts
- src/utils/progressPhotoPick.ts: web picker only, native has its own file
