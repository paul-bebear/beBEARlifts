# The baseline week

Planning pass of 2026-10-27, from the owner's message while `HOUSE_HOME_PLAN.md` (PR 161) was in review. Nothing in this file is built. It follows `BEAR_WORLD_PLAN.md` and `HOUSE_HOME_PLAN.md`. The house plan's section "Parked from the owner's 2026-10-27 message" hands this plan four things. The level retune, the baseline onboarding, the cub number and the bear GIFs.

Read-only findings come from the worktree at master `8bece8d0`. The owner's words are quoted where they decide something.

## 1. What the owner said

- Levels should match how a committed person who lifts or exercises most days and eats well sees results. "As they see progress in themselves, they also see the progress in the game."
- Onboarding is a week that collects the baseline. The owner tells a new user: do not exercise for 3 or 4 days, stretch, rest, eat well, have lots of energy, then a 1-week plan where you "PR everything". The app learns where they are, then builds them up.
- Two user groups. A: 15 to 17 year old skinny kids who see an app to get big that promotes exercise, nutrition and health as an alternative to the peptides and testosterone they see online. B: 18 to 25 year olds who go to the gym, feel stuck at a plateau weight, and want to get bigger. The owner wonders if that is too broad.
- The goal is always to gain weight.
- The baseline week is sunk cost. Use it, with leaderboards and other social data views, to keep users consistent.
- Every new user is a cub and gets a number. The owner is admin, player 0.
- A pool of bear GIFs for the share cards after a workout, like Liftoff's social cards.
- Later the same day, on the house plan: "we can let them choose the pace, we'll develop the goals more individually later but that would be cool that after the baseline we can then break it down into tiny goals that is tailored to each person."

## 2. What the code does today

- `src/models/bearTier.ts` holds 12 levels with male thresholds 0, 5,000, 25,000, 60,000, 120,000, 220,000, 380,000, 600,000, 900,000, 1,400,000, 3,500,000 and 7,000,000 kg. Female thresholds are 60 percent, rounded to 1,000. `BEAR_WORLD_PLAN.md` assumes 6,000 kg a workout and 3 workouts a week.
- `BearGrowth_countedKg` in `src/models/bearGrowth.ts` counts one workout a day of 10 minutes or more. Each set counts weight times reps, capped at 1.3 times the exercise's best weight so far, or 2 times bodyweight for a new exercise. A bodyweight set counts 0.6 times bodyweight a rep. A workout caps at 200 kg a minute and at 25,000 kg.
- `Bear_state` in `src/models/bear.ts` sets energy from the time since the last counted workout. A user with no workout has `elapsedMs` of `Infinity`, so energy is 0 and the bear is tired from the first minute. `celebratedLevel` in `src/models/bearStoreData.ts` keeps the reached level, and `BearTier_progress` takes the maximum of the reached threshold and the counted kg, so a lower threshold table never drops a level.
- Onboarding is `Onboarding_reduce` in `src/models/onboarding.ts`: welcome, place, about, want, then recommend or import, then plan or done, then start. The welcome shows `CloudBackupCard`, and `OnboardingChoices_welcomeLabel` reads "Start" when the user is not signed in, so sign-in is optional. The "about" step asks height, weight, age and sex, and `onboardingQuestions.tsx` asks "What is your weight goal?" under "Food targets (optional)".
- `OnboardingAnswers_goalKind` in `src/models/onboardingAnswers.ts` maps the plan goal "strength" to the program goal `maintain` and everything else to `buildMuscle`. `ProgramGoal_kinds` in `src/models/programGoal.ts` lists `buildMuscle`, `loseFat` and `maintain`, and `GoalWizard_steps` in `src/models/goalWizard.ts` asks for the kind on its "goal" step.
- `BearPlan_text` in `src/models/bearPlan.ts` writes the plan from `BearPlanSlots_table`. Every loaded exercise starts at the pick's `lb`, 95 lb for the barbell squat, and progresses with `lp` or `dp`. Nothing reads the user's strength. `test/bearPlan.test.ts` evaluates every generated plan with `PlannerMode_commitFullText` and `PlannerProgram_evaluateFull`.
- Liftoscript can write a 1RM: `rm1 = calculate1RM(completedWeights[3], completedReps[3])` in a `progress: custom()` block. `Exercise_onerm` reads it from `settings.exerciseData[key].rm1`.
- `PlusOffer_afterFirstProgram` in `src/models/plusOffer.ts` presents the beBEAR+ offer as soon as the user has a program.
- Sign-in is Supabase: email code, Apple and Google, through `src/utils/supabaseClient.ts` and `docs/native-sign-in.md`. The session carries `userId`. There is no counter, no admin flag, and nothing numbers an account.
- `public.profiles` in `supabase/migrations/20261021120000_friends.sql` is created by the user when they pick a handle, so it exists only for users who added a friend. `auth.users` is the one row every account has.
- The door in `src/models/bearHouse.ts` is `{ id: "door", image, label: "Gym", target: { kind: "door" } }` with no overlay. The scale draws its number through `overlay: { kind: "number", share, text }`, which is the mechanism the door plate reuses.
- The share cards in `src/components/shareCards/` export a still through `useShareCardExport.ts` and `src/utils/shareCardImage.ts`. No animation path exists.
- Check-ins exist: `Notes_checkInScales` in `src/models/notes.ts` scores energy, soreness and mood with five faces. Progress photos exist in `src/models/progressPhotos.ts`. Tape measurements exist in `stats.length` for neck, shoulders, biceps, chest, waist and more.

