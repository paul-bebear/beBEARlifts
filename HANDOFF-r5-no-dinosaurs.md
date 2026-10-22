# Handoff R5: bear art in, dinosaurs out

Branch `handoff-r5-no-dinosaurs`. Recommended Codex reasoning: low.

Read the R5 entry under "Build batches" in `REDESIGN_PLAN.md` on `master`. Finding U29 is in `REVIEW-2026-10.md`. Two things changed since the plan was written. The art is generated PNGs, not SVGs. The bear has 12 levels, not 10.

## Goal

The generated bear art is in the repo at a phone-friendly size. No dinosaur shows anywhere the offline web build can reach. The level 1 bear (the cub) shows in its place.

## Part 1: import the art

The source files are on this Mac, outside the repo.

- Male: `/Users/paulbebear/Documents/Codex/2026-10-22/i-w/outputs/bebear-assets/`
- Female: `/Users/paulbebear/Documents/Codex/2026-10-22/make-the-female-line-of-the/outputs/bebear-assets-female/`

Each holds 12 levels and 12 moods as 1024 × 1536 transparent PNGs, plus `asset_manifest.json`. The male folder also holds the 6 gym backgrounds. Skip the `review_*` sheets, `prompts.json`, `validation.json` and the `references/` folder.

Convert and copy them to these paths. Use two-digit numbers.

- `images/bear/male/level-01.webp` to `level-12.webp`, from `bear_level_NN.png`
- `images/bear/male/mood-<size>-<mood>.webp`, from `bear_mood_<size>_<mood>.png`. Sizes: small, medium, big, space. Moods: hungry, tired, pumped.
- `images/bear/female/level-01.webp` to `level-12.webp`, and the same 12 mood files, from the `bear_f_*` files
- `images/bear/gyms/<name>.webp`, from `gym_<name>.png`. Names: bedroom, garage, pro, spaceship, moon, mars.
- `images/bear/male/manifest.json` and `images/bear/female/manifest.json`, copied unchanged from `asset_manifest.json`

Sizes:

- Bears: 512 × 768, WebP quality 80, alpha kept. Each file should land under 80 KB.
- Gyms: 768 × 1152, WebP quality 75. Each file should land under 150 KB.

Try `sips -s format webp` first. If this macOS cannot write WebP, run `brew install webp` and use `cwebp -resize`. Put the exact commands in the PR body, so the owner can re-run them when the female set gets its fixes.

The female set will be re-generated in part: the tired moods and levels 06 to 09. Re-running the commands must overwrite the files in place, with the same names.

Check how the service worker decides what to cache, but do not change it. Say in the PR body whether the new files are cached for offline use.

## Part 2: dinosaurs out

The cub is `images/bear/male/level-01.webp`.

- `historyRecordsNullState.tsx`: show the cub instead of the dinosaur.
- `screenProgramSelect.tsx` and `statsList.tsx`: replace their dinosaur images with the cub.
- `imagePreloader.tsx` and `imagePreloader.native.tsx`: replace `ImagePreloader_dynohappy` and the other dinosaur entries with the cub path. Keep the export names other files import, or update every import you find.
- `bundledImagesSvg.native.ts` holds SVGs only. Remove the dinosaur SVGs that nothing reaches any more. In the native build, load the cub the same way the native code loads other raster images today. If it loads none, use `require()` and say so in the PR body.
- Hide the Changelog in the offline build. It is the rebranded upstream changelog. Gate it in `screenSettings.tsx` or in `whatsnewParser.ts`, whichever is one small change, behind `OfflineOnly_isEnabled()`.
- Delete the `images/dino*.svg` and `images/dino*.png` files that no code references after these changes. Keep any that the tour, unit, equipment and hear-about-us screens still use, because the offline build never shows those screens. List which files you kept and why in the PR body.
- Leave `ios/LiftosaurWatchComplication/` alone.
- Do not touch `screenFinishDay.tsx`. Batch R1 already swapped its dinosaur.

## Files

- new `images/bear/**`
- `src/utils/imagePreloader.tsx`, `src/utils/imagePreloader.native.tsx`, `src/utils/bundledImagesSvg.native.ts`
- `src/components/historyRecordsNullState.tsx`, `src/components/screenProgramSelect.tsx`, `src/components/statsList.tsx`
- `src/models/whatsnewParser.ts` or `src/components/screenSettings.tsx`, one of the two
- the `images/dino*` files

## Order

It can run now. It shares no file with R2 (running), S1, B1a or the first-use tips batch. B1a refers to the image paths above as strings, so keep the names exact.

## Check on your iPhone list for the PR

- Delete all history on a test account, or use a fresh install after onboarding. Home's empty history shows the cub.
- Settings → Program → choose a program. No dinosaur.
- Settings shows no Changelog row.
- Turn on Airplane mode after one load. The cub still shows.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the image sizes, the test counts, and ends with a "Check on your iPhone" list.
