# Phase 1 findings: Backup and storage

Slice `backup` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Opus. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 2 medium, 10 low. 0 dropped by the checker.
Coverage: 53 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **B1. One damaged store stops every automatic backup with no message**
  - Severity: medium. Seen. Kind: data.
  - File and line: `src/utils/jsonStore.ts:107-116, src/utils/fullBackupFile.ts:47-63, src/ducks/cloudBackupThunks.ts:156-175`
  - Scenario: The saved text of bebear_clips, bebear_goal or bebear_schedule is cut short. No screen loads that store, so loadStrict() rejects without offering recovery. FullBackupFile_build throws on every auto backup. Thunk_cloudBackup in auto mode drops the error. Workouts and food stop reaching the cloud. Only the 7-day reminder or a manual Back up now shows anything.
  - Fix: In loadStrict(), call reportReadError() for an UnreadableError once per launch, as load() does. In Thunk_cloudBackup, keep a 'backup blocked' reason in CloudStore and show it on cloudBackupCard.tsx.
  - Effort: 1.5 hours.
  - Checker: keep. The claim that no screen loads these stores is wrong, because screenHome.tsx calls ProgramGoalStore.use() and WeekScheduleStore.use() and historyRecord.tsx calls SetClipStore.use(), so load() shows the recovery prompt once; but after the user picks "Not now", FullBackupFile_build throws from loadStrict() on every auto backup, and Thunk_cloudBackup drops the error in auto mode, so backups stop with no message.
- **B2. A half-finished upload makes the phone think another device wrote the backup**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/utils/cloudBackupClient.ts:56-85, src/models/cloudBackupCompare.ts:48-62`
  - Scenario: The upload writes latest.json. Then the network drops, or iOS suspends the app, before day-N.json or the CloudStore update. syncedExportedAt keeps the old value. The next backup downloads latest.json, sees a different exportedAt and stores an otherDevice offer. The banner says 'Another device changed your cloud backup' and auto backups stop until the user chooses.
  - Fix: In CloudBackupClient_upload, write syncedExportedAt to CloudStore right after the latest.json put succeeds, before the weekday put. Update the test 'leaves the last backup time unchanged when either upload fails'.
  - Effort: 1 hours.
  - Checker: keep. CloudBackupClient_upload writes latest.json, then returns before the CloudStore update if the daily put fails, so syncedExportedAt stays old; on the next backup CloudBackupCompare_decide sees this phone's own newer exportedAt, finds no cloud-only ids, and stores an otherDevice offer that blocks auto backups.

## Low

- **B3. Any signed-in user can still fill storage through photo names**
  - Severity: low. Seen. Kind: security. Still open from the 26 October audit: P4.
  - File and line: `supabase/migrations/20261027120000_backups_photos.sql:7-22, supabase/migrations/20261020202617_backups_bucket.sql:1-6`
  - Scenario: A script uploads <uid>/photos/1.jpg, 2.jpg and so on with Content-Type image/jpeg. Each may be 50 MB, the bucket limit. Twenty files fill the free plan's 1 GB for the whole project.
  - Fix: Move photos to their own bucket with a 2 MB file_size_limit, or add an insert check that counts the user's photos objects and refuses past 220.
  - Effort: 1 hours.
- **B4. A load that overlaps a write can show the old value**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/utils/jsonStore.ts:118-134, src/utils/jsonStore.ts:144-166`
  - Scenario: On the web, a screen mounts and calls load(). At the same moment an update() writes. Both chain on the same resolved writeChain. The read in load() finishes after the write and sets current back to the old value, then notifies. The screen shows stale data until the next write.
  - Fix: Chain load() on writeChain itself, so writeChain = writeChain.then(read), the same way update() does.
  - Effort: 1 hours.
- **B5. Each backup downloads the whole cloud file and uploads it twice, pretty-printed**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/ducks/cloudBackupThunks.ts:98-111, src/utils/fullBackupFile.ts:86, src/utils/cloudBackupClient.ts:66-73`
  - Scenario: After every workout or changed note, offerFromCloud downloads all of latest.json only to read exportedAt and the ids. Then the same text goes up twice. JSON.stringify with 2-space indent adds about a third to the size.
  - Fix: Upload the weekday copy with a server-side copy (POST /storage/v1/object/copy). Drop the indent in FullBackupFile_build for the cloud upload. Keep the indent only for the file export.
  - Effort: 1.5 hours.
- **B6. Every return to the app re-reads the photo store from disk**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/ducks/cloudBackupThunks.ts:167-169, src/utils/progressPhotoCloud.ts:38-45`
  - Scenario: Thunk_cloudBackup calls ProgressPhotoCloud_sync whenever the result is ok, also when no backup was due. sync calls loadStrict(), which re-reads, parses and notifies every subscriber. On the web the store holds up to 200 data URLs of 1 MB each.
  - Fix: In Thunk_cloudBackup, call ProgressPhotoCloud_sync only when backUp uploaded, or when the photos part of CloudBackup_storesMark changed.
  - Effort: 0.5 hours.
