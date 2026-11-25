# Handoff: piece M, the monthly max day

You are the Opus build session for the monthly max day in `BASELINE_WEEK_PLAN.md`. Read the "Max day, once a month" part of its "From the baseline to the plan" section before the first edit, then `CLAUDE.md`. This piece holds design calls, named below.

## Before you start

Piece S must be on master. Check that `src/models/baselineProgram.ts` and `src/models/baselineResult.ts` exist with their tests, and that the first run installs the baseline. If not, stop and say so.

## What you build

One branch, one PR titled "Max out the big four once a month [skip deploy]". Do not merge it. 10 hours.

The owner's rule, in their words: "we need to have pr squat/DL/BP/SP and those need to be tracked with users maxing out once a month. the rest establishes a baseline so that we can accurately reccomend the weights each time. first time may be a bit off but we learn from their workouts and reccomend weights accurately to ensure progressive overload."

The module first.

- New `src/models/maxDay.ts`. The big four are the slots `squat`, `hinge`, `horizontalPush` and `verticalPush`, mapped through `BearPlanSlots_pick` to the user's place. `MaxDay_due(state, today)` is true 28 days after the baseline's last test day and every 28 days after the last completed max day, and stays true for 7 days or until done. `MaxDay_program(params, settings)` reuses the test builder from `baselineProgram.ts` for the four picks, same work-up, same "2+" or "4+" rule, as a one-day program. `MaxDay_reanchor(result, program)` returns the program with each big-four working weight set to the larger of the current weight and 80 percent of the new estimate, rounded with `Weight_round`. `MaxDay_history(history)` returns, per lift, the estimate at each max day in date order. The state, `lastMaxDay` and `maxDays`, lives in the baseline store. New `test/maxDay.test.ts` covers the due dates, a skipped max day that expires, the re-anchor floor when the user is already above it, and a bodyweight place where the max is reps.
- `src/models/bearBoard.ts`: when `MaxDay_due` is true, the Train line reads "Max day · squat, deadlift, bench, press" with the user's pick names. `test/bearBoard.test.ts`.
- `src/models/gymBagCheck.ts`: when due, the sheet's title says "Max day" and the start opens the max day's workout instead of the planned day. `test/gymBagCheck.test.ts`.

Then the views.

- `src/components/gymBagCheckSheet.tsx` and `src/components/screenHome.tsx`: one line each, starting the one-off workout from `MaxDay_program` when the sheet says so. On finish, `MaxDay_reanchor` rewrites the current program and the store records the max day.
- `src/components/bearPanelSheet.tsx`: a "Records" section with the four current estimates and a small line per lift across the max days, from `MaxDay_history`. The workout share card already names the records set, so no new share card.

## Design calls you own

- How the one-off workout is installed and removed: an ad hoc workout from the program text, or a temporary day in the program. Pick the one that keeps `program.nextDay` where it was.
- The Records section's line chart: reuse `CheckInTrend_segments` from `src/models/checkInTrend.ts` if it fits, or a 4-point sparkline.
- What the panel shows before the first max day: the baseline's four estimates as a single point.

## What you do not touch

The baseline schedule in `baselineWeek.ts`, the plan generator's templates, the kg counting, the levels.

## Done means

- `npm test` and `npm run lint` are green. `scripts/lint-views.ts` flags nothing new.
- The PR body gives a phone checklist of four items: with a baseline finished 28 days ago the whiteboard reads "Max day"; the door opens the four tests; after finishing, the next planned day's big-four weights read the re-anchored values; the bear panel shows the Records section.

## Conventions

- No simulator or browser testing. The owner tests on the iPhone from the checklist. A screenshot of the web app from `npm start` is enough for the PR.
- Change files with the Edit and Write tools, never a shell rewrite.
- Zero comments unless the code cannot carry the fact. Commit messages name what the user sees. No AI attribution lines.
- Push the branch a second time as `preview/baseline-maxday` so Vercel builds a preview the owner opens in Safari. Put the URL in the PR body.
