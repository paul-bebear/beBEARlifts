# Phase 1 findings: iPhone only

Slice `iphone` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 0 medium, 9 low. 0 dropped by the checker.
Coverage: 79 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Low

- **I1. Onboarding answer rules are written twice, once per renderer**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/onboardingQuestions.native.tsx:43,59,102; src/components/onboardingChat.native.tsx:202; src/components/onboardingWelcome.native.tsx:21,48; src/components/onboardingQuestions.tsx:41,61,110; src/components/onboardingChat.tsx:193; src/components/onboardingWelcome.tsx:21,45`
  - Scenario: A change to how a tap clears an answer, or to the bad-invite rule and its text, must be made in the web and the phone file. The two copies can drift.
  - Fix: Add OnboardingAnswers_toggle(answers, key, value) and Onboarding_inviteError(invite) in src/models/onboardingAnswers.ts and src/models/onboarding.ts. Call them from both renderers. Test them in test/onboardingAnswers.test.ts.
  - Effort: 1.5 hours.
- **I2. The API origin is written in two files**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/utils/apiUrl.native.ts:2; src/utils/programsHost.ts:1`
  - Scenario: The host https://lifts.paulbebear.com is a literal in apiUrl.native.ts and also ProgramsHost_fork. A domain change updates one and the phone's AI and billing calls keep going to the old host.
  - Fix: Import ProgramsHost_fork in apiUrl.native.ts, or call HostConfig_resolveUrl(path).
  - Effort: 0.25 hours.
- **I3. Spotify login on the iPhone makes its PKCE verifier and state with Math.random**
  - Severity: low. Seen. Kind: security.
  - File and line: `src/utils/spotifyLoginPlatform.native.ts:20-27`
  - Scenario: The verifier and the state come from Math.random, which is not a secure random source. An app that claims the bebear:// scheme and guesses the values could finish the login. ASWebAuthenticationSession limits this, so it needs effort.
  - Fix: Add a secure random source (the native SecRandomCopyBytes, or react-native-get-random-values) and use it in randomBytes().
  - Effort: 1.5 hours.
- **I4. ProgressPhotoFiles_put deletes the file of an existing photo when the insert is refused**
  - Severity: low. Suspect. Kind: data.
  - File and line: `src/utils/progressPhotoFiles.native.ts:26-46`
  - Scenario: put() writes pathOf(id) first, then ProgressPhotos_insert refuses a duplicate id. The code then unlinks pathOf(id). That is the file of the photo already in the log, so it shows blank. The cloud restore skips ids that exist, so it needs a race between two writers.
  - Fix: Write to a temp name and move it into place only after the insert is accepted. Unlink only the temp file.
  - Effort: 1 hours.
- **I5. Run map snapshots and demo downloads leave temp files behind**
  - Severity: low. Seen. Kind: waste.
  - File and line: `ios/Liftosaur/LiftosaurMapSnapshotImpl.swift:46-53; src/utils/progressPhotoPick.native.ts:16-29; src/utils/demoFileCache.native.ts:38-47`
  - Scenario: Each map render writes a run-map-UUID.jpg at 3x and nothing deletes it. The progress photo resize leaves its resized tmpfile. A demo download that throws offline leaves a .part file that prune() skips because it only lists .webp.
  - Fix: Call ShareCardImage_cleanup on the map uri when the share card closes. Unlink the resized uri after readFile. Unlink the .part file in the catch of DemoFileCache_store.
  - Effort: 1 hours.
- **I6. OnboardingChip and OnboardingLink have a disabled prop no caller passes**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/onboardingChoiceButtons.native.tsx:16,67-69`
  - Scenario: No caller of OnboardingChip or OnboardingLink sets disabled. The prop and its wiring are unused.
  - Fix: Delete the disabled prop from both components.
  - Effort: 0.1 hours.
- **I7. ProgressPhotoFiles_dir is typed string or undefined but the phone file always sets a string**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/utils/progressPhotoFiles.native.ts:14-15`
  - Scenario: The export is typed string | undefined, then re-cast with as string on the next line. The cast hides the type.
  - Fix: Type the web export as undefined in an interface shared by both files and drop the cast, or return the dir from a function.
  - Effort: 0.25 hours.
