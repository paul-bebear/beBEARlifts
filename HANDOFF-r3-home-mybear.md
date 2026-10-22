# Handoff R3: Home, and Progress folded into My bear

Branch `handoff-r3-home-mybear`. Recommended Codex reasoning: medium.

Read these parts of `REDESIGN_PLAN.md` on `master` first: "Tabs and the "+"", "One calendar: the Journal", "Home" under "Screen-by-screen changes", "My bear" (only its last bullet, the dashboard), "The daily loop", and the R3 entry under "Build batches". Findings U23 and U25 are in `REVIEW-2026-10.md`.

## Goal

Home gets the header from the owner's sketch: a bear head placeholder, seven day dots and a day pill. The Progress screen becomes the lower half of a new My bear screen, which becomes the root of the `graphs` stack. The daily checklist becomes Train, Feed the bear, Weigh-in, with weigh-in weekly.

## What to build

- `screenProgressDashboard.tsx`: remove `ProgressCalendarHeader` and the person icon. Add `WeekInsights` under Workout consistency. Export the body as `ProgressSections` so `screenMyBear.tsx` can render it.
- New `screenMyBear.tsx`: a thin shell. The nav title is "My bear" for now, and the gear stays at the top right. It renders a placeholder slot at the top (batch B1 fills it), a second empty slot under it (batch R6 mounts `checkInChart.tsx` there), then `ProgressSections`. Keep the slots as named props or a named child, so B1 and R6 add to the shell without rewriting it.
- `AppNavigator.tsx` and `AppNavigator.native.tsx`: `screenMyBear` becomes the root of the `graphs` stack in place of `progressDashboard`. Every screen that is registered under that stack today stays registered. Change nothing else in these two files, because batches R2 and R6 edit them after you.
- `programHistory.tsx` header: a bear head placeholder on the left (use `BearMark` from `src/components/shareCards/bearMark.tsx` if PR #59 has merged, else a plain circle with "🐻"). Seven day dots to its right: a dot is filled when that day of this week has a workout or a food entry. A tap on the dots pushes the `food` tab, the future Journal. A tap on the head pushes the `graphs` tab. Under it, "Today" and the day pill. Remove `WeekCalendar`, the Run button and `WeekInsights` from Home.
- New pure `src/models/weekDots.ts`: takes history, the food log and `now`, and returns seven entries (date and filled). Week starts follow the user's existing week-start setting.
- New pure `src/models/todayPill.ts`: returns the pill text from the next program day's name, for example "Legs!", or "Rest day" when today has no planned day. Keep the rule simple and test the edge cases: no program, a day name with no letters, a finished workout today.
- `dailyChecklist.ts`, `homeChecklist.tsx`, `dailyChecklistCard.tsx`: the items become Train, Feed the bear and Weigh-in. Weigh-in is due once a week on the goal's weekday, and it counts as done for that week once a weight entry exists for it. If the goal store has no weekday, use the week's first day and say so in the PR body. The weigh-in row gets the subtitle U25 asks for. The checklist's weight item still opens `stats` with `{ tab: "graphs" }`, as batch I set it.

## Files

- `src/components/screenProgressDashboard.tsx`
- new `src/components/screenMyBear.tsx`
- `src/navigation/AppNavigator.tsx`, `src/navigation/AppNavigator.native.tsx`
- `src/components/programHistory.tsx`
- `src/components/homeChecklist.tsx`, `src/components/dailyChecklistCard.tsx`, `src/models/dailyChecklist.ts`
- new `src/models/weekDots.ts`, new `src/models/todayPill.ts`
- tests: new `test/weekDots.test.ts`, new `test/todayPill.test.ts`, `test/dailyChecklist.test.ts`

## Order

Runs now, beside the onboarding batches O1 and O2 and beside R4. It shares no file with them. R2 and R6 edit `AppNavigator` after this batch merges.

## Check on your iPhone list for the PR

- Home shows the bear head, seven dots and "Today" with a pill. No week calendar and no Run button.
- Log a meal today. Today's dot fills.
- Tap the dots. The Food screen opens. Tap the head. My bear opens.
- My bear shows the old Progress content with no calendar strip and no person icon. The gear opens Settings.
- The checklist reads Train, Feed the bear, Weigh-in. Log a weight. Weigh-in stays ticked for the rest of the week.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
