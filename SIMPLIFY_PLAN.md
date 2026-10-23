# Simplify pass: one home per job

Status: S1 to S4 are built and merged. The next pass is T1, the three layers, in The three layers section of `REDESIGN_PLAN.md`.

## The rule

The "+" button creates things. The three tabs show things. A tab may open what it shows, but it never repeats an add button that the "+" already has.

Each tab fits one iPhone screen without scrolling for the common case. Anything rarer moves one tap deeper.

Liftoff has six tabs and an 11-icon profile grid (`docs/research/liftoff-in-app.md`). beBEAR keeps Home, Journal and My bear plus the "+". The goal is fewer rows inside those three tabs.

## What repeats today

Log food has six entry points:

- "+" sheet, Food square (`src/components/plusSheet.tsx`), opens `foodAdd`.
- Journal, the inline AI describe box `FoodDescribePanel` at the top of `JournalMeals` (`src/components/journalMeals.tsx`).
- Journal, the add button on every meal card and the empty-state "Add food" button.
- Home, the "Feed the bear" checklist row (`src/components/homeChecklist.tsx`), opens Journal.
- My bear, the Nutrition row link "Open the food log" (`src/components/screenProgressDashboard.tsx`).
- My bear, the "energy" board tile, opens Journal (`src/models/bearBoard.ts`).

Start a workout has four:

- "+" sheet, Start workout.
- Home, the next-workout card at the top of the history list (`Program_nextHistoryRecord` in `src/components/programHistory.tsx`).
- Home, the "Train" checklist row.
- Journal, the Start button in `WorkoutSection` (`src/components/screenJournal.tsx`).

Log weight has five, and the "+" one goes to the wrong place:

- "+" sheet, Measurement square, opens `bodyScans` (body composition). A user who taps "Measurement" to log weight lands on a printout scanner.
- Home, the "Weigh-in" checklist row, opens `stats`.
- Journal, the "Log weight" button, opens `stats`.
- My bear, the Weight row, opens `stats`.
- My bear, the weight board tile, opens `stats`.

Write a note has two: the "+" Note square and the "+" on the Journal Notes section.

My bear shows the same numbers twice. The board tiles in `BearScene` show workouts this week, weight, per-workout volume and energy. Below them, `ProgressSections` shows a Weight row, a Workout consistency row and `WeekInsights`, which repeat the first two tiles. Then come a Nutrition row, a "Bonus tracking" group (steps, photos) and a "More" group (Reports, Body measurements, Body composition, Workout music).

## Why the tabs scroll

Home renders `HomeHeader`, the 3-row `HomeChecklist`, the expanded next-workout card, then every past workout in a `LegendList`. Home is upstream Liftosaur's history feed with a new header on top.

Journal renders the calendar header, a bear-mark day title, the mindfulness line, check-in, workouts, the describe box, meal cards, the food summary, songs, weigh-in, notes and an Export button. That is 12 blocks for one day.

My bear renders the bear scene, the bear panel, the check-in chart, the goal card, 3 expand rows, `WeekInsights`, 2 bonus cards and 4 link rows. That is 13 blocks.

## Target shape

Home answers "what do I do today":

- The bear head and the week dots, as now.
- Today's workout card with one Start or Resume button.
- The checklist as three compact chips on one row (Train, Feed the bear, Weigh-in), each a tick plus a tap target. The Train chip starts the same workout as the card.
- No history list. Past workouts live in Journal.

Journal answers "what happened on this day":

- The calendar header, collapsed to a week strip by default, as now.
- One list for the day: check-in, workouts, meals, weight, songs, notes. Each is one row or one card.
- Workout cards open the workout record (`progress` screen with the record id), so editing a past workout still works after it leaves Home.
- Meals show the meal cards and the summary bar. The describe box goes. Adding food happens through the "+".
- One "Add to this day" button appears only when the selected day is not today, because the "+" always logs to today.
- The Start button, the bear-mark title, the mindfulness line and the Export button go. Export moves to Settings.

My bear answers "how is my bear doing":

- The bear scene with its board tiles, which are already tappable.
- The bear panel (level, honey).
- The goal card.
- One "All stats" row that opens `reportsHub`. The check-in chart, nutrition, `WeekInsights`, steps, photos, reports, measurements, body composition and music move into that hub.

The "+" sheet stays the only create menu:

- Food, Weight, Note, Friend, then Start workout (and Run when sensors exist).
- "Measurement" becomes "Weight" and opens the weight log. Body composition stays reachable from the weight screen and from All stats.

## Batches

Each batch is its own PR. Logic changes go into the pure modules named here, each with a mocha test, per the "Where logic lives" rule in `CLAUDE.md`.

S1. One way to add. Built. The describe box left Journal and became a third "Describe" mode on the "+" Food camera, because Journal was its only home. The Journal Start button is gone. Per-meal add buttons and an "Add to this day" button show only on past days. The "+" Measurement square is now Weight and opens `stats`. Modules: `src/models/quickActions.ts`, `src/models/journalDay.ts`, `src/models/foodScanSteps.ts`.

S2. Home fits one screen. Built. Home shows the header, the checklist as three chips, today's workout card and a "History · N workouts" link. The full list moved to a `history` screen in the Journal stack (`src/components/screenHistory.tsx`), also opened from Journal's "All workouts" link and My bear's workout row. Journal workout cards open the record. Module: `src/models/homeToday.ts`. `NavModalMonthCalendar` and the `main` `historyRecordId` param had no callers; the scroll-to-record effect moved to the History screen.

S3. My bear fits one screen. Built. My bear shows the bear scene, the bear panel, the goal card and one "All stats" row (plus the program card and restore banner in the offline build). `ScreenReportsHub` is now "All stats": the check-in chart, the weight, nutrition and consistency rows, week insights, steps, photos, then every report and body row. Modules: `ReportsHub_rows` in `src/models/reportsHub.ts`, `ProgressHub_goal` in `src/models/progressHub.ts`.

S4. Journal tidy. Built. The bear mark beside the day title, the mindfulness line and the Export button are gone. The day title stays as plain text. Export is "Export journal" in Settings, under "Export everything". Each empty section is one row: title, a short hint and one action (Check in, All workouts, Add, Log, +). The empty check-in row opens the faces on tap. Module: `JournalDay_emptyRow` and `JournalDay_sectionFold` in `src/models/journalDay.ts`.

## Needs a decision

History off Home: decided. Home keeps a "History" link, and the list lives in Journal.

The Friend square in the "+" is rare compared with food and weight. It can move to My bear, which frees a square for "Run" or "Photo".
