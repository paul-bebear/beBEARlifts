# Phase 1 findings: Journal, notes and runs

Slice `journal` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 0 medium, 12 low. 0 dropped by the checker.
Coverage: 63 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Low

- **J1. Every key typed in a note or check-in rewrites the notes store and rebuilds the journal**
  - Severity: low. Suspect. Kind: waste.
  - File and line: `src/components/noteEditor.tsx:35-40, src/components/journalCheckIn.tsx:62-67, src/components/screenJournal.tsx:240`
  - Scenario: The user types in a note title, body or check-in reflection. Each key calls NotesStore.update, which reads and parses the whole notes JSON, writes it back and notifies every NotesStore.use() subscriber. ScreenJournal sits under the editor and calls JournalDay_build without useMemo. useJournalDay in the editor does the same. Each key also rebuilds the day's workout summaries. Nothing was timed.
  - Fix: Keep the text in component state and save after 400 ms of quiet and on close. Wrap JournalDay_build in useMemo keyed on its sources. Put the debounce rule in a small module with a mocha test.
  - Effort: 2.5 hours.
- **J2. A full disk raises one alert per key press while typing a note, and the rejected write is never caught**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/components/noteEditor.tsx:35-40, src/components/journalCheckIn.tsx:56-67, src/utils/jsonStore.ts:33-40`
  - Scenario: The phone is out of space. The user types 20 characters. persistValue shows Dialog_alert on each failed write and rethrows. NotesStore.update is not awaited and has no catch in change, pick or reflect, so each failure is also an unhandled promise rejection. The typed text is then lost on a restart.
  - Fix: Debounce the save as in the first finding. Catch the rejection in the component and show the failure once, with the text kept on screen.
  - Effort: 1 hours.
- **J3. The third face tap folds the check-in and hides the reflection box**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/models/journalDay.ts:121-129, src/models/journalDay.ts:196-200`
  - Scenario: The user opens today's check-in and taps energy, soreness and mood. After the third score isSectionDone is true and isOpenByUser is undefined, so JournalDay_sectionFold returns isCollapsed. The card turns into a summary row before the user writes the reflection. They must tap Show. test/journalDay.test.ts 'folds check-in scores' asserts the fold but not the reflection.
  - Fix: Keep a check-in open while the reflection is empty and the user has touched it this visit, or set isOpenByUser to true on the first pick in FoldableSection. Add a case to test/journalDay.test.ts.
  - Effort: 1 hours.
- **J4. The run share card shows the exact start and finish by default**
  - Severity: low. Seen. Kind: security.
  - File and line: `src/components/runShareCard.tsx:157-158`
  - Scenario: The user records a run from home and taps Share run. hideEnds starts false, so RunRoute_forCard keeps the whole route and the card shows the home start dot. The 50 m hide is a toggle the user has to find and tap each time.
  - Fix: Start hideEnds as true, or read the last choice from a small store. Keep the 'As recorded' button.
  - Effort: 0.5 hours.
- **J5. Run recording saves the whole point list every 10 seconds and re-reads it first**
  - Severity: low. Suspect. Kind: waste.
  - File and line: `src/components/runRecorder.tsx:62-69, src/models/runRecording.ts:35`
  - Scenario: At one fix per second a recording holds about 3,600 points an hour, roughly 300 KB of JSON at about 85 bytes a point. persist calls RunDraftStore.update every 10 s. JsonStore.update reads and parses the stored draft, then stringifies and writes the whole recording. A 2 h run does this about 720 times with files up to 600 KB. Not timed on a device.
  - Fix: Use RunDraftStore.replace for the draft write, so it skips the read. Or write only points added since the last save to a second key. Pick one in a module with a test.
  - Effort: 2 hours.
- **J6. The CSV export rebuilds each day twice and scans every music play for each song**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/models/journalExport.ts:60-118`
  - Scenario: csvRows calls JournalDay_build for every day, which builds a WorkoutPost summary per workout. It then builds the same summaries again for the workout rows. For each song it runs sessions.flatMap(plays).find, which copies every play in the log. Exporting All days on two years of data does this once per day and song. The result can also take the wrong play when a track appears on several days.
  - Fix: Index plays by track id once per export. Reuse the day's workouts from JournalDay_build. Match the play to the day's session.
  - Effort: 1.5 hours.
- **J7. Month names are written out in three models**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/journalExport.ts:148-161, src/models/monthCalendar.ts:31-44, src/models/season.ts:7-20`
  - Scenario: journalExport.ts, monthCalendar.ts and season.ts each hold the same 12-name array. journalExport.ts also holds a weekday array while foodLog.ts holds a short one. A change to one is missed in the others.
  - Fix: Export one monthNames and weekdayNames from a small dates module and import them in all three. Keep the existing tests.
  - Effort: 0.5 hours.
