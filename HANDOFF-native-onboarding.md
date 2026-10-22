# Handoff: the beBEAR first run in the native build

Branch `handoff-native-onboarding`. Recommended Codex reasoning: high. This is the first thing a TestFlight user sees.

The web app has the six-screen beBEAR first run from batch O2 (#61), extended by F2 (#77): welcome with sign-in, where you train, about you (with activity and weight goal), what you want (with days per week), and the plan cards. It lives in `src/components/onboardingChat.tsx` with `src/components/onboardingWelcome.tsx`, `onboardingQuestions.tsx` and `onboardingPlanCards.tsx`, driven by the pure models `src/models/onboarding.ts`, `src/models/onboardingAnswers.ts`, `src/models/bearPlanRecommend.ts` and `src/utils/onboardingCommand.ts`.

The native build does not have it. `src/components/onboardingChat.native.tsx` only renders its children, and `src/navigation/screens/NavScreenOnboarding.native.tsx` shows whatever upstream Liftosaur shows. A user who installs the TestFlight build gets no beBEAR first run, no plan cards, and no food targets.

## Goal

The native build runs the same first run as the web, with the same answers and the same result: the recommended beBEAR plan is installed, the equipment is set, food targets are saved, and the user lands on Home.

## What to build

- Find out why the web version cannot run on native as is: DOM elements, CSS classes that Uniwind does not support, web-only inputs, or `window` calls. List what you find in the PR body.
- Make the six screens run on native. Prefer sharing the same components with small `.native.tsx` pieces only where a web-only part blocks it, over copying the whole flow. The models and `onboardingCommand.ts` stay shared and unchanged, unless a native need forces a change.
- Sign-in on the welcome screen: the native Apple and Google sign-in (batch S2) is not built yet. Show the email-code option only on native, and leave a slot for the two buttons.
- The upstream tours stay off, as on the web.
- Logic that decides anything goes in pure modules with tests. Views only render.

## Files

- `src/components/onboardingChat.native.tsx`, `src/navigation/screens/NavScreenOnboarding.native.tsx`
- `src/components/onboardingWelcome.tsx`, `onboardingQuestions.tsx`, `onboardingPlanCards.tsx`, and new `.native.tsx` siblings where needed
- `src/components/onboardingChat.tsx`, only to move shared parts out of it
- `src/models/onboarding.ts`, `src/models/onboardingAnswers.ts`, `src/utils/onboardingCommand.ts`, only if a native need forces it. Say why in the PR body.

## Order

It can run now. A Claude session is running review batch K (code health), and its first PR removes unused exports from `src/models/onboarding.ts`, `onboardingAnswer.ts` and `onboardingAnswers.ts`. Avoid those files if you can. Before you open the PR, rebase onto the latest `origin/master`. If a file conflicts, keep batch K's change and redo yours on top.

## Check on your iPhone list for the PR

This needs a native build from Xcode (the owner runs it). The list:

- Delete the app, install the TestFlight or Xcode build, and open it. The beBEAR welcome screen shows.
- Answer every screen: place, about you with activity and goal, what you want with days per week. The plan cards show, with the recommended plan first.
- Pick a plan. Home shows the plan's first day, Food shows the targets, and the equipment matches the place you picked.
- Skip the food questions on a second install. Food shows "Set your targets".

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. If you need another file, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. In a fresh checkout, first copy `localdomain.js` and `src/generated/` from `/Users/paulbebear/Code/GitHub/beBEARlifts`, run `npm run build:programs`, and run `npm install` if `@callstack/liquid-glass` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- The owner has authorized you to push your branch and open the PR against `master`.
- Open a PR against `master`. The body lists what blocked native, what changed, the test counts, and ends with a "Check on your iPhone" list.
