# Handoff F1: polish from the first phone test

Branch `handoff-f1-polish`. Recommended Codex reasoning: medium.

The owner tested `master` at 9f4188ed on their iPhone, signed out. These six fixes come from that test. Each one is small. Do all six in one PR.

## 1. The empty-history card points at the wrong tab

`src/components/historyRecordsNullState.tsx` shows the cub with "Tap here to start a workout" and an arrow down to where the old middle Workout button was. R2 moved the start to the "+" circle on the right, so the arrow now points at the Journal tab.

Make the card itself the start button. Text: "Start your first workout". Tapping it does what the "+" sheet's Workout button does: resume an ongoing workout, or open `nextWorkoutModal`. Remove the arrow.

## 2. "+" Note should open the editor directly

Today the Note square in `src/components/plusSheet.tsx` pushes the Journal (`food` tab) and then opens `noteEditorModal`. On the phone the user lands on the Journal and has to scroll to find the note. Open `noteEditorModal` for today directly, over the current screen, without switching tabs. After Done, the user is back where they were.

## 3. "+" Measurement should open body scans

The Measurement square opens `stats`, which only takes bodyweight. Open the `bodyScans` screen instead. Batch F4 adds a photo scan to that screen at the same time. Do not edit `screenBodyScans.tsx`.

## 4. Journal sections fold once logged

In `src/components/screenJournal.tsx`, a section that has data for the day folds to one summary line. Examples: "Check-in · Energy 4 · Soreness 4 · Mood 4", "Weigh-in · 74 kg", "Meals · 3 logged · 1,850 kcal". Tapping the line opens the section again. A section with no data stays open. The fold state is a pure function of the day's data, in `src/models/journalDay.ts` or a new module, with tests.

## 5. Meals says "Log meals"

The Meals section's empty state talks about settings. With no meals logged, it shows a "Log meals" button that opens food add for today and the meal for the time of day (`foodAdd`, `FoodMealForTime_pick`). Find the text in `screenJournal.tsx` or `journalMeals.tsx`.

## 6. One Export button

The Journal has "Export this day" and "Export all days". Replace both with one "Export" button that opens a small sheet:

- Range: Today, Last 7 days, All days.
- Format: Markdown, or CSV.
- An Export button that writes the file through `src/utils/exporter.ts`.

Markdown stays one file per day, zipped when there is more than one day, as today. CSV is one file with one row per logged item: date, kind (workout, meal, weigh-in, check-in, note, song), title, and the numbers that kind has. The range filter and the CSV writer are pure, in `src/models/journalExport.ts`, with tests.

## Files

- `src/components/historyRecordsNullState.tsx`
- `src/components/plusSheet.tsx`, `src/models/quickActions.ts`, `test/quickActions.test.ts`
- `src/components/noteEditor.tsx`, only if direct opening needs it
- `src/components/screenJournal.tsx`, `src/components/journalMeals.tsx`
- `src/models/journalDay.ts`, `test/journalDay.test.ts`
- `src/models/journalExport.ts`, `test/journalExport.test.ts`
- `src/utils/exporter.ts`, only if CSV needs a change
- a new small sheet component for the export choices

## Order

It can run now. Other batches running at the same time own these files:

- B1b (Claude): `AppNavigator*.tsx`, `src/navigation/types.ts`, My bear, `programHistory.tsx`, the finish screen, bear components.
- F5 (Claude): `src/components/editProgram/**`, `NavScreenProgram.tsx`.
- F2: onboarding files. F3: `foodScanCamera.tsx`. F4: `screenBodyScans.tsx`, `bodyScans.ts`, a new `api/ai/` route.

If you need a new route, stop and say so in the PR body, because B1b owns the navigator.

## Check on your iPhone list for the PR

- With no workouts in history, Home shows "Start your first workout". Tapping it starts the next workout.
- On Home, tap "+", then Note. The editor opens over Home. Done brings you back to Home.
- Tap "+", then Measurement. The body scans screen opens.
- In the Journal, log a check-in. It folds to one line with the three numbers. Tap it to open it again.
- With no meals today, Meals shows "Log meals". It opens food add.
- Export: pick Last 7 days and CSV. The file opens in Numbers or Files.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. If you need another file, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. In a fresh checkout, first copy `localdomain.js` and `src/generated/` from `/Users/paulbebear/Code/GitHub/beBEARlifts` and run `npm run build:programs`. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
