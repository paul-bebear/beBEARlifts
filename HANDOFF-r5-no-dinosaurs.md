# Handoff R5: dinosaurs out

Branch `handoff-r5-no-dinosaurs`. Recommended Codex reasoning: low.

Read the R5 entry under "Build batches" in `REDESIGN_PLAN.md` on `master`, and "Art to commission or generate" under "The bear". Finding U29 is in `REVIEW-2026-10.md`.

## Wait for this first

The owner's cub still must exist as `images/bear/1-happy.svg` (viewBox 0 0 200 200, flat colours, under 20 KB). If the file is not on `master`, stop and say so. Do not draw one.

## Goal

No dinosaur shows anywhere the offline web build can reach. The cub shows in its place.

## What to build

- `historyRecordsNullState.tsx`: show the cub instead of the dinosaur.
- `screenProgramSelect.tsx` and `statsList.tsx`: replace their dinosaur images with the cub.
- `imagePreloader.tsx` and `imagePreloader.native.tsx`: replace `ImagePreloader_dynohappy` and the other dinosaur entries with the cub path. Keep the export names other files import, or update every import you find.
- `bundledImagesSvg.native.ts`: add the cub SVG under `/images/bear/1-happy.svg`, and remove the dinosaur SVGs that nothing reaches any more.
- Hide the Changelog in the offline build. It is the rebranded upstream changelog. Gate it in `screenSettings.tsx` or in `whatsnewParser.ts`, whichever is one small change, behind `OfflineOnly_isEnabled()`.
- Delete the `images/dino*.svg` and `images/dino*.png` files that no code references after these changes. Keep any that the tour, unit, equipment and hear-about-us screens still use, because the offline build never shows those screens. List which files you kept and why in the PR body.
- Leave `ios/LiftosaurWatchComplication/` alone.
- Do not touch `screenFinishDay.tsx`. Batch R1 already swapped its dinosaur.

## Files

- `src/utils/imagePreloader.tsx`, `src/utils/imagePreloader.native.tsx`, `src/utils/bundledImagesSvg.native.ts`
- `src/components/historyRecordsNullState.tsx`, `src/components/screenProgramSelect.tsx`, `src/components/statsList.tsx`
- `src/models/whatsnewParser.ts` or `src/components/screenSettings.tsx`, one of the two
- the `images/dino*` files

## Order

After the owner's cub art lands and after R1 merges. It shares no file with any other group 2 batch.

## Check on your iPhone list for the PR

- Delete all history on a test account, or use a fresh install after onboarding. Home's empty history shows the cub.
- Settings → Program → choose a program. No dinosaur.
- Settings shows no Changelog row.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
