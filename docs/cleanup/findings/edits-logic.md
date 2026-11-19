# Phase 1 findings: Our edits to Anton's files: models, utils, state

Slice `edits-logic` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 3 medium, 5 low. 0 dropped by the checker.
Coverage: 86 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **L1. A new set copies the last set's effort rating**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/models/set.ts:129-171`
  - Scenario: Rate a set Too hard, then tap Add set. A scratch run shows the new set already holds completedEffort hard. Tick it and the old rating counts, so the exercise colour and the strip are wrong. The plain, ad-hoc and warm-up branches all keep it.
  - Fix: In Reps_addSet and adhocSetFrom, set completedEffort to undefined next to completedRpe. Add a case in test/setAddSet.test.ts.
  - Effort: 0.5 hours.
  - Checker: keep. All three Reps_addSet branches (plain, warm-up, adhocSetFrom) clone the last set and clear completedRpe but never completedEffort, and EffortRating and history.ts count completedEffort once the new set is ticked.
- **L2. Corrupted local data in the offline build is never saved before reset**
  - Severity: medium. Seen. Kind: data.
  - File and line: `src/ducks/reducer.ts:148-152, src/navigation/modals/NavModalCorruptedState.tsx`
  - Scenario: In the offline build, stored data fails Storage_get. getInitialState sets corruptedstorage with backup false and loads the default storage. The raw text is not copied anywhere. The modal says to contact the developer. After Reset, the next save overwrites the damaged data, so nobody can repair it.
  - Fix: In the OfflineOnly branch, write the raw storage to a key like liftosaur_unreadable_<time> before loading the default. Show a different modal text that names the export.
  - Effort: 1.5 hours.
  - Checker: keep. The OfflineOnly branch in getInitialState sets backup false and loads Storage_getDefault without copying the raw storage, and after Reset clears corruptedstorage the reducer's scheduleSave writes the default storage over the same key.
- **L3. The JSON export counts as a backup but leaves out food, notes, runs and bear**
  - Severity: medium. Seen. Kind: data.
  - File and line: `src/ducks/thunks.ts:1783-1788, src/ducks/thunks.ts:1560-1573`
  - Scenario: Thunk_exportStorage writes only the workouts storage, then calls BackupReminderMarks_recordBackup. The weekly reminder stops. Food log, notes, runs, scans and bear honey are in no file. The reminder text also tells the user to tap the JSON export, not Export everything.
  - Fix: Record the backup mark only in Thunk_exportEverything. Change BackupReminder_message to name Export everything.
  - Effort: 0.5 hours.
  - Checker: keep. Thunk_exportStorage writes only the IStorage JSON but calls BackupReminderMarks_recordBackup, while the food, notes, runs, scans, bear and other stores go only into FullBackupFile_build, and BackupReminder_message tells the user to tap "Export data to JSON file".

## Low

- **L4. A set with a 0 weight target counts as done at any reps**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/models/set.ts:250-262`
  - Scenario: A program set has target 10 reps at weight 0kg (for example a written 0lb bodyweight set). Log 3 reps at 0kg and tick it. Reps_movedAtLeastTarget compares 0 to 0 and returns true, which a scratch run confirmed. The old per-field check gave false.
  - Fix: In Reps_movedAtLeastTarget, use the volume check only when set.weight and completedWeight are above 0. Otherwise use the per-field check. Add a test in test/set.test.ts.
  - Effort: 0.5 hours.
- **L5. The backup reminder reads the cloud store before it checks the offline flag**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/ducks/thunks.ts:1560-1573`
  - Scenario: Thunk_maybeRemindBackup awaits CloudStore.load() on every launch that shows no other modal. Online builds then drop out at the OfflineOnly check. The sibling thunks wrap their body in try/catch with Rollbar. This one does not.
  - Fix: Test OfflineOnly_isEnabled first and return. Then read the marks. Wrap the body in try/catch like Thunk_maybeRequestHearAboutUs.
  - Effort: 0.25 hours.
