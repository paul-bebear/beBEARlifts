# Phase 1 findings: Share cards, music and clips

Slice `share` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 1 medium, 18 low. 0 dropped by the checker.
Coverage: 65 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **V1. Songs played while locked, just before Finish, are never saved**
  - Severity: medium. Suspect. Kind: bug.
  - File and line: `src/components/musicTracker.tsx:44-63; src/models/musicPoll.ts:34-47`
  - Scenario: User lifts with the phone locked. Spotify plays 3 songs. The user unlocks and taps Finish within a few seconds. catchUp starts on unlock but the workout stops before the history call returns. isStopped is true, so update is skipped. After Finish nothing calls catchUp again. MusicTracking_finishOthers only closes the current song.
  - Fix: On Finish, run one last MusicPoll_catchUp for that workout that ignores isStopped and uses the workout end time. Add a musicPoll test for it.
  - Effort: 2 hours.
  - Checker: keep. The cleanup in musicTracker.tsx sets isStopped, so the in-flight MusicPoll_catchUp skips its update, and nothing else ever merges history into a finished session (MusicTracking_finishOthers only calls MusicSession_finish), so songs played while locked are lost if Finish lands inside the history call's round trip.

## Low

- **V2. Marking a song kept or skipped writes back an old copy of the whole session**
  - Severity: low. Seen. Kind: data.
  - File and line: `src/components/screenMusic.tsx:58-60`
  - Scenario: setKept builds the new session from the render-time `session` prop and passes it to MusicLog_putSession. The fresh log inside the update callback is ignored. If the tracker added or merged plays since the last render, those plays vanish. A history merge can also insert an earlier play, so `index` hits the wrong song.
  - Fix: Inside the update callback read the session by id with MusicLog_session, then apply MusicSession_setKept to that. Move this into a MusicLog_setKept function with a test.
  - Effort: 1 hours.
- **V3. The music poll reads, parses and rewrites the whole log every 8 seconds**
  - Severity: low. Suspect. Kind: waste.
  - File and line: `src/components/musicTracker.tsx:52-56; src/models/musicSession.ts:68-85; src/utils/jsonStore.ts:144-166`
  - Scenario: MusicSession_observe returns a new object on every poll, even for the same song. So MusicTracking_apply always writes. JsonStore update reads IndexedDB, runs MusicLog_parse and MusicSession_dropCopies on up to 210 sessions, then stringifies and writes all of it. This repeats for a 1 to 2 hour workout.
  - Fix: Return the same session object from MusicSession_observe when only maxProgressMs changed by under a few seconds. Or keep the open song in memory and write it on song change.
  - Effort: 2 hours.
- **V4. The music screen builds every session card in full, 210 at most**
  - Severity: low. Suspect. Kind: waste.
  - File and line: `src/components/screenMusic.tsx:42-60, 230-243`
  - Scenario: Each SessionCard runs SongPerSet_match, MusicSession_keptTracks and MusicSession_counts on every render, even when collapsed. ScreenMusic maps all sessions with no list virtualization. MusicLog_workoutForSession scans the history twice per session.
  - Fix: Compute song-per-set only when isExpanded. Build a Map of history by id once in ScreenMusic. Use a FlatList.
  - Effort: 1.5 hours.
- **V5. A failed add to a Spotify playlist leaves an empty playlist and a retry makes another**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/utils/spotifyClient.ts:246-260`
  - Scenario: createPlaylist succeeds, then addTracks returns an error. SpotifyClient_savePlaylist returns the error and keeps no playlist id. The user taps Save to Spotify again. A second playlist with the same name is created.
  - Fix: Return the created playlist ref with the failure. Keep it in SessionCard state and retry addTracks only.
  - Effort: 1.5 hours.
- **V6. Any 400 from the token refresh logs the user out of Spotify**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/utils/spotifyClient.ts:133-137`
  - Scenario: refresh treats every 400 as invalid_grant and runs MusicLog_disconnect. A 400 can also mean invalid_client or a bad request. The tokens are wiped and the user must log in again with no message.
  - Fix: Read the error field from the JSON body. Disconnect only on invalid_grant. Save an error text for other 400s.
  - Effort: 0.5 hours.
