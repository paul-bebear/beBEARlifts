# Handoff R4: camera-first Food, and the meals section

Branch `handoff-r4-food`. Recommended Codex reasoning: medium.

Read these parts of `REDESIGN_PLAN.md` on `master` first: "Food" under "Screen-by-screen changes", "The Journal" (for where the meals section ends up), and the R4 entry under "Build batches".

## Goal

Two ways to log food. The "+" Food flow (`screenFoodAdd.tsx`) opens the camera first, with a Barcode and AI scan toggle, then one "Serving size / Description" step. The Food day screen becomes a meals section that batch R6 later mounts inside the Journal: a "What did you eat?" box first, the day's entries, and a macros pill.

## What to build

- `screenFoodAdd.tsx`: full-screen camera with a two-part toggle, Barcode and AI scan. Barcode uses `foodBarcodeScanner.tsx`. AI scan uses `foodPhotoPanel.tsx`. Without AI consent the toggle reads Barcode and Describe. Then one step: the recognised items, a grams or servings field, an editable description line, a "Share with friends" switch that is drawn but disabled (batch B3 turns it on), and one Add button. Search stays reachable from this screen as a text link.
- New pure `src/models/foodScanSteps.ts`: the steps (camera, result, serving) and the events between them, as a reducer. The component owns only the camera and the fetches.
- New pure `src/models/foodMealForTime.ts`: `FoodMealForTime_pick(date)` returns breakfast before 11:00, lunch from 11:00 to 15:00, snack from 15:00 to 18:00, dinner after 18:00. The serving step shows the meal as one chip the user can change.
- `screenFood.tsx` becomes `src/components/journalMeals.tsx`, a section component with no nav of its own. Keep `screenFood.tsx` as a thin screen that renders `journalMeals.tsx`, so the `food` stack keeps working until R6 replaces its root. Order: the text box "What did you eat?" (multiline, Send inside the row, a small camera icon that opens the "+" Food flow), the day's entries grouped by meal with kcal and protein, then the macros pill.
- `foodDescribePanel.tsx`: move its state (text, loading, choices, note, error) into a new pure reducer `src/models/foodDescribeEstimate.ts`. The component keeps only the `FoodApi_describe` call. Choices still show through `FoodChoicesReview`, and one tap adds them.
- `foodSummaryCard.tsx`: the big card becomes a pill, "🔥 1,240 · C 130 · P 84 · F 40". A tap expands it into the current summary with the Consumed and Remaining toggle, the Full Breakdown, and "Targets" (the old gear). The copy-day icon becomes "Same as yesterday" on the Log food screen.
- Empty day: "Start logging your meals…" in grey.

## Files

- `src/components/screenFood.tsx`, new `src/components/journalMeals.tsx`
- `src/components/foodDescribePanel.tsx`, `src/components/screenFoodAdd.tsx`, `src/components/foodSummaryCard.tsx`
- new `src/models/foodDescribeEstimate.ts`, new `src/models/foodScanSteps.ts`, new `src/models/foodMealForTime.ts`
- tests: new `test/foodDescribeEstimate.test.ts`, new `test/foodScanSteps.test.ts`, new `test/foodMealForTime.test.ts`

## Order

Runs now, beside O1, O2 and R3. It shares no file with them. R6 builds the Journal on top of `journalMeals.tsx` after this merges, and B3 enables the share switch.

## Check on your iPhone list for the PR

- Tap Food. The meals section shows "What did you eat?" at the top. Type "two eggs and toast", Send. Choices show. One tap adds them under the right meal.
- The macros pill shows the day. Tap it. Consumed and Remaining, Full Breakdown and Targets are inside.
- Open the camera flow. Scan a barcode. The serving step shows the product, a grams field and the meal chip set by the clock.
- Switch to AI scan, take a photo of a meal. The serving step shows the items. "Share with friends" is visible and greyed out.
- With AI turned off in Settings, the toggle reads Barcode and Describe.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
