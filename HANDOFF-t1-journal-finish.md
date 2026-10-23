# Codex handoff: T1, the Journal day and the finish screen

Status: handoff ready, nothing built. Reasoning level: medium.

This is part of batch T1, the three layers. The spec is The three layers section of `REDESIGN_PLAN.md` on master. Read that section first. Claude builds the other half of T1 at the same time: the "+" sheet, My bear and the More hub. Your half touches none of their files.

## The rule you build to

- Layer 1 is train, eat and the bear. Layer 3 is everything else, behind "More" on My bear.
- A layer 1 screen shows no layer 3 feature. No tile, no row, no sheet, no badge pop-up, no red dot.
- Layer 3 is hidden, never deleted. Keep the code and the data.
- `src/models/featureLayer.ts` says which layer each feature is in. Read it with `FeatureLayer_isFront` instead of hard-coding a list. It is on this branch already, with `test/featureLayer.test.ts`.

## Branch

- Start from branch `handoff-t1-journal-finish`. It holds this file and `featureLayer.ts`.
- Work on a new branch `codex/t1-journal-finish`. Open the PR against `master`.
- The Claude half lands as its own PR from `claude/v1-core-features-d24b5b`. Both PRs carry the `featureLayer.ts` commit, so they merge in either order.

## Part 1: the Journal day

Today `screenJournal.tsx` renders check-in, workouts, meals, songs, weight and notes. S4 made an empty section show as one row, through `JournalDay_sectionFold` and `JournalDay_emptyRow` in `src/models/journalDay.ts`.

- Workouts, meals and weight stay as they are, empty row included.
- Check-in, songs and notes show only when the day has content for them. An empty one renders nothing, not even the one row.
- Put the rule in `src/models/journalDay.ts`. A section whose feature is not front (`checkIn`, `music`, `notes` in `featureLayer.ts`) and is empty returns a hidden state. `screenJournal.tsx` skips a hidden section and holds no other logic.
- Add cases to `test/journalDay.test.ts`: an empty check-in, songs and notes are hidden, the same sections with content show, and an empty workouts, meals or weight section still shows its one row.

## Part 2: the finish screen

Today `screenFinishDay.tsx` renders `BearFinishBanner`, the story card pager `WorkoutStoryCardSection`, `FeedShareToggle`, totals, exercises, sets per muscle group, `PersonalRecords` and `WorkoutReportCard`.

- Stays as is: the bear banner with the kg added and the level-up card, totals, exercises, sets per muscle group, personal records.
- Honey leaves the bear's line. `BearText_finishLine` in `src/models/bearText.ts` drops its honey part and keeps the kg and the level. `BearFinishBanner` stops reading honey. Honey still counts in the background, so do not touch `src/models/bearHoney.ts`.
- The story card pager becomes one Share button. It shares the first story card with the same share code the pager uses today. The page tabs, the music button on the cards, and Add photo leave the finish screen.
- `FeedShareToggle` shows only when the user has at least one friend. The friend list comes from `src/utils/friendsClient.ts`. Signed out counts as no friends.
- `WorkoutReportCard` leaves the finish screen. The AI report stays reachable from the workout record and from More → Workout reports.
- `FinishDayActions_list` in `src/models/finishDayActions.ts` decides what the finish screen shows. Extend its input with what it needs (has friends, is offline build, export available). It returns the list of blocks. `screenFinishDay.tsx` renders that list and holds no decisions.
- Update `test/finishDayActions.test.ts` and the `BearText_finishLine` cases in the bearText test.

## Files you may touch

- `src/models/journalDay.ts`, `test/journalDay.test.ts`, `src/components/screenJournal.tsx`
- `src/models/finishDayActions.ts`, `test/finishDayActions.test.ts`
- `src/models/bearText.ts` (only `BearText_finishLine`) and its test
- `src/components/screenFinishDay.tsx`, `src/components/bearFinishBanner.tsx`, `src/components/workoutStoryCardSection.tsx`

Do not touch `src/models/quickActions.ts`, `src/components/plusSheet.tsx`, `src/models/bearBoard.ts`, `src/components/screenMyBear.tsx`, `src/components/bearPanel.tsx`, `src/components/bearScene.tsx`, `src/models/reportsHub.ts`, `src/components/screenReportsHub.tsx` or `src/components/screenProgressDashboard.tsx`. The Claude half owns them.

## Rules

- Read `CLAUDE.md` and `AGENTS.md` first. Their prose and comment rules apply to code, tests and the PR body.
- Logic lives in pure modules with mocha tests. `.tsx` files render and run effects only.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- No AI attribution lines in commits.
- Verify with `npx tsc --noEmit`, eslint on changed files, and each changed test file with `npm run onetest -- test/<file>.test.ts`.
- Put `[skip deploy]` in the PR title.
- End the PR body with a "Check on your iPhone" list: an empty rest day in the Journal shows workouts, meals and weight only, a day with a note shows Notes, and a finished workout shows one Share button with no honey line and no report card.