- **J8. The 'h min' duration text and the thousands grouping exist in several places**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/journalDay.ts:187-190, src/models/workoutPost.ts:121-124, src/models/historyCollapse.ts:43 (TimeUtils_formatHOrMin), src/models/journalExport.ts:177-179`
  - Scenario: minutesText in journalDay.ts and durationText in workoutPost.ts give the same 'N h M min' string. historyCollapse.ts uses TimeUtils_formatHOrMin for the same idea. Math.round(n).toLocaleString('en-US') appears in journalDay.ts, journalExport.ts (grouped) and workoutPost.ts. A fix to rounding must be made in each copy.
  - Fix: Export one duration text and one grouped-number helper from workoutPost.ts or a utils file. Replace the private copies.
  - Effort: 1 hours.
- **J9. Two distance formulas and two earth-radius constants in the run models**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/runTrack.ts:40-52, src/models/runRoute.ts:35 and 213-216`
  - Scenario: RunTrack_distanceM uses haversine with earthRadiusM. runRoute.ts has distanceM (flat approximation) and metresPerDegree from the same 6371000. Hidden-end trimming uses one formula, and the distance shown on the card uses the other. They differ slightly on long runs.
  - Fix: Have RunRoute_trimEnds call RunTrack_distanceM with a shared radius constant. Re-run test/runRoute.test.ts.
  - Effort: 0.5 hours.
- **J10. Loose-JSON helpers num and str are copied into 13 models, plus finite and nonnegative in the run models**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/notes.ts:48-58, src/models/runLog.ts:41, src/models/runRecording.ts:288, src/models/workoutPost.ts:189, src/models/musicLog.ts:22, src/models/openFoodFacts.ts:15, src/models/spotifyTracks.ts:22, src/models/feed.ts:52`
  - Scenario: Each parser file defines its own num, str, finite or nonnegative. notes.ts accepts finite numbers, runLog.ts accepts only values of 0 or more, and runRecording.ts accepts any finite value. Each parser drops different bad values with no shared rule.
  - Fix: Create one parseValue module with num, str, finite and nonnegative. Move the models onto it one file at a time.
  - Effort: 3 hours.
- **J11. The run screens hold the start, finish and recovery sequences in the view**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/runRecorder.tsx:98-133, src/components/screenRuns.tsx:23-70`
  - Scenario: RunRecorder.finish sequences confirm, set the closing ref, pause, persist, toRun and onFinish, and reverts closing on failure. The refs current and closing are a state machine in refs. ScreenRuns.start and finish decide that a run under 2 points is dropped and that the draft is cleared after the save. The load effect restores and rewrites the draft. scripts/lint-views-baseline.json covers only useEffect#1 of runRecorder.tsx.
  - Fix: Add a runFinish module that returns the next state and effects for finish and start, and a restore step for the mount. Test the failed-save path (run kept, draft kept, closing reset).
  - Effort: 3 hours.
- **J12. journalMeals.tsx is the food day page's list and the journal's meal list**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/components/journalMeals.tsx:1-70`
  - Scenario: screenFoodDay.tsx passes leadsWithSummary, showsEmptyMeals and micros to JournalMeals. The journal passes none of them. The name points at the journal, and three props switch it into a second screen.
  - Fix: Rename to foodDayMeals.tsx (FoodDayMeals) and move the three props into a view option set by each caller.
  - Effort: 0.5 hours.

## Findings from the 26 October audit

- D1: fixed. Commit bbdb7502. src/models/cloudBackup.ts CloudBackup_isAutoDue now compares CloudBackup_storesMark (notes by updatedAt, runs by endedAt, food, scans, check-ins, photos). Thunk_cloudCatchUp runs at src/App.native.tsx:340 and :523. fullBackupFile.ts reads notes and runs with loadStrict.
- D7: not in this slice. The capped stores (musicLog, warmupPlan, workoutReport, setClips) are not in my files. Checked: bbdb7502 raised music, warmup and report caps to 210 and clips stay at 300. NotesStore and RunStore in my slice have no cap.

## Checked with no finding

- RunRecording_markHidden: Math.max(lastFix.t, now) is intended, test 'closes at the later of the screen event and the last fix' covers it
- CSV formula escaping in csvCell: guards = + @ - tab CR on strings only, numeric values keep their sign, tested
- CSV listing every weigh-in while Markdown lists the latest is intended, test 'including multiple weigh-ins'
- Future-day notes are not reachable: calendar cells are disabled when isFuture, so JournalExport_days dropping days after today loses nothing
- RunLog_parse, Notes_parse, RunRecording_parse drop bad entries and are tested, including round trip and newest-first order
- RunRecording_restore closes a recording draft paused at max(savedAt, last point), at most 10 s lost, tested
- ScreenRuns.finish: if the save fails, RunRecorder keeps the run paused and the draft; a retry replaces the run by id (startedAt)
- Run models: all 10 mocha files for the slice pass (historyCollapse 7, journalDay 24, journalExport 10, notes 14, runEquivalents 2, runLog 3, runRecording 19, runRoute 10, runSensors 6, runTrack 8)
- HistoryRecordCollapsed Start button inside a Pressable: Button maps onClick to onPress, so it does not toggle the card
- RunRoute_trimEnds, RunRoute_mapDrawing and RunRoute_flatten agree on empty lines; the share card shows an empty map for a run under 100 m with Hide on, as tested
- JournalExportSheet output on iPhone: Exporter_toZip and Exporter_toFile in exporter.native.ts write a cache file and share it
- RunRoute_simplify bounds output under 300 points; tolerance growth cap of 40 rounds cannot loop forever
