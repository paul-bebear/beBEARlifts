# Handoff F4: read a body-scan printout from a photo

Branch `handoff-f4-body-scan-photo`. Recommended Codex reasoning: high. It adds an AI task behind sign-in and the AI caps.

The owner weighs in on the body-composition scale at their gym (Basic-Fit). The scale gives a printout or a screen with weight, body fat, muscle, water and bone, and they take a photo of it. Today the app takes these numbers only by hand, in `src/components/screenBodyScans.tsx`. They want to take a photo and have the numbers filled in.

## What to build

- On the body scans screen, a "Scan the printout" button above the manual form. It takes a photo with the camera or picks one from the photo library. Reuse how the food photo scan captures, resizes and sends an image (`src/components/foodPhotoPanel.tsx` and `.native.tsx`, and the client that calls `api/food/photo.mjs`).
- The server reads the photo through a new task `bodyscan` in `api/food/photo.mjs`, next to `meal`, `describe` and `label`. Reuse its pipeline, its size limits and its `AiAuth_check(request, ai, "capped")`, so the scan counts against the 3 a day and 10 a week cap like the other photo scans. Do not add a new route, because a new route needs a `vercel.json` change.
- The task returns JSON with the fields of `IBodyScanValues` in `src/models/bodyScans.ts`: `weight`, `bodyFatPct`, `muscleMass`, `waterPct`, `boneMass`, `visceralFat`, `bmrKcal`, `metabolicAge`, plus `unit` ("kg" or "lb"). Any value it cannot read is left out. It never guesses a number that is not printed. Water printed in kg converts to percent only when weight is printed too, and otherwise is left out.
- The answer pre-fills the manual form. The user checks the numbers and taps Save. Nothing saves without that tap.
- Errors read like the food scan's errors: signed out shows "Sign in to use AI scans", the cap shows the cap message from `src/models/aiCaps.ts`, and an unreadable photo shows "Couldn't read that. Try a sharper photo, or type the numbers."
- AI consent: follow the same consent check the food AI scan uses (`aiConsentClient`).

The answer parsing and the merge into the form are pure, in `src/models/bodyScans.ts` or a new `src/models/bodyScanRead.ts`, with tests that cover a full printout, a partial one, a kg water value, lb units, and junk.

## Files

- `api/food/photo.mjs`, and its test if one exists
- `src/components/screenBodyScans.tsx`
- `src/models/bodyScans.ts`, `test/bodyScans.test.ts` if it exists
- new `src/models/bodyScanRead.ts`, `test/bodyScanRead.test.ts`
- the client file that calls `api/food/photo.mjs`, only to send the new `kind`
- a new small photo component for this screen, if the food photo panel cannot be reused as is

## Order

It can run now. Other batches running at the same time own these files:

- B1b (Claude): `AppNavigator*.tsx`, `src/navigation/types.ts`, My bear, `programHistory.tsx`, the finish screen.
- F5 (Claude): `src/components/editProgram/**`, `NavScreenProgram.tsx`.
- F1: `plusSheet.tsx` (it points "+" Measurement at this screen), `screenJournal.tsx`. F2: onboarding files. F3: `foodScanCamera.tsx`.

Do not edit `foodPhotoPanel.tsx` or `foodPhotoPanel.native.tsx`. If you cannot reuse them without a change, copy what you need into the new component and say so in the PR body.

## Check on your iPhone list for the PR

Signed in, with AI allowed:

- Open My bear → Body composition (or "+" → Measurement once F1 lands), then Scan the printout. Pick a photo of a scale printout. The form fills in. Change one number, then Save. The scan shows in the list.
- Pick a photo of something else. The error asks for a sharper photo, and the form stays empty.

Signed out:

- Scan the printout shows "Sign in to use AI scans". Typing the numbers still works.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. If you need another file, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. In a fresh checkout, first copy `localdomain.js` and `src/generated/` from `/Users/paulbebear/Code/GitHub/beBEARlifts` and run `npm run build:programs`. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
