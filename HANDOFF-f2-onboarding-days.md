# Handoff F2: days per week and food targets in onboarding

Branch `handoff-f2-onboarding-days`. Recommended Codex reasoning: high. Onboarding decides which program every new user gets.

The owner tested the six-screen first run (batch O2) on their iPhone. Three changes came out of it. The first two reverse the plan's "no days or minutes" rule, on the owner's request.

## 1. Ask days per week before the plan cards

Today `BearPlan_recommend` in `src/models/bearPlanRecommend.ts` picks the recommended plan from experience alone: new means 3 days, months means 4, years means 5. The owner wants to be asked first.

- Add a question "How many days a week can you train?" with the chips 2, 3, 4, 5 and 6+. Put it on the "want" screen under the goal, or as its own short step before "plan". Pick the one with fewer taps.
- Add `days` to `IBearPlanInput` and to the onboarding answers in `src/models/onboardingAnswers.ts`. The recommended card follows the answer: 2 or 3 means the 3-day plan, 4 means the 4-day plan, 5 or 6+ means the 5-day split. With no answer, keep today's rule from experience.
- The other two plans still show below as alternatives, as today.
- Users under 18 keep the youth rule. Do not change it.

## 2. Set food targets during onboarding

After onboarding, the owner went to Food → Set your targets → Calculate my targets and typed weight, height and age again, then picked activity and goal. The "about" screen already asks age, height, weight and sex. Onboarding should finish with food targets set.

- Add two questions: activity (the same choices as the food targets calculator) and the body goal (gain, keep or lose weight). Put them where they cost the fewest taps, for example under the "about" fields or on a short step after "want".
- At the end, compute the targets with the existing pure functions in `src/models/foodTargets.ts` and save them the same way "Use these numbers" does in `src/components/foodTargetsCalculator.tsx`. Find that save path and reuse it, so the Food screen shows the targets right away.
- Skipping stays possible. A user who skips gets no targets, as today.

## 3. Rename one chip

In `src/components/onboardingChat.tsx` the place chip "Street workout bars" becomes "Street workout". Change the native file too if it has the label.

## Files

- `src/models/bearPlanRecommend.ts`, `test/bearPlanRecommend.test.ts`
- `src/models/onboarding.ts`, `test/onboarding.test.ts`
- `src/models/onboardingAnswers.ts`, `test/onboardingAnswers.test.ts`
- `src/utils/onboardingCommand.ts`, its test if one exists
- `src/components/onboardingChat.tsx`, `src/components/onboardingChat.native.tsx`
- `src/components/onboardingQuestions.tsx`, `src/components/onboardingPlanCards.tsx`, only if the new questions live there
- `src/models/foodTargets.ts`, only to export a helper you need. Do not change its numbers.

## Order

It can run now. Other batches running at the same time own these files:

- B1b (Claude): `AppNavigator*.tsx`, `src/navigation/types.ts`, My bear, `programHistory.tsx`, the finish screen, bear components. B1b reads the sex answer from storage to pick the bear's line. Do not rename or move where the sex answer is stored.
- F5 (Claude): `src/components/editProgram/**`, `NavScreenProgram.tsx`.
- F1: `plusSheet.tsx`, `screenJournal.tsx`, `historyRecordsNullState.tsx`. F3: `foodScanCamera.tsx`. F4: `screenBodyScans.tsx`, `bodyScans.ts`, a new `api/ai/` route.

## Check on your iPhone list for the PR

Use a fresh install, or Settings → reset onboarding if the app has it.

- The place screen says "Street workout".
- Answer 3 days a week with "years" of experience. The recommended card is the 3-day plan, with the 4-day and 5-day plans below.
- Answer 5 days. The recommended card is the 5-day split.
- Finish onboarding, then open Food. The targets are already set, with no extra questions.
- Skip the food questions on a second fresh install. Food shows "Set your targets" as before.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. If you need another file, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. In a fresh checkout, first copy `localdomain.js` and `src/generated/` from `/Users/paulbebear/Code/GitHub/beBEARlifts` and run `npm run build:programs`. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