## 3. Two users, one product

The two groups are one audience with two ages. Both are skinny, both want size, both get the same plan slots, the same gain-only food model and the same bear. The product forks in two places only, and both exist already. `youth` in `IBearPlanParams` picks the `mainYouth` template with 6 to 8 reps. `OnboardingAnswers_isYouth` reads the age.

The marketing forks more. Reels for the 15 to 17 group speak against peptides and testosterone. Reels for the 18 to 25 group speak to the plateau. That split lives in `docs/marketing`, never in the app.

So the answer to "too broad" is no. The audience is narrow on the axis that shapes the product, skinny and wanting size, and wide only on age. The risk sits elsewhere: a health app for 15 year olds must never read as medical advice. The copy says eat, sleep, lift, and names no supplement. The under-18 rule in the baseline, below, is the one place the age changes a number.

## 4. The level retune

The current table assumes 6,000 kg a workout from day one. A 55 kg beginner with light dumbbells does 3,000 to 4,000 kg in a first workout. Teen at 5,000 kg does not land on workout one, so the owner's "progress in the game" starts a workout late. At the other end, a committed user reaches Astronaut in 14 months and then waits 13 months for Lunar.

The model behind the new table, stated so it can be argued with.

- A committed user trains 4 counted workouts a week. "Most days" in the owner's words is 4 to 5, and the plans are 3, 4 or 5 days.
- Counted kg a workout grows with strength: 3,000 kg in week 1, rising in a straight line to 9,000 kg at week 52, then flat. The 200 kg a minute cap in `bearGrowth.ts` holds a 45 minute day at 9,000 kg, so the flat part is the cap, which is why the per-workout number stops growing there.
- What a skinny beginner who eats well sees, from the strength and bodyweight research on untrained men: week 3 the first strength jump, from the nervous system learning the lifts; week 6 the first change in the mirror; month 3 friends notice and the scale shows about 3 kg; month 6 a shirt size and about 6 kg; year 1 the beginner year is done at 8 to 12 kg; year 2 adds about half of that; year 3 about a quarter. Women gain about half the mass at the same pace, which the 60 percent share already covers.

Each level lands where a real change lands. The level-up card says so: `BearText_levelUp` gains a second line per level, "Six weeks in. This is when the mirror starts to agree."

```text
level  name        male kg     female kg  lands at             what the user sees
 1     Cub                 0           0  day 0                nothing yet
 2     Teen            2,000       1,000  first workout        the first pump
 3     Amateur        12,000       7,000  end of the baseline  own numbers for every lift
 4     Rookie         36,000      22,000  week 3               the bar feels lighter
 5     Regular        80,000      48,000  week 6               the mirror starts to agree
 6     Strong        175,000     105,000  month 3              friends notice, +3 kg
 7     Athlete       460,000     276,000  month 6              a shirt size, +6 kg
 8     Power         820,000     492,000  month 9              most lifts doubled
 9     Titan       1,250,000     750,000  year 1               the beginner year done, +8 to 12 kg
10     Astronaut   3,100,000   1,860,000  year 2               half as much again
11     Lunar       5,000,000   3,000,000  year 3               a lifter, not a beginner
12     Mars        7,000,000   4,200,000  year 4               unchanged from today
```

What changes against today, old to new, in kg.

