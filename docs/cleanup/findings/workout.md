# Phase 1 findings: Workout

Slice `workout` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 3 medium, 11 low. 0 dropped by the checker.
Coverage: 60 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **W1. Coach's note overwrites answers given while it loads**
  - Severity: medium. Seen. Kind: data.
  - File and line: `src/components/workoutReportCard.tsx:34-42 and :67`
  - Scenario: User taps Get the coach's note. The AI call takes seconds. Meanwhile the user taps Hurt on an item. The note arrives and save({ ...report, summary }) writes the old report object, so the answer is gone. The note also never saw that answer.
  - Fix: In writeSummary, call ReportStore.update with a WorkoutReport_withSummary(log, workoutId, text) function that edits the stored report. Add that function to workoutReport.ts with a test. Do the same for answers.
  - Effort: 1.5 hours.
  - Checker: keep. writeSummary closes over the render-time report and WorkoutReport_put replaces the whole stored report, so an answer saved while ReportApi_summary is pending is overwritten when the note arrives.
- **W2. Warmup card is dead text when AI features are declined**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/components/workoutWarmupCard.tsx:62-72`
  - Scenario: User declines AI in the consent sheet. AiConsent_showFeatures is false. With no plan the card shows 'Warm up for today's lifts' and no button. WarmupPlan_rules, the offline warmup, can only be reached after a failed AI call, so it never runs.
  - Fix: Show the Make my warmup button always. When AI is declined or fails, build the plan from WarmupPlan_rules directly. Move that choice into a warmupPlan.ts function with a test.
  - Effort: 1 hours.
  - Checker: keep. With consent declined showAi is false, so the plan-less card (shown only when OfflineOnly_isEnabled) has no button, and WarmupPlan_rules is called only inside generate after a failed AI call.
- **W3. Reordering days leaves nextDay pointing at a different day**
  - Severity: medium. Suspect. Kind: data.
  - File and line: `src/models/programDayOrder.ts:197-219 and src/components/editProgram/programPlanView.tsx:77-106`
  - Scenario: Next workout is day 3, Legs. User moves Legs to position 1 in the Plan tab. ProgramDayOrder_apply saves the planner but never changes program.nextDay, so day 3 is now another lift day. No test asserts nextDay after a move.
  - Fix: In ProgramDayOrder_apply, remap nextDay through the same perWeek order that oldIndexesPerWeek computes. Add a mocha case in test/programDayOrder.test.ts.
  - Effort: 1.5 hours.
  - Checker: keep. ProgramDayOrder_apply returns the draft and saved program with only planner changed, nextDay stays a position index, and WeekSchedule_today/upNextDay read that index, so after a move the next workout is whatever day now sits at the old position.

## Low

- **W4. Warmup and report stores still drop old records silently**
  - Severity: low. Seen. Kind: data. Still open from the 26 October audit: D7.
  - File and line: `src/models/warmupPlan.ts:32 and :166, src/models/workoutReport.ts:43 and :244`
  - Scenario: Cap was raised from 60/200 to 210 in bbdb7502, about one year at 4 workouts a week. A user past a year loses the oldest plans and reports with no message. The backup holds the trimmed copy.
  - Fix: Show a one-line note on the reports screen that reports older than 210 workouts are removed, as SetClips_keepNote does. Or drop the cap.
  - Effort: 0.5 hours.
- **W5. WorkoutReportCard has no caller and repeats the save rule**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/workoutReportCard.tsx:94-127`
  - Scenario: Only WorkoutReportView is imported (screenReports.tsx, test/workoutFeed.test.ts). WorkoutReportCard builds and puts a report in its own effect, the same rule as FinishDayActions_saveReport, but without the isOfflineBuild guard. It could write a second copy of the rule if someone mounts it.
  - Fix: Delete WorkoutReportCard and its imports. Rename the file to workoutReportView.tsx.
  - Effort: 0.25 hours.
- **W6. Ruler flick helpers are only used by tests**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/rulerTape.ts:262-264 and :355-370`
  - Scenario: RulerTape_flickSteps, RulerTape_flickValue and RulerTape_snap have no caller in src. Only test/rulerTape.test.ts uses them. The native picker uses only hapticAllowed and decelerationRate.
  - Fix: Delete the three functions and their test cases. ExerciseDemos_allKeys is test-only too, but the generator tests need it.
  - Effort: 0.5 hours.
- **W7. Pounds-to-kilos constant written three times, with a fourth rule in Weight_convertTo**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/programGoal.ts:63 and :253-255, src/models/foodTargets.ts:89, src/models/workoutStoryCard.ts:79, src/models/weight.ts:569-571`
  - Scenario: Three files define kgPerLb = 0.45359237. Weight_convertTo uses 2.205 and rounds to 0.5. A goal start weight shown through ProgramGoal_weightIn can differ by up to 0.25 from the same weight shown through Weight_convertTo.
  - Fix: Export one conversion from weight.ts without rounding and use it in the three files.
  - Effort: 1 hours.