- **V7. Native Spotify login makes its PKCE verifier and state with Math.random**
  - Severity: low. Seen. Kind: security.
  - File and line: `src/utils/spotifyLoginPlatform.native.ts:20-27; src/models/spotifyAuth.ts:30-32`
  - Scenario: randomBytes uses Math.random, which Hermes does not seed from a secure source. Someone who can see a few outputs can guess the verifier and state. SpotifyAuth_randomString also uses `b % 66`, which favors the first 58 characters.
  - Fix: Use a native secure random source such as react-native-get-random-values or a native module. Use rejection sampling in SpotifyAuth_randomString.
  - Effort: 1.5 hours.
- **V8. Saved listen links are not checked again before they are opened**
  - Severity: low. Suspect. Kind: security.
  - File and line: `src/components/listenLinksCard.tsx:18-20, 41-58; src/types.ts:1733`
  - Scenario: ListenLinks_normalize runs only when the user taps Save. The settings type accepts any string. A restored backup holding `javascript:...` is put in `<a href>` on web, or passed to Linking.openURL on the phone.
  - Fix: Run ListenLinks_normalize in ListenLink and skip the link if it returns undefined. Normalize listenLinks when settings load.
  - Effort: 1 hours.
- **V9. The Spotify refresh token sits in the same plain store as workout data**
  - Severity: low. Suspect. Kind: security.
  - File and line: `src/models/musicLog.ts:8-13; src/utils/musicStore.ts`
  - Scenario: IMusicLog keeps tokens next to the sessions in the bebear_music key. Backups and exports strip them. The device storage still holds the refresh token in plain text, and an iOS device backup would carry it.
  - Fix: Keep tokens in the iOS Keychain through a small native module. Keep only displayName in the log.
  - Effort: 4 hours.
- **V10. useShareCardExport.share picks the next event from the phase**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/shareCards/useShareCardExport.ts:84-93`
  - Scenario: The hook decides that prepared means share, ready or failed means retry, and anything else means start. This is a rule of the export state machine and has no test.
  - Fix: Add ShareCardExport_shareEvent(job, pages) to src/models/shareCardExport.ts and cover it in test/shareCardExport.test.ts.
  - Effort: 0.5 hours.
- **V11. screenMusic.tsx holds the title and message text rules**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/screenMusic.tsx:62-80, 164-171`
  - Scenario: sessionTitle formats the date and day name. save builds the 'Saved N songs' text and plural rule. play builds the play message. None has a test.
  - Fix: Move them to src/models/musicLog.ts as MusicLog_sessionTitle and MusicLog_saveStatus with mocha tests.
  - Effort: 1 hours.
- **V12. WorkoutStoryCard_isLoaded really means 'lifted some weight'**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/models/workoutStoryCard.ts:111-113`
  - Scenario: The name says data is loaded. It returns weightKg > 0 and picks LIFTED or TRAINED text for bodyweight workouts. A reader will look for a loading state.
  - Fix: Rename to WorkoutStoryCard_hasWeight. Update photoCard.tsx and the tests.
  - Effort: 0.25 hours.
- **V13. Export phase 'ready' means the share sheet was refused and needs another tap**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/models/shareCardExport.ts:1, 164-167, 199-206`
  - Scenario: After a refused share the job phase is 'ready'. 'prepared' is the phase where images are ready. The two names read as one state.
  - Fix: Rename 'ready' to 'needsTap' and update ShareCardExport_buttonTitle and the tests.
  - Effort: 0.5 hours.
- **V14. The pounds-per-kilo constant is written in several models**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/workoutStoryCard.ts:79; src/models/foodTargets.ts:89; src/models/programGoal.ts:63`
  - Scenario: kgPerLb = 0.45359237 is defined three times. WorkoutStoryCard_toNext divides by it by hand while the rest of the file uses Weight_convertTo.
  - Fix: Use Weight_convertTo in WorkoutStoryCard_toNext. Export one constant from src/models/weight.ts for the other two.
  - Effort: 1 hours.
- **V15. The 'is this set filmed' guard is written three times**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/setClips.ts:106-122, 129-144, 146-150`
  - Scenario: SetClips_groups, SetClips_historyGroups and SetClips_filmedSets each repeat the check for log, workoutId and exerciseId not being null, then call SetClips_find.
  - Fix: Add one SetClips_isFilmed(log, workoutId, exerciseId, setId) and call it from all three.
  - Effort: 0.5 hours.