- Teen 5,000 to 2,000. Amateur 25,000 to 12,000. Rookie 60,000 to 36,000. Regular 120,000 to 80,000. These four arrive sooner.
- Strong 220,000 to 175,000, a little sooner.
- Athlete 380,000 to 460,000. Power 600,000 to 820,000. Titan 900,000 to 1,250,000. Astronaut 1,400,000 to 3,100,000. Lunar 3,500,000 to 5,000,000. These five arrive later.
- Mars stays at 7,000,000.

 The female column keeps `femaleShare` at 0.6 and `femaleStepKg` at 1,000, so Teen rounds to 1,000.

Nothing drops. `celebratedLevel` protects every existing bear, and the comparisons in `src/models/bearComparison.ts` read the threshold, so they follow the table without a change. `BEAR_WORLD_PLAN.md` keeps its pace line and gains one sentence pointing here. The memory file `bear-game-rules.md` in the project memory folder gets the new table.

## 5. The baseline, day by day

Ten days: a rest phase of 1 to 3 days, then a test week of 7 days with 4 test sessions. The schedule lives in `src/models/baselineWeek.ts` as a state machine with phases `rest`, `test` and `done`. The whiteboard's first line during the baseline reads "Baseline · day 4 of 10". A tap on it opens a sheet with the day's one-line reason.

Day 0, the install.

- Welcome. The bear, "Meet your bear", and sign-in: Apple, Google, email code. After sign-in the app reads the cub number and shows "You are Cub 412." The sign-in rule is an open question.
- Place, unchanged: full gym, only dumbbells, street workout, no equipment.
- About: height, weight, age, sex. Weight becomes required, because the baseline compares it on day 10. The "What is your weight goal?" question goes. The food goal is gain for everyone.
- Want, unchanged: size, strength or both, days a week, more agile. The app picks the plan as today, through `BearPlan_recommend`, and keeps it as `pendingPlan` in the baseline state instead of installing it.
- A new step, "First, your baseline". Three lines: "Rest 3 days. Eat well, stretch, sleep." "Then 4 test days where you set your first records." "Then your plan starts from your real numbers." Under it one question, "When did you last train hard?", with Today or yesterday, 2 or 3 days ago, Longer. The answers give 3, 2 and 1 rest days. The button reads "Start my baseline".
- The app installs the baseline program from `BaselineProgram_text`, records `startedDay` and `restDays`, and sets the food targets from `OnboardingAnswers_foodTargets` with goal gain.

The rest days, 1 to 3. The app asks for four things and records each one.

- Weigh in, day 1 only, in the morning. The scale on the house. Recorded in `stats.weight` as the first weight, and the goal's `startWeight`.
- Eat. The bowl's pill shows the kcal left. Recorded in the food log as today.
- Stretch, 10 minutes. The program's rest-day entry is the `mobility` template with the three mobility slots, `hipOpener`, `thoracic` and `hamstringReach`, about 8 minutes. It counts 0 kg, so the bear does not grow, and it counts as an active day for the house ladder when H2 lands.
- Check in. Energy, soreness and mood, the five faces from `Notes_checkInScales`. Recorded as a `checkIn` note on the day.
- Day 1 also offers, and never requires, a front photo through `progressPhotos.ts` and tape for the arms, chest and waist through the Measurements screen. The baseline card on day 10 shows them as the day-0 picture.
- The bear rests. `Bear_state` takes `restUntil` from the baseline state and holds energy at 100 through the rest phase, so the bear is never tired before its first workout.

The test days. Each test session lists the compound lifts of the user's pending plan, mapped to the user's place through `BearPlanSlots_pick`, split into four days. For a 3-day plan that is 12 lifts, 3 a day. For a 5-day plan it is up to 16, 4 a day. Isolation lifts are never tested and keep the table's start weight.

- Day 4, Test · Lower A: the squat slot, the RDL slot, the second squat slot, the calf slot.
- Day 5, Test · Upper A: horizontal push, horizontal pull, vertical push, vertical pull.
- Day 6, rest: eat, stretch, check in.
- Day 7, Test · Lower B: the hinge slot, the lunge slot, the glute slot, the leg curl slot where the plan has it.
- Day 8, Test · Upper B: incline push, cable row, the curl slot, the triceps slot.
- Day 9, rest: eat, stretch, check in.
- Day 10, the second weigh-in and the baseline card. The regular plan starts on day 11.

What one test looks like in Liftoscript, written by `BaselineProgram_text`.

```text
Squat / 1x5 65lb, 1x5 95lb, 1x5+ 110lb / progress: custom() {~
  rm1 = calculate1RM(completedWeights[3], completedReps[3])
~}
```

