# Cleanup scoreboard

Phase 0 of `CLEANUP_PLAN.md`. Measured on 2026-11-18 on `master` at d5df8641, with Node 22.22.0 and a clean `npm ci`.

Eight of the nine numbers are measured. The copied-code number (`jscpd`) is not measured. The tool is not in `package.json` and the session could not install it. See number 8.

"Ours" means a file with status `A` in `git diff --name-status a7a402c2 HEAD`. The scope for the knip count and the untested count is `src api supabase scripts ios/Liftosaur`. That scope holds 476 added files: 269 `ts`, 151 `tsx`, 21 `sql`, 18 `mjs`, and 17 of other kinds. The plan said 465.

The after lines stay empty until phase 5.

## 1. Failing test files

- Before: 0 of 351 test files fail.
- Command: `npm test`
- Date: 2026-11-18
- After:

The 26 October audit counted 5 failing files. All five are fixed (finding H1).

`npm test` runs `pretest` first. That step regenerates `src/models/exerciseDescriptions.ts`. Do not run `npx eslint .` while `npm test` runs, or lint will see the half-written file.

## 2. Lint errors

- Before: 0 errors, 0 warnings.
- Command: `npx eslint .` (without `--fix`)
- Date: 2026-11-18
- After:

The first run, made while `npm test` was running, reported 2,225 `prettier/prettier` errors, all in `src/models/exerciseDescriptions.ts`. That file is rewritten by `pretest`. A second run on a quiet tree reported 0.

By rule: none. By ours versus upstream: none.

The 26 October audit counted 38 errors. All are fixed (finding H2).

## 3. Type errors

- Before: 1 error, in a file we added.
- Command: `npx tsc --noEmit`
- Date: 2026-11-18
- After:

The 1 error: `src/components/foodQuickAddPanel.tsx:28:74`, TS2345. The state object has no `micros` key, and `Record<keyof INutrients, string>` now requires it. The micros work in 2b75a8eb added the key to `INutrients`.

On a fresh checkout, before `npm run build:pwa` creates `programdata/`, `tsc` reports 17 errors. 16 of them are missing `programdata/*.json` modules in `src/utils/onboardingCatalog.ts` and `test/onboardingCommand.test.ts`. They go away after the build.

## 4. Our logic files with no test

- Before: 50 of 254.
- Command: a script that lists every added file directly under `src/models` and `src/utils`, then looks for an import of it in any file under `test/`. The list is in `docs/cleanup/untested-files.txt`.
- Date: 2026-11-18
- After:

The count is by import, not by name. A platform file such as `purchases.native.ts` counts as untested when no test imports that exact file, even if a test imports `purchases.ts`. The plan's rough count of 87 came from a same-name match and overcounted.

Groups in the list:

- 17 platform variants (`.native.ts` and `.ios.ts`).
- 9 files that start with `use` (React hooks).
- 3 `*Client.ts` network wrappers.
- 21 others. Most are the plain `.ts` side of a platform pair, such as `purchases.ts` and `imageResize.ts`. The rest include `jsonInText.ts`, `recipeCatalogData.ts` and `workoutStart.ts`.

## 5. Unused files and exports in our files (`knip`)

- Before: 6 unused files and 33 unused exports in our files. 186 more unused exported types.
- Whole repo: 50 unused files, 404 unused exports, 520 unused exported types, 7 duplicate exports.
- Command: `npx knip --reporter json` with a temporary `knip.json` outside git (see below).
- Date: 2026-11-18
- After:

`npm run knip` crashes on this repo. It has no config, and knip's eleventy plugin throws `templateFormats.join is not a function` on `.eleventy.js`. The numbers above come from a temporary `knip.json` with `"eleventy": false`. It named these entry files: `src/*.{ts,tsx}`, `src/watch/index.ts`, `src/consent/consentEntry.ts`, `api/**`, `test/**`, `scripts/**`, `lambda/index.ts`, `devserver.ts`, `index.js` and `index.native.ts`. The file was deleted after the run. A real `knip.json` is a phase 3 job. A wrong entry list moves these numbers.

Unused files of ours:

- `src/components/badgeUnlockedSheet.tsx`
- `src/components/bearAvatar.tsx`
- `src/components/bearLookSheet.tsx`
- `src/components/foodSearchBar.tsx`
- `src/components/primitives/glassBar.tsx`
- `src/components/shareCards/badgeCard.tsx`

Unused exports of ours:

- `src/components/icons/iconFoodUi.tsx`: `IconCopyDay`
- `src/components/progressHubCards.tsx`: `ProgressPhotosCard`, `ProgressStepsCard`
- `src/components/workoutReportCard.tsx`: `WorkoutReportCard`
- `src/ducks/cloudBackupThunks.ts`: `CloudBackup_ownerDeclinedError`
- `src/models/bearArt.ts`: `BearArt_folder`
- `src/models/bearHouse.ts`: `BearHouse_image`
- `src/models/bearLook.ts`: `BearLook_furs`, `BearLook_lines`
- `src/models/bodyScanMassShare.ts`: `BodyScanMassShare_toMass`, `BodyScanMassShare_toPercent`
- `src/models/cloudBackup.ts`: `CloudBackup_ownerQuestion`
- `src/models/exerciseDemoCache.ts`: `ExerciseDemoCache_limits`
- `src/models/exerciseDemos.ts`: `ExerciseDemos_url`
- `src/models/foodLog.ts`: `FoodLog_zero`
- `src/models/journalDay.ts`: `JournalDay_sectionParts`
- `src/models/openFoodFacts.ts`: `OpenFoodFacts_parseProduct`
- `src/models/phoneSheet.ts`: `PhoneSheet_image`
- `src/models/plusOffer.ts`: `PlusOffer_afterNavigationMs`
- `src/models/recipeCatalog.ts`: `RecipeCatalog_allergenNames`, `RecipeCatalog_book`, `RecipeCatalog_dietNames`, `RecipeCatalog_userRecipeId`
- `src/models/recipeRecommendations.ts`: `RecipeRecommendations_passes`
- `src/models/rulerTape.ts`: `RulerTape_buildStops`, `RulerTape_edgePad`
- `src/models/season.ts`: `Season_all`
- `src/models/seasonNudge.ts`: `SeasonNudge_kcalTarget`
- `src/utils/foodLogStore.ts`: `FoodLogStore_get`, `FoodLogStore_key`, `FoodLogStore_subscribe`
- `src/utils/pressFeedback.ts`: `PRESSED_ATTRIBUTE`
- `src/utils/useBearBadges.ts`: `useBadgeCelebration`

Files with the most unused exported types: `src/models/rulerTape.ts` (6), `workoutStoryCard.ts`, `reportsHub.ts`, `journalDay.ts` and `bodyScans.ts` (5 each).

Many unused exports are test hooks that only `test/` uses. Phase 3 decides which to keep.

## 6. Open findings rated high

- Before: 0.
- Command: read each finding in `REVIEW-2026-10-26.md` against the current code. Results are in `docs/cleanup/review-2026-10-26-status.md`.
- Date: 2026-11-18
- After:

The four high findings (M1, D1, D2, X1) are fixed in the repo. Of all 28 codes, 24 are fixed, 3 are open (P3, P5, P7) and 1 is unsure (P6). The supabase fixes are in migration files. Nobody checked that the live project ran them.

This number counts only the old audit. Phase 1 adds new findings.

## 7. Packages with a high or critical warning

- Before: 34 packages. 2 critical and 32 high.
- Total in `npm audit --omit=dev`: 47 (4 low, 9 moderate, 32 high, 2 critical).
- Command: `npm audit --omit=dev`
- Date: 2026-11-18
- After:

Critical:

- `form-data`
- `shell-quote`

High, direct dependencies of ours (9): `@vercel/oidc`, `aws-cdk-lib`, `jsonwebtoken`, `markdown-it`, `openai`, `prismjs`, `react-native`, `sharp`, `uplot`.

High, pulled in by another package (23): `@react-native/codegen`, `@react-navigation/core`, `@vercel/cli-config`, `axios`, `brace-expansion`, `browserslist`, `decode-uri-component`, `fast-uri`, `image-size`, `js-yaml`, `jws`, `linkify-it`, `minimatch`, `nanoid`, `picomatch`, `postcss`, `query-string`, `semver`, `source-map-js`, `tinyglobby`, `ws`, `y18n`, `zod`.

Phase 1's security reader names the route by which our code reaches each one. Many are build tools that never ship in the app.

## 8. Copied code blocks in our files (`jscpd`)

- Before: not measured.
- Command: `npx jscpd --min-tokens 30` over the added code files
- Date: not run
- After:

`jscpd` is not in `package.json` and not in `node_modules`. `npx --yes jscpd` downloads it from the npm registry. The session's permission check refused that download. Nothing was installed.

To finish this number, run `npx jscpd --min-tokens 30` over the files listed by `git diff --name-status a7a402c2 HEAD -- src api supabase scripts ios/Liftosaur`, status `A`, extensions `ts`, `tsx`, `mjs`, `swift`. Or allow the install and ask this session to run it. The ten largest clones go here when it runs.

## 9. App bundle size after gzip

- Before: 1,778,278 bytes (1,736.6 KiB), the total of all 8 JavaScript and CSS files in `dist`.
- Command: `npm run build:pwa`, then `gzip -9 -c <file> | wc -c` for each file in `dist`
- Date: 2026-11-18
- After:

The build passed. webpack warned that assets exceed 244 KiB.

Files, largest first, in gzip bytes:

- `app.ebffb11b0ab8eaeb335c.js`: 961,119
- `vendors.3cd3c8127beaed2af61a.js`: 653,384
- `chunks/495.2c8aea2de95c03c9e96e.js`: 113,994
- `chunks/700.85eee2a14e96a682e113.js`: 19,747
- `app.4a33276300f11783bc5f.css`: 15,439
- `chunks/477.0480c2e0958b3b26aecf.js`: 7,058
- `webpushr-sw.js`: 4,344
- `chunks/482.5503f5be34010b4a77be.js`: 3,193

Images, fonts and the `programdata` folder are not in this total.

## Other numbers

- `npx ts-node scripts/lint-views.ts` reports 1 warning and 145 entries kept in `scripts/lint-views-baseline.json`. The warning is `onFile` in `src/components/foodLabelPanel.tsx:30`. The plan said 129 baseline entries.
- The raw output of every command is kept in the session scratchpad, not in the repo.