- **W8. Day-order save rule runs inside ProgramPlanView**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/editProgram/programPlanView.tsx:77-106`
  - Scenario: onMove (30 lines) applies the move, dispatches to the planner, then decides whether to write the saved program to storage with CollectionUtils_setBy. That is a save rule in a .tsx file.
  - Fix: Move the planner and storage updates into a ProgramDayOrder function that returns the two lens recordings. The view only dispatches them.
  - Effort: 1.5 hours.
- **W9. Bag check sheet builds the start plan inside the component**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/gymBagCheckSheet.tsx:30-45`
  - Scenario: Two useMemo blocks pick the placeholder plan for an empty program, compute workedOutToday and build the record. These are decisions in a .tsx file. The empty-program case still dispatches Thunk_startProgramDay in WorkoutStart_go.
  - Fix: Add GymBagCheck_forProgram(program, history, settings, stats, schedule, now) to gymBagCheck.ts. Return plan and check. Test the empty-program case.
  - Effort: 1.5 hours.
- **W10. Warmup item taps use the render snapshot of the plan**
  - Severity: low. Suspect. Kind: data.
  - File and line: `src/components/workoutWarmupCard.tsx:93`
  - Scenario: Two quick taps on items 1 and 2 both call WarmupPlan_toggle(plan, i) on the same plan object. The second save writes a plan where only item 2 is ticked, so item 1 reverts.
  - Fix: Add WarmupPlan_toggleIn(log, workoutId, index) and call it inside WarmupStore_update.
  - Effort: 0.75 hours.
- **W11. Superset join can leave a one-exercise group**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/models/workoutSupersetPair.ts:30-34`
  - Scenario: Entry A is in group A with X. Partner has group B. WorkoutSupersetPair_join moves A to B. X stays alone in group A, shown as a superset of one.
  - Fix: After the join, clear the superset on any entry whose old group now has one member. Add a test.
  - Effort: 0.5 hours.
- **W12. Gym bag item regexes match inside other words**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/models/gymBagCheck.ts:109-112`
  - Scenario: /row|deadlift/i matches 'Narrow Stance Squat' or 'Medicine Ball Throw'. The bag check then asks for lifting straps.
  - Fix: Use /\brow|deadlift/i, and a test with 'Narrow' and 'Throw'.
  - Effort: 0.25 hours.
- **W13. Two exercise photos break the same-equipment rule of the map**
  - Severity: low. Suspect. Kind: data.
  - File and line: `src/models/freeExerciseDbImages.ts:64 and :72`
  - Scenario: The file header says a key is listed only when the photo shows the same equipment. frontraise_bodyweight maps to Front_Plate_Raise and gobletsquat_dumbbell maps to Goblet_Squat, which free-exercise-db shows with a kettlebell.
  - Fix: Check both photos and remove the keys that do not match.
  - Effort: 0.25 hours.
- **W14. Follow-the-week hook and WorkoutStart_go have no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/utils/useFollowWeekSchedule.ts:17-32 and src/utils/workoutStart.ts:22-27`
  - Scenario: WeekSchedule_follow is tested, but nothing tests that the hook calls EditProgram_setNextDay only when nextDay differs. Nothing tests that WorkoutStart_go sets the day only for kind today.
  - Fix: Move the nextDay !== program.nextDay check into WeekSchedule_follow's result and test WorkoutStart_go with a fake dispatch.
  - Effort: 1 hours.

## Findings from the 26 October audit

- D7: partly fixed. Warmup and report caps went from 60 and 200 to 210 in bbdb7502, with test/storeCaps.test.ts. Trimming is still silent for these two stores. Music and clips are outside this slice.
- Beat last week 2026-11-16: fixed. Reps_movedAtLeastTarget in src/models/set.ts:250-265 judges sets on weight moved (commit ac1a7d8e, #198). buildBeatScript in plannerProgramExercise.ts:611 ratchets targets and a missed set changes nothing. bearPlan.ts uses beat(step, maxReps). Both files are outside this slice, read for callers only.

## Checked with no finding

- WorkoutReport_build, weightItems, effortItems, followUps: logic and test/workoutReport.test.ts pass
- WorkoutReport_parseLog and WarmupPlan_parseLog drop bad fields item by item, not the whole store
- WeekSchedule_resolve, _today, _follow, _startChoice: no bug found, test/weekSchedule.test.ts passes
- ProgramDayOrder_move blockers and fingerprints: all builtin program tests pass
- ProgramGoal calorie path is floored by FoodTargets_fromCalories
- ExerciseDemoCache_evictions and ExerciseDemoPlayback_reduce: correct, tested
- Exercise demo media, tips and sprite bytes are checked against files by test/exerciseDemos.test.ts
- importFreeExerciseDbImages.ts pins a commit and encodes the id in the URL
- importExerciseDemos.ts uses execFileSync with an argument array, no shell injection
- rulerTape stops cache keyed by settings object, rebuilt only when settings change
- EffortRating legacy migration guarded by date and logRpe
- All 7 test files for this slice run: 196 passing
- FirstUseTips_transition and tip components: no bug found
- forkOverlays error boundary and forkSheet: no bug found