- Three work-up sets. Set 1 at 0.7 times the pick's `lb`, set 2 at the pick's `lb`, set 3 at 1.15 times, rounded with `Weight_round`. The user changes the top set's weight on the workout screen as today, and the set is an AMRAP, "5+".
- The top set's coaching line, shown as the exercise note: "Stop with 2 reps left in you. Never grind."
- Under 18: the top set is "8+" and the first two sets are 8 reps. A 15 year old never tests a set of 5. This is the one place age changes a number.
- Bodyweight picks: one set, "1x1+", as many reps as possible. There is no `rm1` for a push-up; the result keeps the reps.
- The `rm1` line writes the Epley estimate into `settings.exerciseData[key].rm1`, so the exercise stats screen and any `%` weight read it from day 11.

What the app records each test day.

- The completed sets, as in every workout.
- The counted kg. Teen lands on day 4 and Amateur on day 10, at about 12,000 kg.
- The day's check-in.

A missed test day shifts the schedule. The next session is the next untested day. The baseline ends when all four sessions are done, or on day 13, whichever is first. An untested lift starts at the table's default on day 11.

Day 10, the baseline card. `BaselineResult_from` reads the history, the stats, the food log and the notes between `startedDay` and today, and returns the card.

- One row per tested lift: "Squat · 110 lb × 7 · est. 1RM 135 lb". Bodyweight rows read "Push-ups · 14".
- Weight: "61.0 kg → 61.4 kg". The two weigh-ins. One missing weigh-in shows one number.
- Food: the average kcal and protein a day over the ten days, against the target.
- Check-ins: the average energy, soreness and mood.
- The photo and the tape, when taken.
- A share card, "Cub 412 · baseline done · 12 lifts measured", with the bear at Amateur. Whether the card offers to share by itself is an open question.
- One button, "Start my plan". `BaselineResult_startLb` turns the estimates into start weights and `BearPlan_text` takes them, below. The beBEAR+ offer shows after this card and never before, because `PlusOffer_afterFirstProgram` reads `hasProgram` as false while the baseline runs.

## 6. From the baseline to the plan

`BaselineResult_startLb(result, params)` gives `BearPlan_text` a start weight per tested lift, in place of the table's `lb`.

- `main`, 2x5 and 1x5+ with `lp`: 80 percent of the estimated 1RM. A 5 is near 87 percent, so `lp` has 4 to 6 weeks of room before the first stall.
- `mainYouth`, 3x6 with `dp` 6 to 8: 72 percent.
- `build`, 3x8 with `dp` 8 to 12: 65 percent, the low end of the rep range, so the first weeks add reps before weight.
- `iso`: the table's `lb`, untested.
- `bw`: 60 percent of the tested reps, rounded down, at least 3, written as the pick's `sets`, so a user who did 14 push-ups starts at 3x8.
- Every weight is rounded with `Weight_round` to the equipment's step in the user's unit.

`BearPlan_text(params, starts?)` gains the optional second argument. `exerciseLines` reads `starts[pick.name]` before `pick.lb`, and a bodyweight start replaces `pick.sets`. The golden files in `test/fixtures/bearPlan/` do not change, because they call with no starts. `test/bearPlan.test.ts` gains one case with starts and evaluates it like the others.

The regular plan also carries the user's `rm1` values, written by the tests, so a later program with `%` weights reads real numbers.

## 7. The goal is gain

The owner's rule: the goal is always to gain weight. The food model keeps all three kinds, because `FoodTargets_fromCalories` and the pace maths are sound for all three, and old data must stay readable. The screens show one.

- `ProgramGoal_kinds` keeps the three entries for parsing and labels. A new `ProgramGoal_offeredKinds` returns `buildMuscle` alone, and the goal wizard's "goal" step leaves `GoalWizard_steps`. The wizard opens on activity, then body fat, then the pace. `GoalWizard_start` sets `kind` to `buildMuscle` when there is no current goal. The whiteboard's goal lines open it in pace mode only, as `HOUSE_HOME_PLAN.md` decided.
- `OnboardingAnswers_goalKind` returns `buildMuscle` for every plan goal. A user who picks "Strength" still gets the heavy template; only the food side changes, and it was already gain in `OnboardingAnswers_body`.
- `onboardingQuestions.tsx` and `.native.tsx` lose the "What is your weight goal?" fieldset. `foodGoal` in `IOnboardingAnswers` stays in the type for one release and is always `gain`.
- An existing goal of kind `loseFat` or `maintain` stays as it is. The whiteboard shows it until the user taps the goal line and the wizard saves a `buildMuscle` goal. The owner decides whether the app changes them on its own in the open questions.
- The program goal's `pace` keeps its three options, slow at 0.1, moderate at 0.25 and fast at 0.5 percent of bodyweight a week. `ProgramGoal_recommend` keeps its body-fat rule, which sends a user above 25 percent body fat to slow and shows its note.