- **I8. The phone file layer for progress photos, purchases waiting and the signing script have no tests**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/utils/progressPhotoFiles.native.ts; src/utils/purchases.native.ts:61-86; scripts/ios-signing.ts:47-69,154-183`
  - Scenario: No test imports ProgressPhotoFiles_put, _migrate or _delete. The rollback and migrate-halfway rules are untested. Purchases_whenReadyFor (timeout and listener) has no test, only the identity model does. ios-signing.ts has no test for b64url, profileName or exportOptions.
  - Fix: Test the photo functions in test/progressPhotoFiles.test.ts with an RNFS stub, as test/supabaseOAuthNative.test.ts does for the sign-in file. Add a Purchases_whenReadyFor timeout test. Test exportOptions output in test/iosSigning.test.ts.
  - Effort: 3 hours.
- **I9. generate-launch-screens.js corrupts src/index.html if a marker is missing**
  - Severity: low. Seen. Kind: bug.
  - File and line: `scripts/generate-launch-screens.js:67-72`
  - Scenario: If LAUNCH_SCREENS_START is absent, indexOf returns -1 and slice cuts the file near its start. The script then writes that over src/index.html. Both markers exist today.
  - Fix: Throw when either marker index is -1, before writing.
  - Effort: 0.25 hours.

## Findings from the 26 October audit

- X1: fixed. backFrom in src/models/foodScanSteps.ts:138-143 keeps resume for the serving step. FoodScanCamera passes it to FoodAiPanel. The old foodPhotoPanel.native.tsx is gone, so no camera opens on mount.
- X5: fixed. src/components/foodLabelPanel.native.tsx:46 shows FoodAiSignIn when no session and hides the camera buttons. src/components/foodAiPanel.tsx:56 does the same for meal scans. BodyScanRead_permission checks sign-in before pick. AiRequest_signInMessage names the bear home gear.
- D1: fixed. Commit bbdb7502. Thunk_cloudCatchUp runs at launch and on active in src/App.native.tsx:340 and :523. CloudBackup_storesMark in src/models/cloudBackup.ts covers food, notes, runs, scans, check-ins and photos. The calls sit behind OfflineOnly_isEnabled(), which is the beBEAR build flag.
- D4: fixed. Photos are files in the documents folder with an index in MMKV (src/utils/progressPhotoFiles.native.ts, ProgressPhotoFiles_migrate at src/App.native.tsx:336). src/utils/progressPhotoCloud.ts uploads and restores each photo. One rare race is listed as a new low finding.

## Checked with no finding

- ios/Liftosaur/LiftosaurLocationImpl.swift: emitters are set once, a JS reload stops old updates before start, UIBackgroundModes has location, and permission waiters resolve on the first decided status.
- ios/Liftosaur/RCTLiftosaurLocation.mm and RCTLiftosaurMapSnapshot.mm: weak instance guard, spec signatures and the promise reject path match the specs in src/specs.
- ios/Liftosaur/RCTBebearSignInConfig.mm: the Info.plist key BebearGoogleClientID exists. NativeIdTokenSignIn_googleConfiguration checks the client id against the URL scheme, and test/supabaseOAuthNative.test.ts covers the adapter.
- src/utils/nativeFoodCapture.native.ts and src/utils/foodCaptureRequest.ts: consent, camera permission and pick order are tested in test/foodCapture.test.ts, and 109 tests in 7 related files pass.
- src/utils/purchases.native.ts: identity state machine is in src/models/purchasesIdentity.ts with tests. Listener and timer cleanup in Purchases_whenReadyFor is correct.
- src/utils/runSensors.ios.ts and runSensors.native.ts: callers in runRecorder.tsx and screenRuns.tsx stop the watch on unmount. The android file reports unavailable.
- src/components/rulerPicker.native.tsx: both callers key the picker by spec, so a spec change remounts it. Window shift uses pure functions in src/models/rulerTape.ts with tests.
- src/components/primitives/glassBar.native.tsx: the guarded require covers builds without the liquid-glass module. Surface choice is in src/models/glassSurface.ts with tests.
- src/components/foodBarcodeScanner.native.tsx: the ref guard stops repeat detections. Denied permission shows Open Settings.
- src/utils/shareCardImage.native.ts: cleanup is limited to cache and temp paths. src/utils/storeReceipt.native.ts, aiConsentPrompt.native.ts, backupReminderMarks.native.ts and bearImage.native.ts are correct for their callers.
- src/components/houseArrange.native.tsx and houseArrangeFlag.native.ts: stubs that match the web exports. The flag is false so the null component is never reached.