- **L6. Two default rounding rules for the same exercise setting**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/equipment.ts:99-110, src/models/exercise.ts:4508-4511`
  - Scenario: Equipment_exactWeightStep falls back to 1 kg or 2.5 lb. Exercise_defaultRounding falls back to 2.5 kg or 5 lb and keeps a 0.1 floor. Both read exerciseData.rounding. Weight_increment also adds the step in the weight's unit, not the equipment unit, so a kg dumbbell with a lb weight steps by 1 lb.
  - Fix: Put the two defaults in one named constant in equipment.ts. Convert the step to weight.unit in Weight_increment and Weight_decrement. Add a mixed-unit test in test/weight.test.ts.
  - Effort: 1 hours.
- **L7. Two bear image exports have no callers and keep dino names**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/utils/imagePreloader.native.tsx:47-51, src/utils/imagePreloader.tsx:22-26`
  - Scenario: ImagePreloader_dynocoach and ImagePreloader_dynohappy are used nowhere. All three dyno exports now point at the same bear level-01 image, so the names are wrong. Only ImagePreloader_dynoflex is used, in src/components/statsList.tsx.
  - Fix: Delete the two unused exports. Rename ImagePreloader_dynoflex to ImagePreloader_bear and update statsList.tsx.
  - Effort: 0.25 hours.
- **L8. The exercise page share image still points at liftosaur.com**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/models/exerciseImage.ts:53-55, src/pages/exercise/exerciseHtml.tsx:72`
  - Scenario: ExerciseImageUtils_ogImageUrl now returns a free-exercise-db path such as /images/exercises/large/<id>.jpg. exerciseHtml.tsx prefixes it with https://www.liftosaur.com, which does not serve that path. Nothing ran it.
  - Fix: Use ProgramsHost_fork as the prefix in exerciseHtml.tsx, or drop the page if the fork does not serve it.
  - Effort: 0.5 hours.

## Findings from the 26 October audit

- H2: fixed. exercise.ts and settings.ts now pass eslint. The Settings_toggleStarred and Exercise_applyCustomExerciseChange hunks were reformatted. liftohistoryParser.ts has the no-template-curly-in-string disable comments at both table lines.
- D2: fixed. Commit bbdb7502. IndexedDBUtils_get takes a strict flag and runTransaction rejects. JsonStore read() uses it, and loadStrict is used by fullBackupFile.ts. The never-resolving promise for a null db is gone.
- D5: fixed. Commit bbdb7502. jsonStore.ts copies the raw text to the _unreadable key, then offerRecovery gives Restore from cloud or Start again.

## Checked with no finding

- src/models/exerciseImage.ts rewrite keeps the custom-image path. Old liftosaur.com custom URLs are hidden but not deleted. test/exerciseImage.test.ts passes.
- Ran set, weight, exercise, exerciseImage, statsScaleReadings, effortRating, workoutMenuActions and programsHost tests: 83 passing.
- eslint is clean on exercise.ts, settings.ts, liftohistoryParser.ts, exporter.ts, set.ts, thunks.ts, screen.ts, indexeddb.ts, equipment.ts.
- Migrations 20261021120000 and 20261027120000 sort after the last upstream key. Both are idempotent and tested. Legacy RPE 6, 8, 10 move only after 2026-10-20 and not on logRpe sets.
- Thunk_importStorage restores the side stores with undo on failure before it replaces storage. FullBackupFile_restore rolls back.
- ForkServices_plan gates in appEnv, analytics.native, eventManager.native, posthog, log and signIn.native match optional IEnv fields. env.iap and env.push are optional and every caller guards them.
- Thunk_pushScreen: PlusAccess_screenFeature still gates musclesProgram, musclesDay and graphsList. The new screensWithoutCurrentProgram entries are fine.
- Weight_calculatePlates exact-step branch returns the weight in its own unit, same as the old no-equipment branch.
- exporter.ts share path falls back to a link download on any error except AbortError. exporter.native.ts Exporter_toZip uses fflate, which is in package.json.
- tailwindConfig.ts bear class is set on the html tag in src/index.html. Theme_applyMonochrome toggles mono.
- Android readDailySteps returns an empty list on purpose. stepsStore.ts is the only caller.
- Subscriptions_isUnlockedByFork is a constant true, so the store purchase code is unreachable by design. Not reported.