## 8. The sunk cost and the social views

Ten days of the user's own numbers are the hook. Every view that shows a gain names the baseline as its zero.

- The baseline card never disappears. The notebook's Journal gains a "Day 0" entry at `startedDay` that opens the card, and `BaselineResult_from` recomputes the deltas from today's history: "Squat 110 → 135 lb, +25 since your baseline." The bear panel shows the same two lines for the best-moving lift.
- The whiteboard's goal lines already read "since October 27 at 61 kg". `startedAt` and `startWeight` come from the baseline's first weigh-in, so the house says the day-0 weight for as long as the goal stands.
- The share card at the end of the baseline is the first social moment, and the cub number is on it.
- The leaderboard is batch L2 in `BEAR_WORLD_PLAN.md`, by lifetime kg, friends first, opt-in. It needs `counted_days` from U2. This plan adds nothing to it except the cub number on each row.
- The cohort board. The cub number gives a cohort for nothing: "Cubs 400 to 420 · 14 of 21 trained this week". No name, no rank, one count. It is a security definer function `cohort_active(p_from bigint, p_to bigint)` over `workout_posts` in the week, returning two integers, and a line under the TV. It comes after U2 so it can read `counted_days` instead of posts, and it sits in the follow-up list.
- The percentile line from the Liftoff teardown, "Top 28 percent of cubs this week by workouts", reads the same `counted_days` and sits in the same follow-up.

Tiny goals after the baseline. The owner wants the one goal, gain weight, broken into small goals tailored to each person once the baseline is in. The pace stays the user's choice, as `HOUSE_HOME_PLAN.md` decided: the whiteboard's goal lines open the goal wizard in pace mode only. The tiny goals come after, and the owner said "later", so they are a follow-up with the shape fixed here.

- The source is the baseline card. Every tiny goal is a number the baseline measured plus a step the plan can deliver in 2 to 4 weeks.
- Four kinds. A lift: "Squat 110 → 120 lb by November 24", the `lp` or `dp` step times the planned sessions. Bodyweight: "61.0 → 61.5 kg by November 10", from the pace's weekly percent. Food: "Protein on target 5 days this week". Showing up: "4 workouts this week", from the plan's days.
- At most three at a time, one of them always a lift. A done goal is replaced by the next step the same day, so the list never empties.
- `src/models/tinyGoals.ts` owns it: `TinyGoals_from(result, goal, params, today)` builds the first three, `TinyGoals_progress(goals, history, stats, foodLog, today)` scores them, `TinyGoals_next(goals, progress, today)` replaces a done or expired one. `test/tinyGoals.test.ts` covers a gym week, a bodyweight-only week, a missed week and the replacement rule.
- Where they show: a "Goals" section at the top of the bear panel, which the bed opens, and the share card when one is done. The whiteboard keeps its eight lines.
- About 10 hours on Opus, after piece S, because it reads `BaselineResult_from`.

## 9. The cub number

Every account gets a number in sign-up order. The owner's account is 0. Numbers are never reused.

The server.

- Migration `supabase/migrations/20261028000000_cubs.sql`. A sequence `public.cub_numbers` starting at 1. A table `public.cubs (user_id uuid primary key references auth.users (id) on delete cascade, number bigint not null unique, created_at timestamptz not null default now())`.
- A trigger function `public.assign_cub()`, security definer with `search_path` empty, `after insert on auth.users for each row`, inserts the row with `nextval('public.cub_numbers')`. A trigger on `auth.users` is the Supabase pattern for a per-account row, and it runs for Apple, Google and email sign-ups alike.
- The backfill in the same migration: the owner's account gets 0 by its `auth.users` id, then every other existing account gets the next number in `created_at` order. The owner's id is an open question, answered by the account's email.
- Row-level security: `select` for the row's own user, and for a user in an accepted friendship with the row's user, the same predicate `workout_posts` uses. No `insert`, `update` or `delete` grant for `authenticated`. A deleted account cascades its row away and its number stays spent.
- `supabase/tests/cubs.sql` inserts three `auth.users` rows and asserts numbers 1, 2 and 3, deletes the second and inserts a fourth and asserts 4, and asserts that an `insert` into `public.cubs` as `authenticated` is rejected.
- No Vercel route. The app reads `GET /rest/v1/cubs?select=number` with the session token through `SupabaseClient_call`, and RLS returns the one row.

