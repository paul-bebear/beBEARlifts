# Codex handoff: run tracking for the beBEARlifts web app

Phase 2 of 5 done: pure modules and backup wiring are written. Tests, views, navigation and the PR remain.

Branch `claude/nostalgic-meninsky-623e2d`, worktree `/Users/paulbebear/Code/GitHub/beBEARlifts/.claude/worktrees/nostalgic-meninsky-623e2d`. Base `master`. Nothing is type-checked or tested yet.

Read `CLAUDE.md` first. Logic lives in pure modules with mocha tests. `.tsx` files only render and run effects. Follow the prose and comment rules. No AI attribution lines in commits. Do not use the iOS Simulator or a browser. The user tests on their iPhone.

## Goal

Log runs in the offline web app (lifts.paulbebear.com, installed on the iPhone Home Screen). Show pace per km, splits, and a route map. Share a story card. iOS stops a Home Screen web app when the screen locks, so the screen must stay on during a run. Background GPS waits for the native app (`NATIVE_PLAN.md`).

## Done

- `src/models/runTrack.ts`: point filter `RunTrack_judge` (drops accuracy over 25 m, jumps over 25 km/h, steps under 5 m, stale timestamps). Haversine distance, moving time without pauses, pace, splits per full km with interpolated crossing time, fastest km, elevation gain (5-point moving average, 3 m threshold), recent pace over 30 s. Formatters: `RunTrack_formatPace` gives `m:ss /km`, plus `formatDuration` and `formatKm`.
- `src/models/runRoute.ts`: Douglas-Peucker on an equirectangular projection. `RunRoute_simplify` raises the tolerance until the route has fewer than 300 points and rounds to 5 decimals. `RunRoute_fit` projects the route into a box with one scale for x and y and returns SVG `points` strings plus start and end points.
- `src/models/runLog.ts`: `IRun` and `IRunLog` with `parse`, `empty`, `put`, `remove`, `pace` and `fastestSplit`. `RunLog_splitBars` gives the fastest km a full bar.
- `src/models/runRecording.ts`: the recording state machine. It has `start`, `pause`, `resume`, `addPoint`, `isSaveDue` (10 s), `snapshot`, `restore`, `toRun`, `parse`, `hasFreshFix` and `gpsErrorText`. `restore` brings back a run that was recording as paused at its last save time and sets `wasRestored: true`.
- `src/models/runEquivalents.ts`: `RunEquivalents_pick(distanceM, seed)` returns `ILiftEquivalent` jokes such as "N football pitches".
- `src/utils/runStore.ts`: `RunStore` is `bebear_runs`. `RunDraftStore` is `bebear_run_draft` and holds the in-progress recording.
- Backup: `src/models/fullBackup.ts` has `runs` in `IFullBackup`, the parts, the build, the unwrap and the readme. `src/utils/fullBackupFile.ts` loads `RunStore`. `src/ducks/thunks.ts` restores `contents.runs` into `RunStore` on import.

## Remaining

1. Fix the existing tests that now fail to type-check. Run `git diff test/` first. One edit to `test/fullBackup.test.ts` may have half-applied.
   - `test/fullBackup.test.ts`: add `runs: RunLog_empty()` to `parts()`. Add a test that round-trips runs and returns `runs: undefined` for an older backup without them.
   - `test/cloudBackupThunks.test.ts`: add `runs` to the restore test's `parts`. Stub `RunStore.update` and assert that it gets the runs.
2. Add new tests: `test/runTrack.test.ts`, `test/runRoute.test.ts`, `test/runRecording.test.ts`, `test/runLog.test.ts` and `test/runEquivalents.test.ts`. Cover the filter verdicts, a 2 km straight track giving 2 splits, pause time left out of moving time, elevation noise under 3 m giving 0 gain, simplify keeping fewer than 300 points, the fit keeping its aspect ratio, `formatPace(299.6)` giving `5:00 /km`, restore pausing, and the parse round trip.
3. Add `src/utils/runSensors.ts`, which only runs platform effects.
   - `RunSensors_isAvailable()` checks `navigator.geolocation`.
   - `RunSensors_watch(onPoint, onError)` wraps `watchPosition` with `{ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }` and returns a function that clears the watch. Map each position to `IRunPoint` as `{ t, lat, lon, acc, alt }`.
   - `RunSensors_keepScreenOn()` calls `navigator.wakeLock.request('screen')` behind a feature check. It requests again on `visibilitychange` when the page is visible and returns a release function.
4. Add these views:
   - `src/components/screenRuns.tsx` shows a Start button, the history list and the selected run's results. On mount it calls `RunDraftStore.load()`, then `RunRecording_restore`.
   - `src/components/runRecorder.tsx` shows distance, moving time, average pace, recent pace, GPS accuracy and the text "Keep the screen on. Locking the phone stops GPS." It has Pause, Resume, Finish (with a confirm) and Lock touches. Its effects are the GPS watch, the wake lock and a 1 s tick. The tick saves `RunRecording_snapshot` to `RunDraftStore` when `isSaveDue` says so. The draft is also saved on start, pause, resume and when the page goes hidden. Lock touches opens a react-native `Modal` that covers the whole screen with dark stats. A `Pressable` inside it unlocks on `onLongPress` with `delayLongPress={1500}`. Finish puts the run with `RunLog_put`, clears the draft and opens the results.
   - `src/components/runResult.tsx` shows the stats, the split rows with bars, a Delete button and the share card.
   - `src/components/runRouteSvg.tsx` draws `RunRoute_fit` with `Svg`, `Polyline` and `Circle` from `src/components/primitives/svg`.
   - `src/components/runShareCard.tsx` copies `src/components/workoutStoryCard.tsx`: 360×640 at 3x through html-to-image, an optional photo, a Shuffle button, and sharing through `ImageShareUtils`. Put the route large in the middle with distance, time, pace and climb around it. Add `runShareCard.native.tsx` that returns null.
5. Navigation: add `runs` to `IScreenData` in `src/models/screen.ts` and map it to the tab `"graphs"`. Add `runs: undefined` to `IGraphsStackParamList` in `src/navigation/types.ts`. Add `src/navigation/screens/NavScreenRuns.tsx`, copying `NavScreenBodyScans`. Register it in `AppNavigator.tsx` and in `AppNavigator.native.tsx`.
6. Entry points: add a `LinkRow` "Runs" in `src/components/screenProgressDashboard.tsx` and a small Run button in the sticky header of `src/components/programHistory.tsx`, under `WeekInsights`. Show both only when `OfflineOnly_isEnabled() && RunSensors_isAvailable()`.
7. Verify with `npx tsc --noEmit`, `npx eslint <changed files>` and `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register <test files>`. The full `npm test` does not load on this Mac.
8. Delete this file, commit, and open a PR against `master`.
   - List the next steps: posting runs to the friends feed, and background GPS in the native app.
   - Add a "Check on your iPhone" list for a 5-minute walk test before a real run: grant location, keep the screen on, and check the distance against a known route. Also check that a reload in the middle of the walk brings the run back paused, and that Lock touches ignores taps.

## Debugging map

- The distance is too short on a winding route: `RunTrack_minStepM` is 5 m.
- The distance has gaps: points are dropped by the 25 m accuracy limit or the 25 km/h jump limit. `IRunRecording.dropped` counts them.
- A run comes back paused after a reload: `RunRecording_restore` does that on purpose.
- The screen sleeps: the wake lock needs iOS 18.4 or later in a Home Screen web app.