- **V16. Supabase sign-in borrows its PKCE helpers from the SpotifyAuth module**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/utils/supabaseOAuth.ts:12, 29-31; src/utils/spotifyLoginPlatform.ts:12-17`
  - Scenario: SpotifyAuth_randomString and SpotifyAuth_base64Url are generic PKCE helpers. SupabaseOAuth_start repeats the same verifier and SHA-256 steps that SpotifyLoginPlatform_pkce does.
  - Fix: Move the helpers to src/models/pkce.ts. Make one web function that returns verifier and challenge.
  - Effort: 1 hours.
- **V17. SpotifyClient login, redirect finish and playlist fallback have no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `test/spotifyClient.test.ts; src/utils/spotifyClient.ts:89-121, 214-244`
  - Scenario: The tests cover only play and token refresh. finishLogin, the 403 tester-limit path, the /me/playlists to /users/{id}/playlists fallback, the /items to /tracks fallback and chunking are never run. SpotifyLoginPlatform has no test.
  - Fix: Add stubbed-fetch tests for each path in test/spotifyClient.test.ts.
  - Effort: 2 hours.
- **V18. The clip-note test only checks a constant against itself**
  - Severity: low. Seen. Kind: test.
  - File and line: `test/storeCaps.test.ts:34-37`
  - Scenario: The test asserts that SetClips_keepNote contains text built from SetClips_maxRecords. It cannot fail if SetClipMark stops showing the note. Its music fixture is also cast from the wrong shape (`songs: []`).
  - Fix: Test the rendered SetClipMark text, or export a function that returns the note and test its use. Use a real IMusicSession fixture.
  - Effort: 0.5 hours.
- **V19. D7 still open for music: the oldest sessions drop with no notice**
  - Severity: low. Seen. Kind: data. Still open from the 26 October audit: D7.
  - File and line: `src/models/musicLog.ts:15-16, 114-120; src/components/screenMusic.tsx`
  - Scenario: The cap is now 210 sessions, about one year at 4 a week. MusicLog_putSession still drops the oldest silently, and the music screen has no note. Backups hold the trimmed copy.
  - Fix: Show a line on the music screen like the clip note: 'beBEAR keeps the newest 210 workouts of music.' Test it like SetClips_keepNote.
  - Effort: 0.5 hours.

## Findings from the 26 October audit

- D7: partly fixed. Music cap raised from 60 to 210 in src/models/musicLog.ts:16, locked by test/storeCaps.test.ts. Clip cap stays at 300 (src/models/setClips.ts:24) and SetClips_keepNote is shown in src/components/setClipMark.tsx:25. The music screen still says nothing about old sessions being removed. Warmup and report stores are outside this slice.

## Checked with no finding

- ShareCardExport_next state machine: stale captured events, refused then retry, failed then retry, and busy re-start all handled; 205 lines of tests pass
- MusicSession_observe, mergeHistory, dropCopies and SongPerSet windows: logic holds, 117 tests across the slice pass
- MusicLog_exportJson and FullBackup_build both strip Spotify tokens
- SpotifyClient refresh is single-flight and retries once after a 401
- Web Spotify redirect does not clash with the Supabase ?code= return; index.tsx runs SupabaseOAuth_takeReturn first
- SetClipCapture and SetClipMark use div and button but are gated to web and OfflineOnly in workoutExerciseSetExpanded.tsx and historyRecord.tsx
- Set clip thumbnails are checked by SetClips_thumbnail (data URL, JPEG, size) before storing
- Every exported name in the slice has a caller in src; no dead exports found
- Share card pages all wait for the bear sprite via WorkoutStoryCard_exportImages; photo waits only for photo and collage