The phone.

- `src/models/cubNumber.ts`: `CubNumber_parse(raw)` guards the store, `CubNumber_label(number)` returns "Cub 412" and "Cub 0", `CubNumber_plate(number, signedIn)` returns "412", or "?" when there is no number yet, and `CubNumber_needsFetch(state, session, now)` says when to ask the server again: a new user id, or no number after 24 hours.
- `src/utils/cubStore.ts` is `JsonStore_create("bebear_cub", CubNumber_parse, CubNumber_empty)` holding `userId`, `number` and `fetchedAt`. `src/utils/cubClient.ts` fetches after sign-in and when the home mounts with `CubNumber_needsFetch` true. `src/models/fullBackup.ts` includes the store.
- Where it shows. The door plate: `bearHouse.ts` gives the door `overlay: { kind: "number", share: doorPlate, text }`, drawn over the door art like the scale's number, with the plate rect measured on the door and kept clear in the arrange tool. The bear panel header: "Cub 412 · Paul's bear". Every share card's footer in `cardParts.tsx`: "Cub 412". The baseline card. The friends list and the TV rows: a friend's number from the `cubs` read under the friends policy, carried in the post summary as `cub` in version 4 of `workoutPost.ts`, so an old post reads with no number. Leaderboard rows when L2 lands.
- Cub 0 shows as "Cub 0" and nothing else in this plan. Admin tools for the owner are SQL in the Supabase dashboard today, as `pro_codes` already is, and an in-app admin screen is a later plan.

Sign-in. The number needs an account, so the welcome puts sign-in first, with the number as the reason: "Sign in to get your cub number." Whether a "Not now" link stays is an open question. With the link, the plate reads "?" and a tap on it opens sign-in; the baseline runs the same either way, and the trigger numbers the account whenever it is created.

## 10. Modules and tests

Every rule below lives in a pure module with a mocha test, per the "Where logic lives" rule in `CLAUDE.md`. A `.tsx` file renders and runs effects.

- `src/models/bearTier.ts`: the thresholds. `test/bearTier.test.ts`, with the two threshold arrays rewritten.
- `src/models/bearText.ts`: `BearText_levelUp` gains the milestone line per level. `test/bearText.test.ts`.
- New `src/models/baselineWeek.ts`: the state and its parser, `BaselineWeek_start(answer, today, pendingPlan)`, `BaselineWeek_phase(state, today)`, `BaselineWeek_day(state, today)`, `BaselineWeek_restDays(lastTrained)`, `BaselineWeek_nextTest(state, history)`, `BaselineWeek_isDone(state, history, today)`, `BaselineWeek_boardLine(state, today)`, `BaselineWeek_restUntil(state)`. New `test/baselineWeek.test.ts` covers the three rest lengths, a missed test day, the day-13 cap, and the board line on every day.
- New `src/models/baselineProgram.ts`: `BaselineProgram_days(params)` splits the pending plan's compound picks into the four test days, `BaselineProgram_text(params, settings)` writes the program with the work-up sets, the `rm1` block, the under-18 reps, the bodyweight max-rep set and the stretch days. New `test/baselineProgram.test.ts` evaluates every place and days combination with `PlannerMode_commitFullText` and `PlannerProgram_evaluateFull`, the way `test/bearPlan.test.ts` does, and checks that every compound of the pending plan appears once.
- New `src/models/baselineResult.ts`: `BaselineResult_from(input)` with the rows, the two weights, the food and check-in averages, `BaselineResult_startLb(result, params)`, `BaselineResult_deltas(result, history)` for the Journal entry, `BaselineResult_shareText(result, cub)`. New `test/baselineResult.test.ts` covers a full week, a week with one missed test, a bodyweight-only week, and the rounding of every template's start.
- `src/models/bearPlan.ts`: `BearPlan_text(params, starts?)`. `test/bearPlan.test.ts` gains the starts case.
- `src/models/bear.ts`: `restUntil` in `IBearSources` holds energy at 100. `test/bear.test.ts`.
- `src/models/bearBoard.ts`: the baseline line first, target `baseline`. `test/bearBoard.test.ts`.
- `src/models/plusOffer.ts`: `PlusOffer_afterFirstProgram` takes `baselineRunning` and returns false while it is true. `test/plusOffer.test.ts`.
- `src/models/onboarding.ts`: the step `baseline` with the last-trained answer, `done` renamed to the card, `pendingPlan` in the result. `test/onboarding.test.ts`.
- `src/models/onboardingAnswers.ts`: `goalKind` always `buildMuscle`, weight required, `foodGoal` fixed to gain, `lastTrained` in the answers. `test/onboardingAnswers.test.ts`.
- `src/models/programGoal.ts` and `src/models/goalWizard.ts`: `ProgramGoal_offeredKinds`, no "goal" step. `test/programGoal.test.ts`, `test/goalWizard.test.ts`.
- New `src/models/cubNumber.ts`: parse, label, plate, `needsFetch`. New `test/cubNumber.test.ts`.
- `src/models/bearHouse.ts`: the door plate overlay. `test/bearHouse.test.ts`.
- `src/models/workoutPost.ts`: `cub` in summary version 4. `test/workoutPost.test.ts`.
- `src/models/fullBackup.ts`: the baseline and cub stores. `test/fullBackup.test.ts`.
- `src/models/journalDay.ts`: the Day 0 entry. `test/journalDay.test.ts`.
- `supabase/migrations/20261028000000_cubs.sql` with `supabase/tests/cubs.sql`.

