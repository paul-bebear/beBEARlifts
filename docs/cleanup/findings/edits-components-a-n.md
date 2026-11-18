# Phase 1 findings: Our edits to Anton's files: components a to n

Slice `edits-components-a-n` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 0 medium, 7 low. 0 dropped by the checker.
Coverage: 60 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Low

- **C1. footerButton.tsx is no longer used by anything**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/footerButton.tsx:1-35`
  - Scenario: The footer2.tsx rewrite dropped the five-tab bar and its FooterButton imports. grep finds no importer of footerButton.tsx in src or test. The popsToRoot and isActive props we added to it, and the hasDot prop, run nowhere.
  - Fix: Delete src/components/footerButton.tsx. Its StringUtils_dashcase import goes with it.
  - Effort: 0.1 hours.
- **C2. The bottom bar no longer shows program errors or sign-in state**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/components/footer2.tsx:1-46`
  - Scenario: Old Footer2View showed a red dot on Program when Program_evaluate found errors. It tinted the Me icon green, grey or red by sign-in state. The new bar is one plus button. grep finds no hasErrorsInProgram left in src. I did not check if another screen shows these two signals.
  - Fix: Check Home and the program screen for a program-error banner and a sign-in state. If neither exists, show them there. Then confirm the removal with the owner.
  - Effort: 1.5 hours.
- **C3. Every history card subscribes to the music and clip stores**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/components/historyRecord.tsx:67-74, 160-166`
  - Scenario: HistoryRecordView calls useMusicLog() and SetClipStore.use() on every card, on every build. It also runs SongPerSet_match per card. SongPerSet_forEntry returns a new array per entry on each render, so the memo on HistoryEntryView never holds. A music poll tick or clip write re-renders and re-matches the whole history list.
  - Fix: Read both stores in the list screen, only when OfflineOnly_isEnabled(), and pass per-record slices down. Return a stable empty array from SongPerSet_forEntry when there are no songs.
  - Effort: 2 hours.
- **C4. Native keyboard flashes the number pad when focus moves between ruler inputs**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/components/nativeCustomKeyboard.native.tsx:92-101`
  - Scenario: The user taps Number on one input, so padForId is set to that input. They then tap a second ruler input. mode is computed from padForId != null, so the pad shows for one render until the useEffect resets it. The keyboard height is measured twice and the panel jumps.
  - Fix: Compute pad mode as padForId === activeId in render. Move the choice into a small pure function next to RulerTape_panelMode and drop the reset effect.
  - Effort: 0.5 hours.
- **C5. Paste-from-clipboard import says the clipboard is empty for every failure**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/components/importerLiftosaurCsv.tsx:28-39`
  - Scenario: The user taps Paste history from clipboard. The browser denies clipboard read, or the text is not a CSV block. text or csv is undefined and the alert says 'The clipboard is empty'. The user then copies again and gets the same message.
  - Fix: Split the cases in onPaste. Say 'Allow paste in the browser prompt' on a read error. Say 'No CSV found' when CsvFromChat_extract returns undefined for non-empty text.
  - Effort: 0.5 hours.
- **C6. Ruler change handler is written twice, web and native**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/inputNumber2.tsx:344-361, src/components/inputNumber2.native.tsx:493-507`
  - Scenario: onRulerChange (web) and handleRulerChange (native) both cancel pending input, clear typing flags, clamp, set valueRef, call onPreview and commit. The ruler panel markup with unit buttons and close button is also copied between the web and native keyboards. A fix to one is easy to miss in the other.
  - Fix: Extract a pure RulerTape_applyChange(value, min, max, commitMode) in src/models/rulerTape.ts that returns the next value and the calls to make. Add a test in test/rulerTape.test.ts.
  - Effort: 1.5 hours.
- **C7. Two startup wiring modules called from app.tsx have no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/utils/planFollowsSignIn.ts, src/utils/storeRecoveryWiring.ts (called at src/components/app.tsx:143, 338)`
  - Scenario: app.tsx now starts PlanFollowsSignIn_start and StoreRecoveryWiring_start on launch. No file in test/ imports either module. They touch the plan and store recovery on sign-in and launch.
  - Fix: Add test/planFollowsSignIn.test.ts and test/storeRecoveryWiring.test.ts that cover the start and stop functions and the sign-in case.
  - Effort: 2 hours.

## Findings from the 26 October audit

- D1: fixed. bbdb7502 added Thunk_cloudCatchUp dispatches at src/components/app.tsx:151 (web, visibilitychange) and src/App.native.tsx:340 and :523 (launch and active). CloudBackup_isAutoDue now takes the other stores (src/models/cloudBackup.ts:185).
- H2: fixed. npx prettier --check passes for src/components/editDetailsForm.tsx and src/components/markdownEditor.tsx. Both diffs from a7a402c2 are only the prettier reformatting.

## Checked with no finding

- app.tsx: initialScreen skips intro only on web offline-only build, native and normal web paths unchanged
- app.tsx: MusicTracker and the visibility catch-up are gated by OfflineOnly_isEnabled, so Anton's behaviour is unchanged elsewhere
- bottomSheetNextWorkout.tsx: all hooks run before the early return; startChoice has tests in test/weekSchedule.test.ts
- bottomSheetNextWorkout.tsx: WeekSchedule_workedOutToday scans history per render, but cost is small (some() stops at the first match)
- bottomSheetWorkoutSuperset.tsx: new onPair prop is the only API change, pair logic is tested in test/workoutSupersetPair.test.ts
- button.tsx: pill kinds override containerCn and textCn after the old branches; test/pillButtonClasses.test.ts exists
- exerciseImage.tsx: small thumbnails are now square, ExerciseImageUtils_initials is tested in test/exerciseImage.test.ts
- dayLiftoEditorInline.tsx: TabBarLayout_keyboardOccluded gives the same value as the old inline formula and is tested
- graphStats.tsx and modalStats.tsx: Stats_isPercentageKey and statsPercentageDef cover bodyfat, water, bone, muscle; migration and settings default use Stats_turnOnScaleReadings, so old users get the new keys on
- historyRecordSets.tsx: SetClips_historyGroups without a clip log gives the same groups as Reps_group; tested in test/setClips.test.ts
- locker.tsx and locker.native.tsx: all six callers pass feature and none pass subscription
- importerLiftosaurCsv.tsx: pasted text goes through Thunk_importCsvData in preview mode, so a bad paste cannot write history
- importerLiftosaurCsv.tsx: relative zip href is served by webpack.config.js:376 and resolved by internalLink.native.tsx
- navbar.tsx, account.tsx, adminHtml.tsx, exerciseRm.tsx, modalAffiliate.tsx, hearAboutUsSurvey.tsx, help files, footerPage.tsx, liftoEditorDock.tsx: text and comment edits only
- footerPage.tsx and helpEditProgramV2.tsx: Support_email and Support_docsUrl exist in src/utils/support.ts
- liftoEditorActions.ts and liftoEditorHints.ts: beat progression is already known to the planner files
