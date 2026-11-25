# Phase 1 findings: Our edits to Anton's files: components o to z

Slice `edits-components-o-z` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 1 medium, 15 low. 0 dropped by the checker.
Coverage: 60 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **K1. Clear All Fields leaves the old bodyweight on screen, but Save drops it**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/components/screenStats.tsx:509-540 and :190-200`
  - Scenario: User opens Add Measurements with a last weight. They tap Clear All Fields. valuesRef is emptied and clearKey grows. StatWeighInInput keeps its own useState value, so the weight field still shows the old number. They tap Save. saveWeight reads valuesRef, finds nothing, and saves no weight.
  - Fix: Reset the value in StatWeighInInput when clearKey changes. Easiest: key StatWeighInInput by clearKey in StatInput so its state resets. Or drop the local state and read from valuesRef.
  - Effort: 0.5 hours.
  - Checker: keep. Clear All Fields empties valuesRef and bumps clearKey, but StatWeighInInput's own useState value survives and re-seeds the remounted InputNumber2 with the old weight, so saveWeight finds no weight in valuesRef and saves none while the screen still shows one.

## Low

- **K2. Past-workout Create Program Day shortcut removed from the finish screen**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/screenFinishDay.tsx (removed eligibleForCreateProgramDay block), src/navigation/types.ts:162`
  - Scenario: Anton's finish screen offered Create Program Day for an ad-hoc workout, plus copy link and copy text. The fork screen drops all three. The share block also only shows on the offline build, so the web build has no share at all. The memory note says removals need an explicit owner OK.
  - Fix: Ask the owner whether the removal is intended. If yes, drop the unused historyRecordId param of dayFromAdhocModal and the unused props userId, allPrograms and currentProgramId on ScreenFinishDay. If no, restore the button.
  - Effort: 1 hours.
- **K3. Dead props left after the plan rows and the finish screen were replaced**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/screenAccount.tsx:47-49, src/components/screenFinishDay.tsx:43-52, src/components/primitives/slider.tsx:9`
  - Scenario: ScreenAccount still takes subscriptionStatus, subscriptionStatusLoading and ownedLifetime, and nothing reads them. NavScreenMe passes them anyway. ScreenFinishDay ignores props.userId, allPrograms and currentProgramId. The web Slider accepts onSlide and never calls it.
  - Fix: Delete the unused props and the three NavScreenMe arguments. Call onSlide from the web Slider input event, or remove it from the web type.
  - Effort: 0.5 hours.
- **K4. Account screen still refreshes store subscriptions it no longer shows**
  - Severity: low. Suspect. Kind: waste.
  - File and line: `src/components/screenAccount.tsx:82-87`
  - Scenario: The Premium card was replaced by PlusAccess_accountRow. The mount effect and the AppState listener still dispatch Thunk_iapRefreshActiveSubscriptions on every visit and every foreground. This screen no longer uses the result.
  - Fix: Remove both dispatches from ScreenAccount if no other screen needs the refresh from here.
  - Effort: 0.25 hours.
- **K5. Heart rate store resubscribes on every render**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/components/workoutHeartRate.tsx:16-19`
  - Scenario: The H2 fix wrapped subscribe in an inline arrow. useSyncExternalStore sees a new function each render, so it unsubscribes and subscribes again on every bpm update.
  - Fix: Build the subscribe function with useCallback keyed on props.store, or bind the methods once in the store module.
  - Effort: 0.25 hours.
- **K6. Two default roundings for a weight with no bar and plates**
  - Severity: low. Suspect. Kind: duplicate.
  - File and line: `src/models/equipment.ts:99-109, src/models/exercise.ts:4508-4511`
  - Scenario: Equipment_exactWeightStep defaults to 1 kg or 2.5 lb. Exercise_defaultRounding defaults to 2.5 kg or 5 lb for the same exerciseData.rounding. WeightRoundingInfo tells the user the first number, and other callers of Exercise_defaultRounding use the second.
  - Fix: Pick one default and have both functions read it from one constant. Check the callers of Exercise_defaultRounding and weight.ts lines 192, 225 and 323.
  - Effort: 1.5 hours.
  - Checker: keep. For equipment with no bar and plates and no saved rounding, Equipment_exactWeightStep steps by 1 kg / 2.5 lb and WeightRoundingInfo shows that, while the Default Rounding field in exerciseDataSettings.tsx shows Exercise_defaultRounding's 2.5 kg / 5 lb for the same exercise; this is a confusing display, but the weights it computes are not wrong.