## 11. Build split

Four pieces of code. Each is one branch and one PR titled with `[skip deploy]`, not merged by the session. No session runs the simulator or the browser. Each PR body gives the owner a phone checklist. Models follow the owner's rule: Opus for design calls, Sonnet for a fully specified batch, never Fable.

Piece L, the level retune. Sonnet. 3 hours, 2 if the plan-document edits are skipped. First, and beside everything. The brief is `HANDOFF-baseline-levels.md`.

- Modules: `src/models/bearTier.ts` (the eleven new numbers) and `test/bearTier.test.ts`. `src/models/bearText.ts` (`BearText_levelUp` milestone lines) and `test/bearText.test.ts`.
- Documents: one sentence in `BEAR_WORLD_PLAN.md` under its pace line pointing here. The memory file is the owner's, so the session leaves it and says so in the PR body.
- No view changes. `test/bearComparison.test.ts` may need its expected names moved, because the comparisons read the thresholds.

Piece W, the baseline rules and program. Opus. 14 hours. The brief is `HANDOFF-baseline-week.md`.

- Hours: the state machine 4, the program and its evaluation test 4, the result and the start weights 4, the bear's rest and the offer gate 2.
- Order: after piece L merges, so the Amateur assertion at the end of the baseline tests against the new number. After `HOUSE_HOME_PLAN.md` piece B merges, because both change `bearBoard.ts`.

- Modules, all new with tests: `src/models/baselineWeek.ts`, `src/models/baselineProgram.ts`, `src/models/baselineResult.ts`.
- Modules changed with tests: `src/models/bearPlan.ts`, `src/models/bear.ts`, `src/models/bearBoard.ts`, `src/models/plusOffer.ts`, `src/models/fullBackup.ts`, `src/models/journalDay.ts`.
- Store: new `src/utils/baselineStore.ts`.
- Design calls: the rounding of the work-up sets, the coaching line, how a missed day shifts the schedule, what the card shows when a weigh-in is missing.
- No view changes beyond wiring `restUntil` and `baselineRunning` where `Bear_state` and `PlusOffer_afterFirstProgram` are called.

Piece S, the baseline screens and the goal wizard. Sonnet. 12 hours. The onboarding steps 4, the board line and its sheet 3, the baseline card and its share card 3, the goal wizard trim 2. After piece W merges. The brief is `HANDOFF-baseline-screens.md`.

- Modules changed with tests: `src/models/onboarding.ts`, `src/models/onboardingAnswers.ts`, `src/models/onboardingChoices.ts`, `src/models/programGoal.ts`, `src/models/goalWizard.ts`.
- Views: `src/components/onboardingChat.tsx` and `.native.tsx` (the baseline step, the card step), `src/components/onboardingQuestions.tsx` and `.native.tsx` (weight required, no weight-goal fieldset, the last-trained question), new `src/components/baselineSheet.tsx` (the day's line, opened from the board), new `src/components/baselineCard.tsx` (the day-10 card, also opened from the Journal's Day 0), new `src/components/shareCards/baselineCard.tsx` (the share card), `src/components/screenHome.tsx` (the `baseline` board target opens the sheet), `src/components/goalWizardSteps.tsx` and `src/components/screenGoalWizard.tsx` (no goal step), `src/components/screenJournal.tsx` (the Day 0 entry).
- The web first run and the native first run both change, because `onboardingChat.tsx` and `.native.tsx` are separate files.

Piece C, the cub number. Opus. 10 hours. The brief is `HANDOFF-baseline-cub.md`.

