# Handoff R1: cut the finish screen

Branch `handoff-r1-finish-screen`. Recommended Codex reasoning: medium.

Read these parts of `REDESIGN_PLAN.md` on `master` first: "The finish screen" under "Screen-by-screen changes", and the R1 entry under "Build batches". Finding U15 is in `REVIEW-2026-10.md`.

## Wait for this first

PR #59 (the share-card rework, branch `share-cards-bear`) must be merged into `master` before you start. It rewrites the story card section of the same screen. Run `git log origin/master --oneline | grep "#59"`. If it prints nothing, stop and say so.

## Goal

The finish screen keeps one celebration, one card pager, one row of three actions, and the workout facts. Everything else goes.

## What to build

- New pure `src/models/finishDayActions.ts`: `FinishDayActions_list(input)` returns the action row, in order Add photo, Share, Music. It drops Music when the music feature is off, and drops Share when the export is not available. Test it in `test/finishDayActions.test.ts`.
- `screenFinishDay.tsx`, top to bottom:
  - An X in the top-left nav slot. It does what Continue did: push Home and run `Thunk_maybeRequestReview`. The nav title becomes the day name. Remove the "Congratulations" title.
  - A bear placeholder in place of the dinosaur. Use `BearMark` from `src/components/shareCards/bearMark.tsx`. Batch R5 removes the dinosaur files later and does not touch this screen. Batch B1 replaces the placeholder with the celebrating bear.
  - Program and day name.
  - The story card pager from #59, with its page tabs. Remove its "Shuffle" and "Share all 4" buttons.
  - One row of three round icon buttons from `FinishDayActions_list`: Add photo, Share (the existing export), Music (pushes `music`).
  - The share-with-friends toggle (`FeedShareToggle`), one row, off by default.
  - Totals, exercises, sets per muscle group, personal records and the report card, unchanged.
- Remove: `MobileShare` and `WebappShare` (IG Story, IG Feed, TikTok, Text, More, Copy Link, Image), "or just copy a link", "Review this workout's songs", "Play cooldown", the Create Program Day button, and Continue. Delete code that nothing calls after the cut. The cooldown link moves to the Music screen in a later batch, so do not add it anywhere now.

## Files

- `src/components/screenFinishDay.tsx`
- new `src/models/finishDayActions.ts`, new `test/finishDayActions.test.ts`
- If PR #59 left the "Shuffle" and "Share all 4" buttons inside `src/components/shareCards/shareCardPager.tsx` or `workoutSharePage.tsx`, you may edit that one file to remove them. Name it in the PR body.

## Order

After PR #59 merges. It shares no file with O1, O2, R3, R4 or R7.

## Check on your iPhone list for the PR

- Finish a workout. The screen shows the bear, the day name, the card pager, three round buttons, the friends toggle off, then the totals.
- No IG, TikTok, Copy Link, Continue, songs review or cooldown link anywhere on the screen.
- Tap Share. The share sheet opens with the current card.
- Tap Music. The Music screen opens.
- Tap X. Home opens.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