- **K7. Equipment_exactWeightStep has no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/models/equipment.ts:99, test/`
  - Scenario: The function decides rounding for three branches in weight.ts and the text in weightRoundingInfo.tsx. No file under test/ mentions it.
  - Fix: Add test/equipmentExactWeightStep.test.ts. Cover fixed gear, plates on a bar, a custom rounding, and the kg and lb defaults.
  - Effort: 0.75 hours.
- **K8. The adhoc set rule is written twice**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/workoutExerciseAllSets.tsx:190, src/components/workoutExerciseSet.tsx:359`
  - Scenario: onAddSet computes isAdhoc as isCurrentProgress and no programExercise. WorkoutExerciseSetInner computes setType adhoc with the same test. If one changes, new sets and drawn sets disagree.
  - Fix: Add a pure WorkoutSetType_isAdhoc(isCurrentProgress, programExercise) in a model file and call it from both.
  - Effort: 0.5 hours.
- **K9. Reps ruler constant copied into two files, placed between imports**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/workoutExerciseSetCompact.tsx:13, src/components/workoutExerciseSetExpanded.tsx:17`
  - Scenario: Both files declare REPS_RULER = RulerTape_spec reps in the middle of the import list. A change to the reps ruler needs two edits.
  - Fix: Export one repsRuler from src/models/rulerTape.ts or workoutExerciseSetFields.tsx and import it in both.
  - Effort: 0.25 hours.
- **K10. API keys screen shows an empty list, not a spinner, when the plan loads late**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/components/screenApiKeys.tsx:40-52`
  - Scenario: usePlusAccess starts false until AccountPlanStore loads. The first effect run sets isLoading false. When the plan turns plus, the effect runs again and fetches, but the screen already shows an empty key list. A user may create a second key before the first list arrives.
  - Fix: Set isLoading true when isSubscribed turns true, or wait for the plan store to report loaded before the first run.
  - Effort: 0.5 hours.
- **K11. Error boundary prints the raw error message to every user**
  - Severity: low. Seen. Kind: security.
  - File and line: `src/components/screenErrorBoundary.tsx:22-30, :93-97`
  - Scenario: Any render crash stores error.message in state and shows it in a selectable text block. A message can hold a user id, a URL or a file path from a failed fetch.
  - Fix: Show the message only when __DEV__ is true or on a TestFlight build. Send it to Rollbar from componentDidCatch as today.
  - Effort: 0.5 hours.
- **K12. Discard, Cancel and Delete all name one action**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/components/workoutMenu.tsx:38, src/components/screenWorkout.tsx:153-156, src/components/workout.tsx (Cancel workout button)`
  - Scenario: The kebab label says Discard workout for current and past workouts. The bottom button says Cancel workout. The past-workout dialog says Delete this past workout. All call Thunk_deleteProgress, and Discard on a past workout reads like it keeps history.
  - Fix: Use Cancel workout for the current one and Delete workout for a past one, in the label, the button and the dialog.
  - Effort: 0.5 hours.
- **K13. OfflineOnly_isEnabled is called seven times in one render**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/screenSettings.tsx:88-124, :175-183, :486, :554-575`
  - Scenario: Each hidden row repeats the call. A row group added later is easy to leave visible on the offline build.
  - Fix: Read it once into const isOffline at the top of ScreenSettingsInner. Or move the visible-rows list into settingsForkRows.tsx.
  - Effort: 0.5 hours.