- Hours: the migration and its SQL test 3, the store and the client 2, the plate, the panel and the share footer 3, the welcome 2.
- Order: after `HOUSE_HOME_PLAN.md` piece C merges, because both change `bearHouse.ts` and `bearHouseScene.tsx`. Beside piece W.

- Server: `supabase/migrations/20261028000000_cubs.sql`, `supabase/tests/cubs.sql`.
- Modules with tests: new `src/models/cubNumber.ts`, `src/models/bearHouse.ts`, `src/models/workoutPost.ts`, `src/models/fullBackup.ts`, `src/models/onboardingChoices.ts` (the welcome label).
- Utils: new `src/utils/cubStore.ts`, new `src/utils/cubClient.ts`, `src/utils/supabaseClient.ts` only if a helper is missing.
- Views: `src/components/onboardingWelcome.tsx` and `.native.tsx` (sign-in first), `src/components/bearHouseScene.tsx` (the plate reads the overlay as the scale does), `src/components/bearPanelSheet.tsx` (the header), `src/components/shareCards/cardParts.tsx` (the footer), `src/components/screenFriends.tsx` and `src/components/bearTv.tsx` (a friend's number).
- Design calls: the plate's place and type on the door art, the welcome's layout with three sign-in buttons and the number as the reason.

Order: L now. W and C after their house dependencies merge, beside each other. S after W. Total 39 hours of code.

## 12. Follow-ups

Not in the build split. Each names where it lands.

- The bear GIFs for the share cards. A Codex art handoff plus a build batch, after the house. The art: one 24-frame loop at 12 frames a second of the pumped pose, for the four sizes small, medium, big and space, on the male and female lines, brown fur, 8 loops in all, each a PNG sequence at 1024 by 1536 with a transparent background and a `check-<size>.png` contact sheet, the character identical to `images/bear/male/pumped-big.png` and its siblings. Codex runs on Sol, never Astra. The prompt sketch: "Animate this exact bear. A short flex-and-breathe loop, 24 frames, the camera and the floor fixed, the first frame equal to the still so the loop can start from the card. Deliver the frames and a contact sheet." The build: `src/models/shareCardMotion.ts` picks the loop by size and line and gives the frame list, `test/shareCardMotion.test.ts`, a sprite sheet per loop under `images/bear/motion/` converted to webp, the card's bear slot plays the sheet in the pager, and the export writes a GIF through a JS encoder on web and through ImageIO's `CGImageDestination` with the GIF type in a small native module on iOS, with the still as the fallback. About 14 hours of code once the art is on disk. Black and polar fur and the other moods wait for the first loops to be seen.
- Tiny goals, as shaped in "The sunk cost and the social views". `src/models/tinyGoals.ts` and its test, the bear panel section, the share card. About 10 hours on Opus, after piece S.
- The cohort board and the percentile line, after U2 lands `counted_days`. One function, one line under the TV, about 5 hours.
- The leaderboard L2 gains the cub number on each row. One line in its brief when it is written.
- The age rating and the under-18 copy. A pass over every line a 15 year old reads, against App Store age ratings and the no-supplement rule. Half a day, in the App Store checklist in `docs/appstore-checklist.md`.
- An admin screen for Cub 0, when the owner needs something the dashboard SQL does not give.
- A Welcome Quest, five ticks and a reward, from the Liftoff teardown. It overlaps the baseline's rest days and is decided after the baseline ships.

## 13. Open questions

One decision each. The owner's own words already answer the ten-day shape, the gain-only goal and the number plate on the door.

- The rest length. Fixed at 3 days for everyone, or the "When did you last train hard?" question that gives 1 to 3 days? The plan writes the question.
- Sign-in. Required before the baseline starts, or with a "Not now" link and a "?" on the plate until the user signs in? The plan writes the link, because an account that is forced on the first screen is a review risk under App Store guideline 5.1.1 and the offline-only build has no server.
- Cub 0. Which account is the owner's, by email, so the migration sets its number to 0?
- Old goals. Leave `loseFat` and `maintain` goals as they are until the user changes them, or switch them to `buildMuscle` on the next app start?
- The under-18 rule. Top sets of 8 or more for users under 18, never 5. Yes or no?
- The test week. Four test sessions for every user, including the 3-day plan, or three sessions for the 3-day plan?
- The share card. On day 10, open the share sheet by itself, or show the card with a share button and leave the tap to the user?
- The thresholds. Accept the table in the retune, or move Mars from year 4?
- The audience. One product, two ages, the fork in marketing only. Agree?

Next action: answer the nine questions in the session. The build cards for pieces L, W, S and C follow the answers.
