# Handoff: show the first-use tips

Branch `handoff-first-use-tips`. Recommended Codex reasoning: medium.

Batch O2 built the tips but never shows them. `src/models/firstUseTips.ts` holds four tips and `FirstUseTips_next(event, helps)`. `src/components/tipBar.tsx` draws one tip with a close button. Nothing mounts either. O2 turned the upstream tours off, so a new user today gets no help on the workout screen.

## Goal

A new user sees each tip once, at the moment it explains something on screen. One tip shows at a time. A tip that was shown never comes back, also after a backup restore, because the seen ids go into `storage.helps`, which the backup already carries.

## When each tip shows

- `setTap`: the first time a workout screen opens with no completed set.
- `crossedWeight`: the first time a set row shows a crossed-out planned weight next to the weight the plates can make. Find the component that draws it.
- `finishTap`: the first time the user completes a set, so they learn how to end the workout.
- `programEditorOpen`: the first time the program screen opens.

A tip stays until the user closes it or the next tip replaces it. When a tip shows, its id goes into `storage.helps` through the same action the app already uses to mark a help as seen. Find it in `src/ducks/` and reuse it. Do not add a new store.

The decision of which tip to show now, given the event, the current tip and `helps`, is logic. Put it in `firstUseTips.ts` with tests. The components only report the event and draw the `TipBar`.

## Files

- `src/models/firstUseTips.ts`, `test/firstUseTips.test.ts`
- `src/components/tipBar.tsx`, only if its look needs a fix
- `src/components/workout.tsx`, the host for the workout tips
- `src/components/workoutExerciseSet.tsx`
- the one component that draws the crossed-out weight. Name it in the PR body.
- `src/components/workoutFinishButton.tsx`
- `src/navigation/screens/NavScreenProgram.tsx`

Do not touch `src/components/screenWorkout.tsx` or `src/components/workoutMenu.tsx`. Batch R2 owns them now. If the only place to mount the workout tip is `screenWorkout.tsx`, stop and say so in the PR body.

## Order

It can run now, beside R2 (running), R5, B1a and S1. None of them touches these files.

## Check on your iPhone list for the PR

Use a fresh install, or delete the `helps` entries by restoring an old backup without them.

- Start the first workout. The tip about tapping the circle shows.
- Tap a set's circle. The tip about Finish shows.
- On a set where the plates cannot make the planned weight, the crossed-out tip shows once.
- Open the program screen. The plan tip shows.
- Close the app and start a second workout. No tip shows.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