- **K14. Article structured data names beBEAR but links to liftosaur.com**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/components/page.tsx:101, :222`
  - Scenario: jsonLdToSchema sets publisher name beBEAR with url https://www.liftosaur.com. Search engines read beBEAR as the owner of Anton's site. Line 222 also preconnects to api3.liftosaur.com.
  - Fix: Set the publisher url to ProgramsHost_fork or keep the name Liftosaur. Remove the preconnect if the web build no longer calls that host.
  - Effort: 0.25 hours.
- **K15. Onboarding preloads a dino image the program screen no longer shows**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/components/screenFirst.tsx:25-31, src/components/screenProgramSelect.tsx:79`
  - Scenario: ScreenProgramSelect now shows /images/bear/brown/level-01.webp. ScreenFirst still preloads /images/dinoprogramselect.png and does not preload the bear image.
  - Fix: Swap the preload entry for /images/bear/brown/level-01.webp.
  - Effort: 0.1 hours.
- **K16. useFirstUseTip lives in workout.tsx and holds a step machine in a ref**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/workout.tsx:123-154, src/navigation/screens/NavScreenProgram.tsx:4`
  - Scenario: The 28-line hook keeps IFirstUseTipsState in stateRef and writes helps to storage. The transition is pure and tested in firstUseTips.ts. The hook itself has no test, and NavScreenProgram imports it from a 980-line view file.
  - Fix: Move useFirstUseTip to src/utils/useFirstUseTip.ts. Add a baseline entry with the reason that the transition is in firstUseTips.ts.
  - Effort: 0.5 hours.

## Findings from the 26 October audit

- H2: fixed. workoutHeartRate.tsx:16-19 now wraps subscribe and getBpm in arrow functions, so the unbound-method errors are gone. The fix added a resubscribe-per-render cost, listed in findings. eslint on the other touched files reports no errors.
- P2: fixed. Commit 50a2e63f. cloudBackupCard.tsx:206-222 shows subscriptionNote and a Manage subscription button above the confirm field. api/account/delete.mjs:80-90 deletes the RevenueCat customer when REVENUECAT_SECRET_KEY is set. screenAccount.tsx's old Delete Current Cloud Account button was not part of that fix and only changed the support email.

## Checked with no finding

- screenProgram.tsx: Plan tab added at index 0 of EditProgram_tabLabels. No hard-coded tab index elsewhere. Default label Plan matches index 0. Only a stale comment says Preview.
- screenWorkout.tsx: onDeletePressHandler is defined before onCancel uses it. navLeftButtons is supported by NavHeader. Close pushes main home as intended.
- screenFinishDay.tsx: hooks run before the record == null return. FinishDayActions_saveReport is a no-op for an undefined record or an existing report. finishDayActions.test.ts exists.
- screenSubscription.tsx: the 677-line removal is a full replacement. Prices read from PlusAccess_prices, and Purchases open soon is honest copy.
- statsList.tsx and screenStats.tsx: Stats_isPercentageKey swaps are consistent. statsPercentageDef drives the inputs. Percentage keys other than bodyfat are saved by savePercentage.
- screenSleepNutrition.tsx and screenExerciseStats.tsx: Locker feature=graphs is free, and Subscriptions_hasSubscription returns true through FORK_UNLOCKS_PREMIUM, so graphs stay interactive.
- workoutExercisePager.native.tsx: momentumStallMs timer is cleared in onMomentumScrollEnd and ignores a finger drag. 900 ms covers one page glide.
- workoutExerciseSetFields.tsx: hasCrossedWeight matches the old isDiffWeight test for program and adhoc sets, and warmups were never crossed.
- topNavMenu.tsx, programShareOutput.tsx, programTourConfig.tsx, workoutTourConfig.tsx, tourConfigs.ts, screenSetupEquipment.tsx, screenFirst.tsx, screenImportPreview.tsx: brand and offline-flag edits only. houseTourConfig exists and ITourId includes house.
- weekInsights.tsx, programPreview.tsx, workoutExercise.tsx, workoutExerciseCard.tsx: plan gating through usePlusAccess and the new prop pass-through match the plusAccess model. plusAccess.test.ts covers it.
- eslint on workoutExerciseSetCompact.tsx, workoutExerciseSetExpanded.tsx and screenStats.tsx reports no errors.
