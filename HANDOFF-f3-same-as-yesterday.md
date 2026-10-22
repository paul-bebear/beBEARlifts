# Handoff F3: pick from yesterday's food

Branch `handoff-f3-same-as-yesterday`. Recommended Codex reasoning: medium.

`src/components/foodScanCamera.tsx` has a "Same as yesterday" link. The owner wants it to show what they ate yesterday as a checklist, so they can tick the items they had again, such as the morning protein coffee and the shake, without the meals they did not repeat.

## What to build

- Tapping "Same as yesterday" opens a list of yesterday's food entries, grouped by meal, each with a checkbox, its name, its amount and its kcal.
- Nothing is ticked at first. A "Log N items" button logs the ticked entries for today. Each copy keeps its meal from yesterday, unless the user opened food add for a specific meal. Then every copy goes into that meal.
- With nothing logged yesterday, the link stays visible and the list says "Nothing logged yesterday". Look back up to 7 days and offer the most recent day that has food: "Nothing yesterday. Show Tuesday?"
- Copied entries are new entries with new ids and today's time. They do not link to yesterday's entries.

The list building, the grouping, the look-back and the copy rules are pure, in a new `src/models/foodRepeat.ts` with `test/foodRepeat.test.ts`. Reuse the food log functions in `src/models/foodLog.ts` (`FoodLog_dayKey`, `FoodLog_shiftDay`).

## Files

- `src/components/foodScanCamera.tsx`
- a new `src/components/foodRepeatList.tsx`, or the list inline if it stays short
- new `src/models/foodRepeat.ts`, `test/foodRepeat.test.ts`
- `src/models/foodLog.ts`, only to export a helper you need

## Order

It can run now. Other batches running at the same time own these files:

- B1b (Claude): `AppNavigator*.tsx`, `src/navigation/types.ts`, My bear, `programHistory.tsx`, the finish screen.
- F5 (Claude): `src/components/editProgram/**`, `NavScreenProgram.tsx`.
- F1: `plusSheet.tsx`, `screenJournal.tsx`, `journalMeals.tsx`. F2: onboarding files. F4: `screenBodyScans.tsx`, `bodyScans.ts`, a new `api/ai/` route.

If the list needs a new route or modal, stop and say so in the PR body, because B1b owns the navigator.

## Check on your iPhone list for the PR

- Log three items today. Tomorrow, open "+" → Food → Same as yesterday. All three show, none ticked.
- Tick two and tap "Log 2 items". Only those two appear in today's meals.
- On a day after a day with no food, the list offers the last day that had food.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. If you need another file, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. In a fresh checkout, first copy `localdomain.js` and `src/generated/` from `/Users/paulbebear/Code/GitHub/beBEARlifts` and run `npm run build:programs`. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
