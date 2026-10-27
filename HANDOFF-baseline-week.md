# Handoff: piece W, the baseline rules and program

You are the Opus build session for the baseline week's rules in `BASELINE_WEEK_PLAN.md`. Read its sections "The baseline, day by day", "From the baseline to the plan" and "Modules and tests" before the first edit. Then read `CLAUDE.md`, whose "Where logic lives" rule shapes every file here. This piece holds design calls. The plan names them under piece W in its "Build split" section.

## Before you start

- Piece L, the level retune, must be on master. Check that `BearTier_all("male")[2].minKg` is 12000.
- `HOUSE_HOME_PLAN.md` piece B, the whiteboard, must be on master, because both pieces change `src/models/bearBoard.ts`. Check that `BearBoard_goalLines` exists. If it does not, stop and say so in the PR body of an empty draft.

## What you build

One branch, one PR titled "Add the baseline week's rules, program and result [skip deploy]". Do not merge it. 14 hours.

The modules and their tests exist before any component changes. No new screen is built here; piece S builds them from these modules.

- New `src/models/baselineWeek.ts`. The state: `version`, `startedDay` as a day key, `restDays` 1 to 3, `pendingPlan` as `IBearPlanParams`, `programId`, `doneAt`. `BaselineWeek_parse` and `BaselineWeek_empty` with the usual guards. `BaselineWeek_restDays(lastTrained)` maps `today`, `recent`, `longer` to 3, 2, 1. `BaselineWeek_start(input)` builds the state. `BaselineWeek_phase(state, today)` returns `rest`, `test` or `done`. `BaselineWeek_day(state, today)` returns 1 on `startedDay`. `BaselineWeek_restUntil(state)` returns the timestamp of the first test day's midnight. `BaselineWeek_nextTest(state, history)` returns the next untested test day index from the program's four test days, by `dayName` on the history records of `programId`. `BaselineWeek_isDone(state, history, today)` is true when the four test days have a counted record or when `BaselineWeek_day` is 13 or more. `BaselineWeek_boardLine(state, today)` returns "Baseline · day 4 of 10" and the day's one-line reason for the sheet. New `test/baselineWeek.test.ts` covers the three rest lengths, a missed test day, the day-13 cap, and the line on every day of a 3-rest-day week.
- New `src/models/baselineProgram.ts`. `BaselineProgram_days(params)` takes the pending plan's days from `bearPlan.ts`, keeps the picks whose template is `main`, `mainYouth` or `build`, dedupes by name, and splits them into Lower A, Upper A, Lower B and Upper B in the slot order the plan gives. Export the slot grouping from `bearPlan.ts` as a function rather than copying the tables. `BaselineProgram_text(params, settings)` writes one week with seven days: rest days are the `mobility` template with the three mobility slots, test days hold the tests. One test is three sets: set 1 at 0.7 times the pick's `lb`, set 2 at `lb`, set 3 at 1.15 times `lb` as "5+", each rounded with `Weight_round` to the pick's equipment in the user's unit, with the progress block `rm1 = calculate1RM(completedWeights[3], completedReps[3])`. Under 18, `params.youth`, the sets read 8, 8 and "8+". A bodyweight pick is one set "1x1+" with no progress block. The exercise note is "Stop with 2 reps left in you. Never grind." New `test/baselineProgram.test.ts` evaluates every place subset and days value with `PlannerMode_commitFullText` and `PlannerProgram_evaluateFull`, as `test/bearPlan.test.ts` does, and asserts that each compound pick of the pending plan appears exactly once across the four test days.
- New `src/models/baselineResult.ts`. `BaselineResult_from(input)` reads the history records of `programId`, `stats.weight`, the food log and the notes between `startedDay` and today. It returns rows per tested lift with the top set's weight and reps and the Epley estimate through `Weight_getOneRepMax`, the first and last weigh-in, the average kcal and protein a day against the targets, the average energy, soreness and mood, and the first photo and tape readings after `startedDay` when present. `BaselineResult_startLb(result, params)` returns a start per tested pick name: 80 percent of the estimate for `main`, 72 for `mainYouth`, 65 for `build`, and for a bodyweight pick a `sets` string with 60 percent of the tested reps rounded down and at least 3. `BaselineResult_deltas(result, history)` returns the change per lift since the baseline. `BaselineResult_shareText(result, cub)` returns "Cub 412 · baseline done · 12 lifts measured", with "Cub ?" when there is no number. New `test/baselineResult.test.ts` covers a full week, a week with one missed test, a bodyweight-only week, a missing second weigh-in, and the rounding of every template.
- `src/models/bearPlan.ts`: `BearPlan_text(params, starts?)`, where `starts` maps a pick name to `{ lb }` or `{ sets }`. `exerciseLines` reads the start before the table. The golden files do not change. `test/bearPlan.test.ts` gains one case with starts for a 4-day gym plan and evaluates it.
- `src/models/bear.ts`: `IBearSources` gains `restUntil?: number`. While `now < restUntil`, energy is 100 and the mood is never `tired`. `test/bear.test.ts`.
- `src/models/bearBoard.ts`: when a baseline is running, the first line is `BaselineWeek_boardLine` with target `baseline`. `IBearBoardTarget` gains `"baseline"`. `test/bearBoard.test.ts`.
- `src/models/plusOffer.ts`: `PlusOffer_afterFirstProgram` takes `baselineRunning` and returns false while it is true. `test/plusOffer.test.ts`.
- `src/models/fullBackup.ts`: the baseline store is backed up and restored. `test/fullBackup.test.ts`.
- `src/models/journalDay.ts`: a day equal to `startedDay` carries a `baseline` entry, so the Journal can open the card. `test/journalDay.test.ts`.
- New `src/utils/baselineStore.ts`: `JsonStore_create("bebear_baseline", BaselineWeek_parse, BaselineWeek_empty)`.

Wiring, the only component edits in this piece: pass `restUntil` where `Bear_state` is called, pass `baselineRunning` where `PlusOffer_afterFirstProgram` is called, and pass the baseline state into `BearBoard_lines`. The `baseline` target does nothing until piece S.

## Design calls you own

- How the work-up sets round when the pick's `lb` is small, for example a 10 lb lateral raise is never tested, but a 30 lb goblet squat gives 20, 30 and 35.
- What happens when a user finishes a test day twice. The plan says one workout a day counts; the result reads the best top set.
- What the card shows with a missing weigh-in or an untested lift. The plan says one number, and the table's default start.

## Done means

- `npm test` and `npm run lint` are green. Every new module has its test. `scripts/lint-views.ts` flags nothing new.
- The PR body lists the modules and their public functions, the three design calls and how you made them, and a phone checklist of three items: start a new first run on the web build and read the Baseline line on the whiteboard, finish a test day and open the exercise stats to see the 1RM, and confirm the beBEAR+ offer does not show before day 10.

## Conventions

- No simulator or browser testing. The owner tests on the iPhone from the checklist. A screenshot of the web app from `npm start` is enough for the PR.
- Change files with the Edit and Write tools, never a shell rewrite.
- Zero comments unless the code cannot carry the fact. Commit messages name what the user sees. No AI attribution lines.
- Push the branch a second time as `preview/baseline-week` so Vercel builds a preview the owner opens in Safari. Put the URL in the PR body.
