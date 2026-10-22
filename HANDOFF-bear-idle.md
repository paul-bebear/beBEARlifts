# Handoff: the bear breathes, and two level comparisons differ

Branch `handoff-bear-idle`. Recommended Codex reasoning: medium.

Two small changes to the bear.

## 1. An idle breathing animation

My bear's gym scene (`src/components/bearScene.tsx`, layout in `src/models/bearScene.ts`) draws the bear as a still image. Make it look alive:

- A slow breathing loop: the sprite scales from 1.00 to 1.015 tall and back, about every 3.5 seconds, anchored at the feet so they never leave the floor line.
- When the mood is `tired`, breathe at half speed. When the mood is `pumped`, breathe a little faster (about every 2.5 seconds).
- When the user has Reduce Motion on, no animation.
- Web: a CSS keyframe animation with `transform-origin` at the feet, or the platform's animation API. Native: `Animated` with the native driver.
- The timing and scale numbers for each mood are a pure function with a mocha test, in `src/models/bearScene.ts` or a new small module named by what it does.
- Home's bear head (`src/components/bearAvatar.tsx`) and the share cards stay still.

## 2. Titan and Astronaut both say "a Delta IV Heavy"

`src/models/bearComparison.ts` picks the largest object from a mass list that is not heavier than the level's kg. With the men's thresholds, Titan (900,000 kg) and Astronaut (1,400,000 kg) both land on "a Delta IV Heavy" (733,000 kg), because nothing in the list sits between 733,000 and 1,400,000.

Add one or two real objects with a true mass between 900,000 and 1,400,000 kg so Astronaut gets its own line. Check the women's set too (60% of the men's thresholds), so no two levels in either set share a comparison. Add a test in `test/bearComparison.test.ts` that fails if two levels in either set ever share a comparison.

## Files

- `src/components/bearScene.tsx`, `src/models/bearScene.ts`, `test/bearScene.test.ts`, or a new small model and its test for the animation numbers
- `src/models/bearComparison.ts`, `test/bearComparison.test.ts`

## Order

It can run now. A Claude session is running review batch K (code health). Its first PR does not touch these files. Before you open the PR, rebase onto the latest `origin/master`. If a file conflicts, keep batch K's change and redo yours on top.

## Check on your iPhone list for the PR

- Open My bear and watch the bear for 10 seconds. It breathes slowly, and its feet stay on the floor.
- Turn on Reduce Motion (Settings → Accessibility → Motion). The bear stands still.
- Look at the level bar text near Titan and Astronaut: each names a different object.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. If you need another file, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. In a fresh checkout, first copy `localdomain.js` and `src/generated/` from `/Users/paulbebear/Code/GitHub/beBEARlifts`, run `npm run build:programs`, and run `npm install` if `@callstack/liquid-glass` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- The owner has authorized you to push your branch and open the PR against `master`.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