- **B7. The same id maker and write helper are written twice**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/utils/foodLogStore.ts:19-21, src/utils/notesStore.ts:6-8, src/utils/runStore.ts:6-8, src/utils/progressPhotoStore.ts:5-8, src/utils/cloudBackupClient.ts:107,119,143`
  - Scenario: FoodLogStore_newId and NotesStore_newId hold the same code. runStore.ts and progressPhotoStore.ts each define the same persist(). The 'Object not found' check is repeated three times in cloudBackupClient.ts.
  - Fix: Move the id maker to one helper in src/utils, for example newLocalId(). Export one silent persist from jsonStore.ts. Add isMissingObject() in cloudBackupClient.ts.
  - Effort: 0.5 hours.
- **B8. The comment on the photo store's persist describes old behaviour**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/utils/progressPhotoStore.ts:5`
  - Scenario: The comment says IndexedDBUtils_set swallows a failed write. The default persistValue in jsonStore.ts already uses IndexedDBUtils_setMany and rethrows. The only real difference is that the custom persist shows no alert.
  - Fix: Rewrite the comment to say the screen shows its own error, so the store skips the alert. Or use the shared silent persist from the duplicate finding.
  - Effort: 0.1 hours.
- **B9. FoodLogStore_get and FoodLogStore_subscribe have no callers**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/utils/foodLogStore.ts:10,12`
  - Scenario: A grep of src and test finds only the definitions.
  - Fix: Delete both exports.
  - Effort: 0.1 hours.
- **B10. CloudBackupCommand_run has no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/utils/cloudBackupCommand.ts:18-83`
  - Scenario: The command saves SentCodeStore after sendCode and clears it after verify. Verify also runs Thunk_cloudCheck, and redeem marks the code. No test file imports cloudBackupCommand. A broken case would turn the sign-in or redeem button into a silent no-op.
  - Fix: Add test/cloudBackupCommand.test.ts with stubbed clients for sendCode, verify, redeem and a throwing client.
  - Effort: 1 hours.
- **B11. Users see internal store keys in the damaged-data message**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/models/storeRecovery.ts:12-15`
  - Scenario: A damaged food log shows 'The saved data in bebear_foodlog is damaged' and names bebear_foodlog_unreadable. The UI is meant to be grandma-simple.
  - Fix: Pass a plain label such as 'Food diary' to StoreRecovery_prompt from JsonStore_create, and keep the key only in logs.
  - Effort: 0.5 hours.
- **B12. The weekly reminder text talks about website data and JSON export on the iPhone**
  - Severity: low. Suspect. Kind: name.
  - File and line: `src/models/backupReminder.ts:16-24`
  - Scenario: An offline-only iPhone build with no cloud upload for 7 days shows 'If iOS clears website data'. It points to 'Export data to JSON file' and does not mention signing in to cloud backup.
  - Fix: Make BackupReminder_message take the platform and point to Settings → Cloud backup sign-in first.
  - Effort: 0.5 hours.

## Findings from the 26 October audit

- P1: fixed. bbdb7502. ownerUserId survives sign-out (src/models/cloudBackup.ts:232-245). CloudBackup_ownerCheck asks before the first upload to another account (:202-211), and ownerAllows calls it (src/ducks/cloudBackupThunks.ts:79-90). A previous user who never signed in leaves no owner, so that case cannot be guarded.
- D1: fixed. bbdb7502. App.native.tsx dispatches Thunk_cloudCatchUp at launch (:336-341) and on 'active' (:522-524). CloudBackup_isAutoDue also compares CloudBackup_storesMark (src/models/cloudBackup.ts:160-199).
- D2: fixed. bbdb7502. JsonStore loadStrict() rejects on a failed read (src/utils/jsonStore.ts:107-116). FullBackupFile_build uses it for all 14 stores (src/utils/fullBackupFile.ts:47-63). A new side effect is reported as a finding: a damaged store now stops auto backups silently.
- D3: fixed. CloudBackupCompare_decide asks whenever the cloud exportedAt differs from syncedExportedAt (src/models/cloudBackupCompare.ts:48-62), with the otherDevice text.
- D4: fixed. iPhone photos are files plus an index (src/utils/progressPhotoFiles.native.ts, ProgressPhotoFiles_migrate). Cloud copies go to <uid>/photos/<id>.jpg (src/utils/progressPhotoCloud.ts), and restore fetches the missing ones. The web test bed still keeps data URLs in one value.
- D5: fixed. bbdb7502. offerRecovery offers 'Restore from cloud' or 'Start this log again' (src/utils/jsonStore.ts:87-105, src/models/storeRecovery.ts). replace() writes without reading (:169-172).
- D6: fixed. BearStoreData_parse falls back per field (src/models/bearStoreData.ts:24-40, last touched in f5300b55). Covered by test/bearStoreData.test.ts.
- D7: fixed. test/storeCaps.test.ts checks a year of music, warmups and reports at 4 workouts a week, and the clip screen text about removed records.
- P4: partly fixed. 1fad4acf limits JSON names to latest, replaced and day-0..6 (supabase/migrations/20261027000002_backups_object_names.sql). 20261027120000_backups_photos.sql adds photos/[0-9]+.jpg with no count limit at 50 MB each, so the hole is still open through photo names.

## Checked with no finding

- JsonStore update() re-reads before each write and serialises writes on writeChain
- Spotify tokens are stripped from the backup (FullBackup_build music tokens undefined)
- FullBackupFile_restore rolls back written stores on a failed write
- Restore of an older weekday copy saves the replaced latest.json first, then uploads
- Sign-out uses scope=local and clears friends, feed, blocks and invite caches
- Upload during a sign-out and sign-in race is refused by the folder policy, since the path uses the old user id
- Photo sync runs only for the owner and never while a restore offer is open (CloudBackup_canSyncPhotos)
- Photo delete policy allows only the photos folder
- CloudBackupForm_reduce blocks double commands while one is busy
- cloudBackupCard.tsx is 371 lines, and its decisions are in cloudBackupForm.ts
- All 12 slice test files pass: 138 tests
