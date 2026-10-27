# Handoff: piece S, the baseline screens and the goal wizard

You are the Sonnet build session for the baseline week's screens in `BASELINE_WEEK_PLAN.md`. Read its sections "The baseline, day by day", "The goal is gain" and "Modules and tests" before the first edit, then `CLAUDE.md`. This piece is fully specified. Make no design calls; where the plan is silent, ask in the PR body.

## Before you start

Piece W must be on master. Check that `src/models/baselineWeek.ts`, `src/models/baselineProgram.ts` and `src/models/baselineResult.ts` exist with their tests. Every rule you need is in them. If one is missing, stop and say so.

## What you build

One branch, one PR titled "Run the baseline week on the first run and trim the goal wizard [skip deploy]". Do not merge it. 12 hours.

The models first.

- `src/models/onboarding.ts`: `IOnboardingStep` gains `baseline`. The flow is welcome, place, about, want, then plan or import, then `baseline`, then `done`. The `baseline` step's main action is "Start my baseline" and it is enabled when `answers.lastTrained` is set. On `start` from `baseline`, the result carries `pendingPlan` from the selected card's `params` and the state calls `BaselineWeek_start`. `test/onboarding.test.ts`.
- `src/models/onboardingAnswers.ts`: `lastTrained?: "today" | "recent" | "longer"`. `OnboardingAnswers_goalKind` returns `buildMuscle` for every plan goal. `foodGoal` is always `gain`. `OnboardingAnswers_canContinueAbout(answers)` requires a weight in range. `test/onboardingAnswers.test.ts`.
- `src/models/onboardingChoices.ts`: `OnboardingChoices_lastTrained` with the three labels "Today or yesterday", "2 or 3 days ago", "Longer". `test/onboardingChoices.test.ts`.
- `src/models/programGoal.ts`: `ProgramGoal_offeredKinds()` returns `[buildMuscle]`. `ProgramGoal_kinds` stays for parsing and labels. `test/programGoal.test.ts`.
- `src/models/goalWizard.ts`: `GoalWizard_steps` drops `goal`. `GoalWizard_start` sets `kind` to `buildMuscle` when there is no current goal. `test/goalWizard.test.ts`.

Then the views. Each one renders a module's result and runs effects. No decision lives in a component.

- `src/components/onboardingQuestions.tsx` and `.native.tsx`: the "about" step requires the weight and shows "Enter your weight" under the field while it is empty. The "Food targets (optional)" fieldset "What is your weight goal?" is removed; "How active are you?" stays. A new `baseline` step with the three lines from the plan, the last-trained question as three choice buttons, and nothing else.
- `src/components/onboardingChat.tsx` and `.native.tsx`: mount the `baseline` step, and on `start` install the program from `BaselineProgram_text`, write the baseline store, and set the food targets from `OnboardingAnswers_foodTargets`. The `done` step reads "Your baseline starts now." with a "Go to my house" button.
- New `src/components/baselineSheet.tsx`: the day's line from `BaselineWeek_boardLine` and a short reason. Opened from `screenHome.tsx` when the board target is `baseline`.
- New `src/components/baselineCard.tsx`: the day-10 card from `BaselineResult_from`: the rows, the two weights, food, check-ins, the photo and tape when present, and one button, "Start my plan", which calls `BaselineResult_startLb`, `BearPlan_text(params, starts)`, installs the plan with `OnboardingProgram_prepare`, sets `doneAt` and lets `PlusOffer_afterFirstProgram` run. The card opens by itself when `BaselineWeek_isDone` turns true on the home screen, and from the Journal's Day 0 entry after that, where it shows `BaselineResult_deltas` instead of the button.
- New `src/components/shareCards/baselineCard.tsx`: the share card with the bear and `BaselineResult_shareText`. It joins the pager where the other cards are registered. It shows a Share button; it never opens the share sheet by itself unless the owner's answer in the plan's open questions says so.
- `src/components/screenHome.tsx`: `openBoardTarget` sends `baseline` to the sheet.
- `src/components/screenJournal.tsx`: the Day 0 entry opens the card.
- `src/components/goalWizardSteps.tsx` and `src/components/screenGoalWizard.tsx`: no goal step. The intro's text says the goal is to build muscle.

## What you do not touch

The rules. If a screen needs a decision the modules do not give, add it to the module with a test, never to the component. Do not change `bearTier.ts`, `bearGrowth.ts`, the share card export, or anything under `supabase/`. Do not change an existing user's `loseFat` or `maintain` goal; the owner decides that in the plan's open questions.

## Done means

- `npm test` and `npm run lint` are green. `scripts/lint-views.ts` flags nothing new; a function it flags moves to a module.
- The PR body gives a phone checklist of six items: a new first run reaches "Start my baseline" with the weight required; the house shows "Baseline · day 1 of 10" and a tap opens the sheet; a rest day shows the stretch session as the Train line; a test day shows "Test · Lower A"; after four test days the card appears and "Start my plan" installs the plan with the tested weights; the goal wizard opens on the activity step.

## Conventions

- No simulator or browser testing. The owner tests on the iPhone from the checklist. A screenshot of the web app from `npm start` is enough for the PR.
- Change files with the Edit and Write tools, never a shell rewrite.
- Zero comments unless the code cannot carry the fact. Commit messages name what the user sees. No AI attribution lines.
- Push the branch a second time as `preview/baseline-screens` so Vercel builds a preview the owner opens in Safari. Put the URL in the PR body.
