# Handoff: film a set

Branch `handoff-filming`. Read `AGENTS.md` first and follow its rules: logic in pure modules with mocha tests, thin `.tsx` files, no AI attribution lines in commits. Do no simulator or browser testing; the user tests on an iPhone Home Screen app. Run `npx tsc --noEmit`, eslint on the changed files and the new tests, then open a PR against `master` with a short "Check on your iPhone" list.

## Goal

During a workout the user taps a camera button on a set, films the set with the iPhone camera, and saves the clip to Photos. The app remembers that the set was filmed, so history shows a camera mark on it.

## Design

- **Where:** the expanded set row in `src/components/workoutExerciseSetExpanded.tsx`, next to the existing set options. Show it only in the offline build (`OfflineOnly_isEnabled()`) and on web (`Platform.OS === "web"`). Use `src/components/icons/iconCamera.tsx`.
- **Recording:** a hidden `<input type="file" accept="video/*" capture="environment">`. On iPhone it opens the camera in video mode. When the user finishes recording, the input gets a `File`.
- **Saving:** call `navigator.share({ files: [file] })`. The share sheet shows "Save Video", which puts it in Photos. A Home Screen app cannot write to Photos directly. If `navigator.canShare({ files: [file] })` is false, fall back to a download link, the way `src/utils/exporter.ts` does for JSON.
- **The video never goes into IndexedDB.** Clips are often 20 to 200 MB and would fill the app's storage.
- **What is stored:** a small record per filmed set in IndexedDB key `bebear_clips`, through `JsonStore_create` (`src/utils/jsonStore.ts`). Each record holds the workout id, the set's `id`, the exercise id, the time, the clip's size in bytes and its duration in seconds if the browser gives it. Also store a thumbnail: grab one frame with a `<video>` and a `<canvas>`, as a JPEG data URL under about 30 KB at 160 px wide. Keep the newest 300 records.
- **Workout id:** a running workout has id 0 until it finishes. History then uses its `startTime` as the id. Store `startTime`, the same rule as `MusicTracking_workoutOf` in `src/models/musicTracking.ts`.
- **History:** in the set rows of a past workout (`src/components/historyRecord.tsx` or the set component it uses), show a small camera mark on filmed sets. Tapping it shows the thumbnail and "Saved to Photos at <time>".
- **"Export everything":** include the clip records (`src/models/fullBackup.ts`, plus the export and import in `src/ducks/thunks.ts`). The thumbnails are small enough.

## Pure modules and tests

`src/models/setClips.ts`: the record type, parse, put (newest first, capped at 300), find by workout and set, and the thumbnail size rule. Test it in `test/setClips.test.ts`. The component only runs the input, the share call and the canvas grab.

## Check on your iPhone list for the PR

- Open a set, tap the camera, film 5 seconds, then tap Use Video. The share sheet opens. Tap Save Video. The clip is in Photos.
- Finish the workout. History shows a camera mark on that set, with the thumbnail.
