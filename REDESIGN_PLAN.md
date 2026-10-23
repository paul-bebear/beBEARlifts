# beBEARlifts redesign plan

Written 2026-10-22 on branch `share-cards-bear`, against master at a5153e38 plus the uncommitted share-card and bear-tier files on this branch (`src/models/bearTier.ts`, `src/models/bearBadges.ts`, `src/models/shareAchievements.ts`, `src/components/shareCards/`). The plan builds on those files, so they land before any batch below. It also assumes review batch J (invite, onboarding, friends) has merged.

Inputs: the 41 photos in `/Users/paulbebear/Downloads/photos inspo/`, the owner's notes and the 2026-10-22 addendum in `HANDOFF-redesign-plan.md`, `REVIEW-2026-10.md` (finding codes U1 to U34, P1 to P10, S1 to S14), and `CLAUDE.md`. Finding codes below point at the review. Hours are for one builder who knows the code, tests run one file at a time with `npm run onetest`.

No photo shows a bear. The bear reference is the app icon from commit 912a642d and its vector copy in `src/components/shareCards/bearMark.tsx`: round ears, a flat muzzle mask, two colours.

The owner's addendum makes onboarding the first batch. The old first run asks twelve fields over three screens and then shows a list of sixty programs. The new one asks four things, recommends three plans, and never shows the list.

The owner's sketch of 2026-10-22 (`IMG_4307.HEIC`) and answers set the tabs as Home, Journal and My bear, with the "+" at the right, put the friends feed behind a TV in the My bear tab, and fold Progress into My bear. The decided answers are listed at the top of Decisions for the owner.

## 1. Product frame

- Who: lifters aged 16 to 23, skinny, who want muscle and weight the healthy way. No steroid look.
- What they pick: Size (hypertrophy), Strength, or both, with an optional "more agile". The plan follows the goal, and users under 18 get a gentler plan.
- Where they train: Full gym, Only dumbbells, Street workout bars, or No equipment, one or more. The app works out the equipment from that. Nobody ticks a plate.
- The bear: a pet that is a cute version of the user. Training grows it. Logging food feeds it. Skipped sessions make it lazy. A bigger bear is hungrier, so the user feeds it more. Every gym day earns honey, and honey buys the bear accessories.
- The bear has a TV. The TV is the friends feed: what friends lift, eat and listen to.
- The app, in one line: open it, see your bear, train or feed it, close it. Everything else is one tap away behind the "+" button, in the Journal, or on the bear's page.
- The Journal is the day's log: workout, meals and macros, songs, weigh-in, notes, and a daily mindfulness line. Many notes a day, all in the Journal, exported as Markdown.
- Test of every screen: a grandmother can use it. One main action per screen, buttons with words, no dead ends.
- Removed or hidden by this redesign: the "Choose your program" list and the "Skip, I'll pick myself" link for new users, the equipment tick list, the minutes-per-session question, the Workout tab button and the Food tab button, the month calendar on Progress, the person icon on Progress, the Run button on Home, the daily "Log your weight" row (weekly now), the finish screen's second share block, Copy link, Continue, "Review this workout's songs", "Play cooldown", the Create Program Day button, every upstream tour and tip card, the "I'm Committed" button, every dinosaur image, the rebranded upstream changelog, and the Music debug row (batch D).
- Kept as is: the workout screen's set logging, the program editor, Settings, Graphs, Measurements, Body composition, Runs, Reports, Music, Steps, Progress photos, and the sixty upstream built-in programs behind Settings → Program.

## 2. Information architecture

### Tabs and the "+"

Three tabs in a floating glass pill plus a round "+" button to its right, as in the owner's sketch and in `541d6c99-3a7c-4168-900f-0b5098185e2a.JPG` (ClearDays) and `6a3427d8-ea09-46c5-b2da-75f309272d4e.JPG` (Cal AI).

- Home, house icon: the bear's head and seven day dots in the header, "Today" with the day's workout pill ("Legs!"), the next workout, the fed-today line, history.
- Journal, book icon: one day at a time, with the week strip and month calendar. Workout, meals and macros, songs, weigh-in, notes, mindfulness.
- My bear, the beBEAR logo as the icon, titled with the bear's name, which is the handle: the bear large, its mood and stats, its TV (the feed), badges, accessories, then everything Progress held: program, goal, weight, nutrition, consistency, and the More list.
- "+": opens a sheet as in the sketch: four squares and one wide bar, over a dimmed backdrop.

The three tabs keep their old `ITab` keys so no `Thunk_pushScreen` call changes: Home is `home`, Journal is `food`, My bear is `graphs`. The `friends` and `workout` tabs stay registered with no button.

The "+" sheet. Four squares in two rows, then the wide Workout bar at the bottom where the thumb rests. The list comes from a pure function `QuickActions_list` in a new `src/models/quickActions.ts`, so the labels and the hidden items are testable.

- Food. Opens the camera with a Barcode and AI scan toggle, then the serving size and description step (see Food below). Without AI consent the toggle shows Barcode and Describe.
- Measurement. Opens `stats` on the My bear stack with `{ tab: "graphs" }` (U2 rule), weight first.
- Friend. Opens the Add a friend sheet: a handle field, Find, and "Share my invite link" (U17).
- Note. Opens a new note in the Journal, the user's second brain: Markdown notes, private, as many a day as they like, with a knowledge-graph view later. Nothing from the Journal goes to the TV unless its own switch is on.
- Workout, the wide bar. Reads "Start workout" or "Resume workout" when `navCommon.isOngoingProgress` is true. Dispatches `Thunk_startProgramDay` or opens `nextWorkoutModal`, the same two branches `Footer2View` runs today.
- Log a run sits inside the Workout bar as a small second button, and only when `RunSensors_isAvailable()` is true.

Where every existing screen ends up.

- Food: the Food day screen (`screenFood.tsx`) becomes the meals part of the Journal day, on the same `food` stack, so every `Thunk_pushScreen("food", undefined, { tab: "food" })` lands in the Journal. The "+" Food scan returns to the Journal day.
- Workout: the `workout` tab entry stays in `ITab` with no button. Start lives on the Home next-workout card and in the "+" sheet's wide bar. The finished workout shows in the Journal day as a card.
- Music: the day's kept songs show in the Journal day; the Music screen stays under My bear → More → Workout music; the music icon stays on the finish screen.
- Runs: the small Run button inside the "+" Workout bar, and My bear → More → Runs. A run shows in the Journal day. The Run button leaves the Home header.
- Body scans: My bear → More → Body composition, unchanged.
- Reports: My bear → More → Workout reports, unchanged. The report card stays on the finish screen.
- Progress dashboard: its content (program card, goal card, weight, nutrition, consistency, bonus tracking, the More list) moves into the lower half of My bear. `screenProgressDashboard.tsx` becomes that lower half, rendered by `screenMyBear.tsx`.
- Feed: the TV on My bear. Tapping the TV opens the Feed screen (the old `screenFriends.tsx` feed part) with requests at the top.
- Friends management: "+" → Friend for adding, and a "Friends" row under the TV for the list with Remove and Block. The `friends` entry in `ITab` stays and hosts both screens; the footer draws no button for it.
- Handle and profile: My bear's title is the handle by default, and a switch in the handle form, "Show my bear as", picks `@handle` or the display name, both of which the profile already has. The bear and Edit sit under the title. The first-time form opens there, worded "Name your bear".
- Notes: inside the Journal day, reached from "+" → Note and from the Journal's own "+". Each note is a Markdown file in the app's storage, exported as `.md` files inside "Export everything" and the cloud backup.
- Settings: the gear on My bear, top right. Settings keeps its upstream layout (U21 moves the backup card to the top).
- Program editing: My bear → Program card, unchanged. Home never shows the program card.
- The sixty built-in programs: Settings → Program, and My bear → Program card → the two-arrows icon, which open the upstream `programselect` list. Onboarding never shows it.
- Steps and Progress photos: My bear → Bonus tracking, unchanged (U18 adds the manual-entry line).
- Goal wizard: the Current goal card on My bear stays. First run fills it from the Size or Strength answer so a new user never sees "Set your goal".

### One calendar: the Journal

The Journal owns the calendar: the week strip at the top (`ProgressCalendarHeader`, moved from Progress) and the month view under it on tap. Home drops the upstream `WeekCalendar` and shows seven small dots next to the bear's head, one per day of this week, filled when the day had a workout or a meal, as in the sketch; a tap on the dots opens the Journal on that day. The streak count sits on My bear next to the bear. Tapping it opens the Streak screen.

### Leaving a workout

Today the footer hides itself while the live workout is on top (`isLiveWorkoutScreen` in `NavScreenFooter2.tsx`), and the only exits are Finish and the kebab's Delete Workout. Two changes.

- The footer stays visible during a workout, as the owner decided. Delete the `isLiveWorkoutScreen` branch. The workout stays in `storage.progress[0]`, so any tab works and the "+" sheet's wide bar reads "Resume workout". This also closes U34.
- A Close chevron in the top-left nav slot of `screenWorkout.tsx` pops to Home with the workout still running. Home then shows the next-workout card as "Workout in progress · 23 min · Resume".
- The kebab keeps "Delete Workout", relabelled "Discard workout", with its existing confirm.

## 3. First run

### The flow

Six screens from the invite link to the first workout. Screen 1 only exists in Safari. Screens 2 to 6 replace the chat in `onboardingChat.tsx`, built on batch J's version of it. Every screen has one button at the bottom and chips above it. No text field except the three numbers on screen 4.

- Screen 1, Safari, "Add beBEAR to your Home Screen": the existing `InviteGuide` with the three steps, shown whenever the page is not standalone on an iPhone (U4 rule). Nothing else is reachable in the tab.
- Screen 2, "Meet your bear": the cub, one line ("This is your bear. Train it, feed it, watch it grow."), then Sign in with Apple, Sign in with Google, "Use an email code" as a text link, and "Not now". The owner decided sign-in is built and skippable while testing. With an invite handle present, batch J's handle and name fields sit under the sign-in buttons, with the name prefilled from Apple or Google.
- Screen 3, "Where do you train?": four chips with an icon each, Full gym, Only dumbbells, Street workout bars, No equipment. Multi-select. Nothing else.
- Screen 4, "About you": experience as three chips (New, A few months, Years), then age, height and weight with the cm and ft-in chips from `foodTargetsCalculator.tsx` (U11), the unit defaulted from the phone locale, and an optional sex row.
- Screen 5, "What do you want?": three chips, Size, Strength, Both, single-select, then one toggle row, "More agile". Two buttons: "Recommend a plan" in honey and "Import my own" as a text link. Import opens the existing screenshot and history import from `onboardingQuestions.tsx` and needs sign-in and AI consent; without them it shows one line, "Import needs sign-in", and the Recommend button stays.
- Screen 6, "Your plan": up to three cards, 3 days, 4 days, 5 days, the recommended one first and marked "Best for you". Each card: name, days, about 45 minutes, one line on what the week looks like. Tap a card, see the days listed, tap Start. Start lands on Home with the cub at stage one and the next-workout card.

The "days per week" and "minutes" questions go. The three cards are the days question. The minutes are fixed by the family: every session is 6 to 8 exercises, about 45 minutes.

### What it collects, and what each answer changes

Every rule lives in `src/models/onboardingAnswers.ts`, `src/models/bearPlanRecommend.ts` and `src/models/bearPlace.ts`, and in the prompt that `api/ai/onboard.mjs` sends for the import path.

- Where you train: each pick adds an equipment pool. Full gym adds barbell, dumbbell, cable, leverageMachine, smith, ezbar, trapbar and kettlebell. Only dumbbells adds dumbbell. Street workout bars adds the pull-up bar and dip bar exercises (bodyweight equipment, bar-based). No equipment adds floor bodyweight only. Every pick includes floor bodyweight. The picks are a set, and the generator fills each slot from the first pool that has an exercise for it, in the order gym, dumbbells, street, floor. `BearPlace_equipmentKeys(places)` returns the key list, and the apply step keeps only those keys in the current gym's equipment map (`settings.gyms[].equipment`), with the default plate data from `Settings_defaultEquipment` for each kept key. The plan family uses only exercises with those equipments.
- Experience: sets the recommended day count. New recommends 3 days, A few months 4, Years 5. It also sets the starting weights line on screen 6 ("Start light, the app adds weight when you hit the reps").
- Size, Strength, Both: picks the set scheme of the family. Size is hypertrophy, Strength is strength, Both runs strength on the first lift of each day and hypertrophy on the rest. The goal card on My bear gets "Build muscle" for Size and Both, "Maintain" for Strength.
- More agile: adds the agility block to every plan (see the family below).
- Age: under 18 selects the youth variant of the family: no AMRAP sets, no sets under 5 reps, a 10 percent lighter progression step, and the recommended days capped at 3 for New. Age also sets `birthYear` for food targets, as today.
- Height and weight: feed `OnboardingAnswers_body`, which fills the food profile and the first weight entry. Food targets then come from `FoodTargets` with no placeholder goals (U7). The bear's hunger reads the kcal target from the same place.
- Import my own: the existing AI path with screenshots and history, unchanged apart from receiving the place and goal answers in its prompt. The rules fallback `OnboardingPicker_pick` goes; when the AI import fails the user gets the three family cards.

### The beBEAR plan family

One family, written once, with four parameters. The addendum asks for three plans times goal times place times agility, which with four equipment picks is 3 × 3 × 4 × 2 variants plus youth. Written by hand that is 144 files. Written as one generator it is one module and three markdown files.

The parameters, as the `IBearPlanParams` type in a new `src/models/bearPlan.ts`.

- `days`: 3, 4 or 5.
- `goal`: hypertrophy, strength or both.
- `places`: a set of gym, dumbbells, street and floor, from `BearPlace_resolve(picks)`. Floor is always in the set.
- `agile`: true or false.
- `youth`: true or false.

What each day count is.

- 3 days: full body A, full body B, full body C. Day A ends with a 10-minute easy run (`Running` as one timed set) and day C ends with a 10-minute mobility block (hip opener, thoracic rotation, hamstring reach, as bodyweight exercises with 2 sets each).
- 4 days: upper A, lower A, upper B, lower B.
- 5 days: push, pull, legs, upper, lower. The existing `bebear-ulppl.md` is this plan's gym hypertrophy variant, and the generator takes it over so there is one source.

How the text is built. `BearPlan_text(params)` returns the full Liftoscript text for one week, non-multiweek, and nothing else is stored.

- Slots: each day is a list of movement slots, for example `squat`, `hinge`, `horizontalPush`, `verticalPull`, `horizontalPull`, `verticalPush`, `lunge`, `curl`, `triceps`, `lateral`, `calf`, `core`. A table in `src/models/bearPlanSlots.ts` maps each slot to one exercise per pool, by the exercise's library name and equipment, for example `squat` is `Squat, Barbell` in the gym pool, `Goblet Squat, Dumbbell` in the dumbbells pool, `Pistol Squat, Bodyweight` in the street pool and `Squat, Bodyweight` on the floor. `verticalPull` has no floor exercise, so a floor-only plan gets a `horizontalPull` with a towel row under a table in its place. The table holds about 15 slots times 4 pools, 60 picks, each a name that `Exercise_findByName` resolves.
- Schemes: the top of Day 1 declares template exercises with `/ used: none`, one per scheme: `main` (strength: 4x5, `progress: lp(5lb)`), `mainYouth` (3x6, `progress: dp(2.5lb, 6, 8)`), `build` (hypertrophy: 3x8-12, `progress: dp(5lb, 8, 12)`), `iso` (3x12-15, `progress: dp(2.5lb, 12, 15)`), `bw` (bodyweight: 3x6-12, `progress: dp(0lb, 6, 12)` with reps-only progression), `run` (1 timed set of 10 minutes) and `mobility` (2x45s). Every real exercise is `Name / ...main` style reuse, so the scheme of a slot changes in one place.
- Goal: picks which template each slot reuses. Hypertrophy: `build` for compounds, `iso` for isolation. Strength: `main` for the first two compounds of a day, `build` for the rest. Both: `main` for the first compound only.
- Agile: appends an `agility` block of three exercises to every day: `Jump Squat`, `Lateral Bound` and `Jump Rope` (the last as a timed set), 3x8 each, reusing a `jump` template with no weight progression. On the 3-day plan the run on day A stays and the block replaces the mobility block on day C.
- Youth: swaps `main` for `mainYouth`, removes every `+` (AMRAP) marker, and halves the `lp` step.
- Places: swaps every exercise name through the slot table, pool by pool. Street has no loaded `hinge`, so the table gives `Glute Bridge, Bodyweight` and, for the 5-day pull day, `Pull Up, Bodyweight` with the `bw` template and a note on adding a backpack once 3x12 is reached. Floor-only plans run every slot on the `bw` template.

Who writes it. Opus, following `.claude/commands/write-program.md`: the "Learn Liftoscript" step (read `.claude/skills/liftoscript/SKILL.md` and the reference files it names) and the "Write the Program" step. The worktree and fork-PR steps are skipped, because they push to upstream's bot fork. The owner reads the three generated gym plans before the batch merges, 2 hours.

How it gets tested, in a new `test/bearPlan.test.ts`.

- Every combination: 3 days × 3 goals × 4 single-pool place sets × 2 agile × 2 youth is 144 parameter sets, plus the 11 multi-pick sets for the base goal, 155 in all. For each, `PlannerMode_commitFullText(BearPlan_text(params), Settings_build())` returns no error. That one call parses the text and evaluates every exercise, so an unknown exercise name, a broken reuse or a bad progression fails here.
- Shape: the committed weeks have length 1, the week has `days` days, every day has between 6 and 10 exercises (11 with agility), and no exercise name repeats within a day.
- Equipment: every exercise in a plan has an equipment from `BearPlace_equipmentKeys` for that place set, checked through `Exercise_findByName` and its equipment.
- Golden files: `test/fixtures/bearPlan/<days>-<goal>-<place>.txt` for the 36 single-pool base variants, compared as text, so a change to the slot table shows as a readable diff in review.
- Youth: no `+` in any youth text, and no set with fewer than 5 reps.

How it reaches the catalog. A new `scripts/build-bear-plans.ts` writes the Liftoscript fence of `programs/builtin/bebear-3day.md`, `bebear-4day.md` and `bebear-ulppl.md` from `BearPlan_text` with gym, hypertrophy, no agility, so the catalog pages and the generator never drift. `npm run build:programs` then builds them into `programdata/` as today. Onboarding does not read the catalog for these three; it calls `BearPlan_text` and commits the result through `OnboardingProgram_prepare`'s `liftoscript` branch, which already builds a program from text. `BearPlan_recommend(answers)` in `src/models/bearPlanRecommend.ts` returns the three cards with the recommended one first.

### The upstream tutorial

The offline web build never shows the upstream `first`, `units`, `setupequipment`, `setupplates`, `hearaboutus` or `programselect` screens, because the first screen is always `main`. The two upstream tours (`workoutTourConfig.tsx`, five dinosaur cards, and `programTourConfig.tsx`, seven cards) still show until four workouts are done. Both get `shouldStart` returning false when `OfflineOnly_isEnabled()`. Nothing in the tours survives.

What replaces them: one-line tips at the moment of use, from a pure `FirstUseTips_next(event, helps)` in a new `src/models/firstUseTips.ts`, rendered by a small `TipBar` above the content. Each tip is one sentence and shows once, recorded in the existing `storage.helps` array.

- First set tap: "Tap the circle when a set is done. Change the numbers first if you did something else."
- First crossed-out weight: "The crossed-out number is the plan. The other one is what your plates can make."
- First Finish tap: "Finish saves the workout and grows your bear."
- First open of the program editor: "This is the plan. Most people never change it."

## 4. The bear

Every rule below is a pure function over data the app already stores: `storage.history`, the food log, `storage.stats`, the program's planned days, and `now`. No new store holds a stat. The only new store, `bebear_bear`, keeps "already celebrated" flags (stage-ups and badges shown), so a reinstall with a restored backup shows the same bear.

### Stats

Four numbers, computed by `Bear_state(sources, now)` in a new `src/models/bear.ts`.

- `growthKg`: lifetime counted volume in kg. It only goes up. It sets the stage.
- `fullness` 0 to 100: how recently and how much the bear was fed.
- `energy` 0 to 100: how recently it trained, against its planned days.
- `mood`: happy, ok, hungry or lazy, derived from the two above.

### Growth and the anti-cheat rules

`BearGrowth_countedKg(record, earlierCounted, settings, bodyweight)` in a new `src/models/bearGrowth.ts` returns the kg a workout adds. Volume is user-typed, so the function counts only what a real session could produce.

- A workout counts only when `History_workoutTime` is at least 10 minutes and at least one set is completed. Shorter workouts save as normal and add 0 kg.
- A set's weight counts up to 1.3 times the best completed weight for that exercise in earlier counted workouts. The first time an exercise appears, the cap is 2 times bodyweight, or 120 kg with no bodyweight logged.
- A bodyweight set logged at 0 kg counts 0.6 times bodyweight per rep, so pull-ups and street plans grow the bear too (U14's "0 lb" case).
- A workout's counted kg is capped at 200 kg per minute of workout time, and at 25,000 kg. A 12-minute fake session with 40,000 kg typed in counts 2,400 kg.
- One counted workout per calendar day. A second workout that day adds 0 kg and still counts for the streak.
- Imported history passes through the same caps, in date order, so a bulk import cannot jump past the caps.

Tiers reuse `BearTier_for` from `src/models/bearTier.ts`, with ten tiers instead of six, because the owner wants nobody to finish the game in a year. A skinny beginner counts about 3,000 kg a session, three sessions a week, about 470,000 kg a year; an intermediate counts about twice that. The time to each tier below is for the beginner.

- Cub: 0 kg.
- Sun bear: 20,000 kg, two weeks.
- Black bear: 80,000 kg, nine weeks.
- Brown bear: 200,000 kg, five months.
- Grizzly: 450,000 kg, one year.
- Polar bear: 1,000,000 kg, two years.
- Kodiak: 2,500,000 kg, five years.
- Cave bear: 6,000,000 kg, thirteen years.
- Short-faced bear: 15,000,000 kg, thirty years.
- Ursa Major, the star bear: 40,000,000 kg, out of reach, so the last card always shows a next stage.

The last three are extinct or mythical, drawn larger and with a glow. Stages are levels: the app shows "Level 5 · Grizzly", and the bear name is the level's title. Inside a level the sprite scales from 0.85 to 1.0 with `fraction`, so the bear grows every week, and a level-up is a visible jump.

### Fullness

- Each food entry gives 25 points times `min(1, calories / 400)`. A 400 kcal meal is a full feeding. Four meals fill the bear.
- Points fade to 0 in a straight line over H hours. H is 36 for a Cub and drops 2 per stage, down to 18 for Ursa Major. Bigger bear, hungrier.
- For 24 hours after a counted workout, H is 25 percent shorter. Training makes it hungrier.
- `fullness` is the clamped sum. Bands: Stuffed at 80 and up, Fed 40 to 79, Peckish 20 to 39, Hungry under 20.

### Energy

- `graceHours` is 168 divided by the planned days per week, 56 hours for a three-day program, 168 when no program is set.
- `energy` is 100 while the hours since the last counted workout are within `graceHours`. After that it falls by 100 over the next 3 times `graceHours`. On a three-day program, a bear untouched for 9 days has 0 energy.
- A counted workout sets it back to 100.

### Mood

In priority order: lazy when energy is under 40, hungry when fullness is under 20, happy when energy is at least 70 and fullness is at least 40, otherwise ok.

What lazy looks like: the sprite lies on its side, the breathing animation slows to half speed, the status line reads "Your bear hasn't moved since Tuesday", and the Home card's main button is Train. Lazy never removes growth. The bear forgets nothing, it only sulks.

### Later: a bear that reacts to check-ins, in 3D

Not in this plan's version, but the data for it is. The owner wants the bear to answer the Journal check-in: heavy stretching when soreness is 4 or 5, a yawn and an earlier bedtime (the lazy pose from 21:00) when energy is 1 or 2, bouncing around with a headband when energy is 5. In version one the check-in scores never touch the bear; `Bear_state` takes only what the user did. The later version adds a `reaction` field to `Bear_state` from the day's check-in note, so the rule stays a pure function and the sprite picks an animation from it.

A 3D bear that moves around the screen is possible on both platforms, at a price. On the web, a glTF model through `<model-viewer>` or three.js, about 1.5 MB for a rigged low-poly bear with four animations. On native, `react-native-filament` or `expo-gl` render the same glTF. The art becomes one rigged model with ten level meshes and the accessories as attachable meshes, instead of 30 flat SVGs, and that is a different brief for the artist. Recommended path: ship the flat SVG bear first, keep every mood and reaction as a named state in `Bear_state`, and swap the renderer later without touching the rules.

### Honey and accessories

Every gym day earns honey, and honey buys things the bear wears. The rules live in a new `src/models/bearHoney.ts`.

- Earning, as the owner set it: 5 for a counted workout, 1 for weighing yourself, 1 for each macro target hit that day (protein, carbs and fat each within range, so up to 3 a day), 1 for posting a meal or a workout to friends, which makes a daily maximum of 10, plus 5 for each seven days of streak. Honey is computed from history, the food log, stats and posts, so earned honey needs no store; what was spent is stored.
- The shop: accessories with a price and a slot. Head (cap 20, headband 20, crown 150), neck (bandana 25, chain 90), ears (headphones 40), paw (dumbbell 60, protein shaker 30), back (gym bag 70), and one seasonal item at a time. About 12 items at launch. A three-day lifter who logs food earns about 30 honey a week, so the first item comes in the first week and the crown in five.
- `BearHoney_balance(earned, spent)`, `BearHoney_buy(state, itemId)` and `BearHoney_equip(state, slot, itemId)` are pure and return the next state. `bebear_bear` stores `spent`, `owned` and `equipped`.
- Accessories are SVG overlays with one anchor per slot per stage, listed in `bearPlanSlots.ts`'s sibling `bearAnchors.ts`, so one accessory file fits every stage.
- Equipped ids travel in the feed post summary, so friends see the hat.

### Where it appears

- Home, header: the bear's head at the level and mood, next to the seven day dots, as in the sketch. Tapping it opens My bear.
- My bear tab, titled with the bear's name: the bear large, the status line, honey balance, level and a bar to the next level with the kg left, fullness and energy bars, the streak, the TV, the badge row (earned count of total), the accessories shelf, the Friends row, then the Progress content.
- The Journal day: a small bear in the day header, at the mood it had that day.
- The finish screen: the bear replaces the dinosaur, celebrating, with "+1,840 kg · Sun bear in 6,200 kg · +10 honey" or the stage-up card.
- The TV: each feed row shows the friend's bear with its accessories.
- The story card: `BearMark` already draws it on share cards. It becomes the stage sprite.

### The daily loop

- Open the app: see the bear and its mood line.
- Training day: Train, do the workout, Finish, see the kg added and the bear eat the result.
- Every day: Feed, type what you ate, see fullness go up.
- Once a week, on the goal's weekday: Weigh-in. The checklist in `dailyChecklist.ts` changes from daily weight to weekly weight (U25 gets its subtitle), and its items become Train, Feed the bear, Weigh-in.

### Streaks and badges

- A streak day is a day with a counted workout or at least one food entry. `DailyChecklist_doneDays` already builds this set from stats, food log and check-ins; it drops the check-in source and adds counted workouts.
- Streak badges, coin style as in `b77aad8f-c235-4cff-81ef-8702c8365190.JPG` and `6ffcdd53-a685-4eb7-8b90-e7d8416f791b.JPG`: 3, 7, 14, 30, 100 days. Stage badges: one per tier reached. Plus the seven in `bearBadges.ts` today.
- A new badge opens a full-screen sheet with confetti (`Confetti` exists), the coin, "Badge unlocked", the name, Share your badge, View all badges, as in `6899eec2-7100-49c8-860c-c1ca863b8771.JPG`. Share reuses `shareCardExport.ts`.
- `BadgeCelebration_next(badges, seen)` in a new `src/models/badgeCelebration.ts` picks which badge to show now, so the sheet never shows twice.

### Winter Arc: The Big Hibernation

Added 2026-10-23, from the Liftoff teardown in `docs/research/liftoff-in-app.md`. Liftoff's "Night of the Lifting Dead" had every user add to one counter for 9 days. beBEAR's version runs once, before the bears sleep for winter. Batch W1 builds it.

- Window: 10 days, 2026-12-12 to 2026-12-21, ending on the winter solstice. Both days count, in the user's local time.
- One counter for all users: the sum of counted kg from `BearGrowth_countedKg`, so the anti-cheat caps under Growth apply. One counted workout per day means at most 25,000 kg per user per day.
- The goal is one thing from `src/models/bearComparison.ts`, shown as "Lift 8 blue whales together". The owner sets the goal kg a week before the start: signed-in users times 24,000 kg, which is 4 workouts of 6,000 kg each. With 50 users that is 1,200,000 kg.
- Signed-out users see the counter and "Sign in to add your kg". Their workouts still grow their own bear.
- Rewards, given at the end from local history and the final total: 1 counted workout in the window earns the "Winter Arc 2026" badge and a beanie, 3 counted workouts add a scarf, and a reached goal adds a puffer jacket for everyone who joined. Until B4's shop renders accessories, the three items show as coins in the badge grid.
- Home shows a banner during the window: the bear in snow, the counter bar, "6 days left". A tap opens the event screen with the counter, the user's part ("You added 18,400 kg in 3 workouts"), the three rewards with their state, and the days left.
- The finish screen adds one line in the window: "+3,100 kg to The Big Hibernation".
- Server: a new table `season_events` (id, title, starts_on, ends_on, goal_kg) and `season_event_days` (event_id, user_id, day, counted_kg), one row per user per day, written by its owner with an upsert. Inserts check that `day` sits in the event window and that `counted_kg` is between 0 and 25,000. A `security definer` function `season_event_total(event_id)` returns the total kg and the number of users, callable by `anon` and `authenticated`. Nobody reads another user's rows.
- The client upserts the day's row after each finish and again on app open in the window, so a workout logged offline still counts once the phone is online.
- The event row lives in the database, so the goal and dates change without an app release. The app ships the same values as a fallback for offline display.
- A later "Glute Week" for the female line can reuse the tables with a filter on hip thrusts, squats and RDLs. It needs a per-exercise count from `bearGrowth.ts`, which W1 does not add.

### The Hibernation pass

Liftoff sells streak restores. beBEAR's version is the bear sleeping through a missed day. It is bought with honey only, never with money. Batch W2 builds it.

- Price: 25 honey, about a week of earning for a three-day lifter who logs food. A user holds at most 2 passes.
- The pass is used without a tap. On app open, `HibernationPass_settle(store, doneDays, today)` looks at the days between the last streak day and today. Today is still open, so it never counts as missed.
- When the user holds at least as many passes as missed days, each missed day becomes a covered day and one pass is spent per day. When there are more missed days than passes, nothing is spent and the streak breaks.
- A pass is spent only on a streak of 3 days or more. A 1-day streak is not worth a week of honey.
- A covered day counts as a streak day in `DailyChecklist_streak`, in the streak badges, and in the 7-day honey bonus run. It earns no honey of its own.
- On the next open, a sheet shows the bear waking up: "Your bear hibernated yesterday. Streak saved: 12 days. 1 pass left." The Journal day shows the bear asleep.
- `HibernationPass_settle` returns the next store and the covered days, so running it twice changes nothing. A workout logged later for a covered day keeps the day, and the pass stays spent.
- The Streak screen shows the passes held and a "Buy a pass, 25 honey" row. The purchase adds to `spent` through `BearHoney_balance`.

### The TV, the friends feed

The TV shows two kinds of post: lifts and meals, plus the songs kept during a workout. Notes never appear on it.

- Lifts: `IWorkoutPostSummary` gains `version: 2`, `bear: { stage, mood, countedKg, equipped }` and `songs: string[]` (up to three kept song titles from the music log). `WorkoutPost_build` fills it from `Bear_state`. The parser keeps reading version 1 posts without a bear. A row reads "victor · Grizzly · Push day · 48 min · 12 sets · +3,100 kg · 🎵 3 songs". Duration and counted kg sit next to each other, so a 3-minute "workout" reads as one to every friend.
- Meals: after a "+" Food scan, a "Share with friends" switch on the serving-size step, off every time, posts the photo as taken, the description and a macros card (kcal, protein, carbs, fat). The finish screen's existing share switch stays off by default too. A new table `meal_posts` (user_id, posted_at, description, macros jsonb, photo_path) with the same friends-read policy as `workout_posts`, and a Supabase Storage bucket `meal-photos` with paths `<user_id>/<post_id>.jpg`, written by the owner and read by accepted friends. Photos resize to 1024 px before upload, as the AI scan already does.
- The feed merges the two tables by `posted_at` in `src/models/feed.ts`, which already parses `workout_posts`. Report and block from batch E apply to both kinds.

### Art to commission or generate

- Bear stills: 10 levels times 3 moods (happy, hungry, lazy; ok reuses happy), 30 files, all drawn now. SVG, viewBox 0 0 200 200, flat colours, under 20 KB each, at `/images/bear/<level>-<mood>.svg`. Web loads them through `SvgUri` and native through `BundledImages_svgXml`, the same path `dinohappy.svg` takes today, so each file also goes into `src/utils/bundledImagesSvg.native.ts`.
- Celebration still: one per stage, 10 files, same format.
- Accessories: 12 SVG overlays at `/images/bear/items/<id>.svg`, each drawn for the 200 by 200 box with a known anchor.
- The TV: one SVG of a small television, drawn in the bear's style, with the screen area transparent so the latest feed photo shows through.
- Badge coins: 21 PNG files, 256 by 256 with alpha, at `/images/badges/<id>.png`. Locked coins render through a CSS grayscale filter, no second file.
- Animations in version one are code: a breathing bob with Reanimated on the still, a hop on Feed, a slow tilt when lazy. No Lottie, because `lottie-react-native` is not installed and SVG stills already work on both platforms.
- Style: the icon bear from commit 912a642d. The owner generates the art with the prompt at the end of this plan, and the generated raster files get traced to SVG with `potrace` or redrawn flat in Figma, because the app needs vectors that scale and recolour.

## 5. Sign-in

### The redirect problem, and what works

Supabase's OAuth entry point is a top-level navigation to `https://qvqwvuuwfueccrmzwyct.supabase.co/auth/v1/authorize?provider=apple&redirect_to=...`. Supabase takes the provider's callback at its own `/auth/v1/callback`, then sends the browser to `redirect_to`. With PKCE the return URL carries `?code=`, and the app exchanges it with `POST /auth/v1/token?grant_type=pkce` and `{ auth_code, code_verifier }`. The answer has the same shape as the email-code verify, so `SupabaseClient_saveSession` stores it unchanged.

On an iPhone Home Screen app the deciding fact is how the page leaves. A `window.location.assign` to another origin keeps the standalone app's own view and its own storage, and the redirect back to `lifts.paulbebear.com/app/` lands in that same view. The Spotify login in this app already proves it: the review checked that the login "returns to /app/?code= inside the app and the PKCE verifier is in the same storage". What breaks it is `window.open`, an anchor with `target="_blank"`, or Sign in with Apple JS in popup mode, which open Safari with separate storage. The rule for the builder: one `location.assign`, no popup, verifier in the same `bebear_cloud` store.

Two things the phone must confirm on day one, because they cannot be proven from code.

- Google may answer `403 disallowed_useragent` inside a standalone web app, because the standalone user agent lacks the Safari token that Google's embedded-browser check looks for. Reports go both ways across iOS versions. If it fails, Google stays native-only and the web shows Apple and email.
- Apple's "Hide my email" gives a relay address, so an Apple sign-in never links to an existing email-code account. The session line shows the signed-in email, and the restore offer on the backup card still works for a new account.

Flow on the web, in `src/utils/supabaseOAuth.ts`, with the URL building, the return parsing and the pending state in a pure `src/models/oauthFlow.ts`.

- Tap: generate a PKCE verifier and challenge with the SHA-256 code already in `src/models/spotifyAuth.ts`, write `{ pending: { provider, verifier, startedAt } }` into `bebear_cloud`, then `location.assign` the authorize URL with `redirect_to=https://lifts.paulbebear.com/app/?auth=supabase`.
- Return: `src/index.tsx` sees `auth=supabase` and `code` in the URL before rendering, exchanges the code, saves the session, clears `pending`, and replaces the URL with `/app/` through `history.replaceState`. A `pending` older than 10 minutes is dropped. The `auth=supabase` marker keeps the Spotify return (`/app/?code=` with no marker) on its own path.
- Fallback: the email-code card stays, under a "Use an email code" link.

Flow in the native build, in `src/utils/supabaseOAuth.native.ts`.

- Apple: `@invertase/react-native-apple-authentication` is installed. It returns an identity token and the nonce the app passed. Send `POST /auth/v1/token?grant_type=id_token` with `{ provider: "apple", id_token, nonce }`.
- Google: `@react-native-google-signin/google-signin` is installed. Configure it with the iOS client ID, take `idToken`, send the same endpoint with `{ provider: "google", id_token }`.
- Both need the Sign in with Apple capability back on the App ID and the Google reversed client ID back in `CFBundleURLTypes`, which `NATIVE_PLAN.md` removed. They come back with the friend's team ID.
- The App Store rule: an app that offers Google sign-in must also offer Sign in with Apple. Both ship together.

### What the owner sets up

Apple, in the developer account (the friend's, until the owner has one).

- Certificates, Identifiers & Profiles → Identifiers: the native App ID with "Sign in with Apple" on.
- A Services ID for the web, for example `com.bebear.lifts.web`, with "Sign in with Apple" on, domain `lifts.paulbebear.com`, return URL `https://qvqwvuuwfueccrmzwyct.supabase.co/auth/v1/callback`.
- A Key with "Sign in with Apple" on. Download the `.p8` once, note the Key ID and the Team ID.
- Supabase → Authentication → Providers → Apple: Client IDs are the Services ID and the native bundle ID, comma separated. Secret Key is a JWT signed with the `.p8`; Supabase's Apple page links the generator. Apple caps that JWT at 6 months, so the owner puts a reminder in the calendar to regenerate it.

Google, in Google Cloud.

- A project, then OAuth consent screen: External, app name beBEAR, support email, scopes email and profile. Publish to Production, or every tester must be added as a test user.
- Credentials → OAuth client, Web application: authorised JavaScript origin `https://lifts.paulbebear.com`, authorised redirect URI `https://qvqwvuuwfueccrmzwyct.supabase.co/auth/v1/callback`. Copy the client ID and secret into Supabase → Providers → Google.
- Credentials → OAuth client, iOS, with the bundle ID. Add its client ID to the Google provider's "Authorized Client IDs" in Supabase.

Supabase.

- Authentication → URL Configuration → Redirect URLs: `https://lifts.paulbebear.com/app/**` and the local dev origin from `localdomain.js` with `/app/**`.
- Sign-up policy: "Allow new users to sign up" stays on, as the owner decided. The AI caps below are the spending guard.

### AI caps

Sign-up stays open while testing, as the owner decided. The spending guard is the per-account cap. Today `api/_auth.mjs` calls the SQL function `ai_usage_take`, which counts one call per UTC day against `AI_DAILY_CAP`, default 60, for every AI route.

- Free accounts: 3 uses a day and 10 a week, counted over Describe, the photo scan (both in `api/food/photo.mjs`) and the warmup (`api/ai/warmup.mjs`).
- Outside the cap: the onboarding import (`api/ai/onboard.mjs`), limited to 3 runs per account for life, and the post-workout report (`api/ai/report.mjs`), limited to one per finished workout. Both stay behind sign-in and the global ceiling from batch E.
- beBEAR+ accounts: higher limits, 30 a day and 150 a week, for anyone the owner gives a code. A new table `pro_codes` (code, created_at, redeemed_by, redeemed_at) and a SQL function `redeem_pro_code(code)` that marks the code used and writes `plan = 'plus'` on the user's row in a new `account_plans` table. The owner makes codes by inserting rows in the Supabase dashboard. The app gets "Enter a code" in Settings → Cloud backup, and a "beBEAR+" line once redeemed.
- `ai_usage_take` gains a `kind` argument (`capped`, `onboard`, `report`) and a seven-day window. It reads the caps for the user's plan from `account_plans` with the free defaults from `AI_DAILY_CAP`, `AI_WEEKLY_CAP`, `AI_PLUS_DAILY_CAP` and `AI_PLUS_WEEKLY_CAP` in Vercel, and returns both counts so the app can show "2 of 3 today, 7 of 10 this week".
- A capped call answers 429 with the counts, and every AI button shows "Your 3 AI uses for today are used. More tomorrow." instead of the raw error. Barcode, search and USDA lookups are not AI and stay uncounted.

### Instagram

Not now. Supabase has no Instagram provider. Meta shut the Instagram Basic Display API on 4 December 2024, and the remaining "Instagram API with Instagram Login" only signs in business and creator accounts after Meta app review. The only route is Facebook Login, which 16 to 23 year olds rarely have and which Meta restricts for under-18s. Revisit if the app ever ships publicly and needs it for sharing.

## 6. Visual direction

### Tokens

Nothing in `tailwind.colors.json` or `tailwind.semantic.json` changes. The Monochrome theme already shows the pattern: `src/index.html` overrides CSS variables under `html.mono`. The bear theme does the same under `html.bear`, set on the `<html>` tag in the fork's `src/index.html`, and a 10-line override in `src/utils/tailwindConfig.ts` returns the same colours to the icons that read `Tailwind_semantic()` in JS.

- Honey `#F5A524`: `--color-button-primarybackground`, `--color-menu-buttonprimary`, `--color-icon-purple`, `--color-text-purple`, `--color-menu-iconactive`, `--color-menu-labelactive`. Pressed: `#DD8E02` (`yellow.600`). Dark mode keeps honey.
- Link: `#B76506` (`yellow.700`) for `--color-text-link` in light mode, `#FFD820` (`yellow.400`) in dark.
- Cream `#FFF8EC` (`yellow.50`) for `--color-background-subtle` in light mode. Dark mode keeps `darkgray.950`.
- Bear brown `#6B3F1D` and bear face `#F2D6B3`: two new variables, `--color-bear-fur` and `--color-bear-face`, used only by sprites and `BearMark`.
- Success, error, neutral greys: upstream's.
- Radius: 12 for buttons, 16 for cards, 24 for sheets, 999 for pills and the tab bar.
- Type: the system stack already set in `src/index.html` (San Francisco on iPhone). Sizes 34 bold for a screen title, 22 semibold for a section, 17 for body, 15 for secondary, 13 for captions. Three weights: 400, 600, 700.
- Spacing: a 4 pt grid. 16 pt gutters (`px-gutter` exists), 12 pt between cards, 24 pt between groups, 96 pt bottom padding on every scroll view so the last row clears the floating bar.

### Liquid Glass

Web, in `src/index.html`, one class the footer uses.

```css
.glass-bar {
  background: rgba(255, 255, 255, 0.55);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}
html.dark .glass-bar {
  background: rgba(28, 28, 30, 0.55);
  border-color: rgba(255, 255, 255, 0.12);
}
@supports not (backdrop-filter: blur(1px)) {
  .glass-bar { background: rgba(255, 255, 255, 0.92); }
}
```

- The pill floats 16 pt from each side and 12 pt above the safe area, with the "+" as a separate 56 pt circle to its right, as in `543ddeaf-bb1c-4afc-bdad-71c1d7365642.JPG` and `07fb4ff5-1479-486d-970d-7c60c991c4ca.JPG`.
- Performance: `backdrop-filter` makes the compositor re-blur whatever scrolls under the bar on every frame. One bar at 64 pt tall runs at 60 fps on an iPhone XR (A12, 2018), the oldest phone that runs iOS 18. The rule is one glass surface on screen, never glass on cards or sheets. iOS Safari has had `-webkit-backdrop-filter` since iOS 9 and the unprefixed name since iOS 18, so both lines stay.
- Native: `@react-native-community/blur` is installed. A `GlassBar` primitive at `src/components/primitives/glassBar.tsx` (web, the class above) and `glassBar.native.tsx` (`BlurView` with `blurType="systemChromeMaterial"`) lets `Footer2View` stay one file. The iOS 26 glass material through a community wrapper such as `@callstack/liquid-glass` is a later swap inside `glassBar.native.tsx`, not a dependency of this plan.

### Applying it

Every restyled upstream file is a merge conflict on the next upstream pull, so the rule is: fork-owned files get the new look, upstream files get only what the variables give them.

- Restyled: `footer2.tsx` (already fork-modified), `screenFinishDay.tsx` (already fork-modified, and the owner's cut list rewrites it anyway), `screenProgressDashboard.tsx`, `programHistory.tsx` header only, `homeChecklist.tsx` and `dailyChecklistCard.tsx`, `screenFriends.tsx` and `friendsPeople.tsx`, `screenFood.tsx` and the food panels, `onboardingChat.tsx` and its screens, `screenStreak.tsx`, `cloudBackupCard.tsx`. U33's one-vocabulary pass (`Button` with a `kind`, `TextInput`, semantic tokens, one calorie spelling) happens inside these files as each batch touches them.
- Kept upstream: `workout.tsx` and every `workoutExercise*.tsx`, the program editor, `screenSettings.tsx` and `menuItem.tsx`, the exercise picker, Graphs, Measurements. They turn honey through the variables and keep their layout.
- Worth it later, if upstream merges stop: the workout screen header and the set rows.

## 7. Screen-by-screen changes

### Home

After, top to bottom, as in the sketch.

- Header: the bear's head left (tap opens My bear), seven day dots to its right (filled for days with a workout or a meal, tap opens the Journal on that day).
- "Today" and the day's pill: "Legs!" from the next program day's name, or "Rest day" with the bear's line.
- Today card: Train, Feed the bear, Weigh-in (weekly), each a row with a tick.
- Next workout card: name, exercises and sets, Start. During a workout it reads "Workout in progress · 23 min" with Resume.
- Fed today line: "1,240 of 2,800 kcal · 84 g protein", tap opens the Food day screen.
- History list, unchanged.

Removed: the "Morning, there!" greeting (U23 replaced by the day pill), the upstream week strip (the Journal has it), the Run button, the daily weight row, the week insights strip (`WeekInsights` moves to My bear under Workout consistency), the dinosaur null state (`historyRecordsNullState.tsx` shows the cub instead).

### The tab bar

After: Home (house), Journal (book), My bear (the beBEAR logo) in a glass pill, "+" circle to the right, as the owner decided. Active tab in honey. No labels under 11 pt. Visible during a workout.

Removed: the Workout barbell button, the Food button, the Friends button, the `-mt-scaled-6` raised centre button, the full-width white background and shadow.

### The "+" sheet

After: a bottom sheet with a dimmed backdrop, as in the sketch. Two rows of two white squares with an icon and a label: Food, Measurement, Friend, Note. Under them one wide honey bar: Start workout, or Resume workout, with a small Run button inside it when the phone has GPS. Tap outside or the "+" (now an X) closes it.

Removed: nothing, it is new. The wide bar replaces the barbell button as the thing that opens `nextWorkoutModal` when no workout is ongoing.

### My bear

After, top to bottom. This is `src/components/screenMyBear.tsx`, new, the root of the `graphs` stack in place of `progressDashboard`, so Settings and the Me screens stay registered under it. The nav title is the handle, or the display name when the user flips "Show my bear as". The gear sits top right.

- The bear, large, with its accessories, breathing. Status line under it: "Fed and rested" or "Hasn't moved since Tuesday".
- A row of three numbers: streak (opens Streak), honey, level with the bar to the next level.
- The TV: a small television with the latest friend's photo or bear on its screen and a red dot when there are new posts. Tap opens the Feed screen.
- How he's doing: fullness and energy bars, then the last 30 days of the check-in scores (energy, soreness, mood) as three small lines, from the notes store. Tap opens a full chart with 90 days and the workout days marked.
- Badges row: the last three coins and "12 of 21", tap opens the badge grid.
- Shelf: owned accessories, tap to equip; "Shop" opens the honey shop.
- Friends row: "4 friends", tap opens the friends list with Remove and Block.
- Then the dashboard, the old Progress content, unchanged in order: program card, goal card, weight, nutrition, workout consistency, Bonus tracking (steps, photos), More (runs, graphs, measurements, body composition, music, reports, exercise stats, settings). Every row opens its deeper screen as today.

Removed: the Progress tab, the Friends tab, the Progress calendar header (the Journal has it), the person icon.

### The Feed screen (the TV)

After, top to bottom, in `screenFriends.tsx` cut down to the feed.

- Requests, when any, with Accept and Decline.
- Posts newest first, each with the friend's bear and name. Lift rows show day name, duration, sets, counted kg and up to three song titles. Meal rows show the photo, the description and the macros card.
- Pull to refresh, unchanged.

Removed: the "You are victor @victor" line, Add a friend, the friends list, "Contact us" (moves to Settings → Miscellaneous).

### Notes

After, inside the Journal day, with a new `src/components/noteEditor.tsx`.

- A note: a title line and a Markdown body in a plain text field, saved on every change. The day's workout and meals show under the body as chips, so a note written on a leg day shows "Legs · 48 min". A note is dated, never attached to a workout, so it survives a deleted workout and rest days have notes too.
- Storage: a new `bebear_notes` store through `JsonStore_create`, one entry per note with `id`, `day`, `createdAt`, `updatedAt`, `kind` (`note` or `checkIn`), `title`, `body`, and for a check-in `energy`, `soreness` and `mood`. "Export everything" writes them inside `journal/<date>.md`, with the three scores as a line under the date, and the cloud backup carries them with everything else.
- Later, not in this plan: a graph view of notes linked by `[[title]]` links, as in Opal and other second-brain apps. The `[[title]]` syntax is parsed from day one, so old notes join the graph when it comes.

Removed: nothing, it is new.

### The workout screen

After: Close chevron top left, title and timer, Finish top right, then the existing warmup card, thumbnails and sets. The tab bar stays visible underneath.

Removed: the tour (gated off). "Long-tap a thumbnail to reorder" stays as upstream. The kebab's "Show Tour" item goes in the offline build. "Delete Workout" becomes "Discard workout".

### The finish screen

After, top to bottom, in `screenFinishDay.tsx`. The list of actions comes from a pure `FinishDayActions_list` in a new `src/models/finishDayActions.ts`.

- X top left in the nav slot. It does what Continue did: push Home and run `Thunk_maybeRequestReview`.
- The bear celebrating, with "+1,840 kg" and the stage line, or the stage-up card.
- Program and day name.
- The story card pager (`WorkoutStoryCardSection`).
- One row of three round icon buttons: Add photo, Share, Music. Music pushes `music`. Share runs the existing export.
- The share-with-friends toggle (`FeedShareToggle`), one row.
- Totals, exercises, sets per muscle group, personal records, the report card, unchanged.

Removed, in order of the old screen.

- The dinosaur.
- `MobileShare` and `WebappShare`: IG Story, IG Feed, TikTok, Text, More, Copy Link, Image.
- "or just copy a link" (U15).
- "Review this workout's songs" and "Play cooldown". The cooldown link moves to the Music screen.
- "Shuffle" and "Share all 4" on the card. The pager's page tabs stay.
- The Create Program Day button. It stays in the workout kebab, where upstream also has it.
- Continue, and the Congratulations nav title. The X slot replaces the title with the day name.

### The Journal

After, in a new `src/components/screenJournal.tsx` as the root of the `food` stack in place of `screenFood.tsx`, whose meal list becomes one section of the day. One day per screen, today by default.

- The week strip (`ProgressCalendarHeader`, moved here), with a month view on tap and a streak flame at its left.
- Day header: the date, a small bear at that day's mood, and the day's honey ("+7 honey").
- Check-in: two small cards. The first rates three things over five faces from sad to happy: energy, soreness, overall mood. The second is one open line, "A small reflection", optional. Both store as the day's check-in note (`kind: "checkIn"` with `energy`, `soreness`, `mood` from 1 to 5, and the reflection as the body), one per day, editable until midnight.
- Workout card: the day's finished workout (day name, duration, sets, counted kg, PRs), or the planned day with Start, or "Rest day".
- Meals: the text box "What did you eat?" (the Ami pattern, `5b7df54e-924f-474b-b7a5-ecf84d93b1cf.JPG`) with a camera icon, then the meals grouped as today, then the macros pill with the Consumed and Remaining toggle.
- Songs: the kept songs of the day's workout, from the music log.
- Weigh-in: the day's weight when logged, or "Log weight".
- Notes: every note of the day, newest first, each a card with its first line. "+" at the section header adds one.
- Export: "Export journal" in the day's kebab writes `journal/<date>.md` with every section as Markdown, and "Export everything" writes all days.

Removed: the standalone Food tab and screen, the standalone Notes screen from the earlier draft.

### Food

Two ways in. The "+" Food square is camera-first, as in the sketch. The Journal's meals section is text-first, as in Ami.

The "+" Food flow, in `screenFoodAdd.tsx`.

- The camera, full screen, with the framing brackets and a shutter. A two-part toggle at the bottom: Barcode and AI scan. Barcode uses the existing `foodBarcodeScanner.tsx` (the owner's "in-house barcode master" is the existing `api/food/barcode.mjs` lookup). AI scan uses `foodPhotoPanel.tsx`. Without AI consent the toggle reads Barcode and Describe.
- Then one step, "Serving size / Description": the recognised item or items, a grams or servings field, a description line the user can edit, and a "Share with friends" switch, off every time, next to the photo thumbnail. One Add button. The meal comes from the clock through `FoodMealForTime_pick` in a new `src/models/foodMealForTime.ts`: before 11:00 breakfast, 11:00 to 15:00 lunch, 15:00 to 18:00 snack, after 18:00 dinner, changeable with one chip.

The meals section of the Journal, from `screenFood.tsx` and `foodDescribePanel.tsx`.

- The text box: "What did you eat?", multiline, with a Send button inside its row and a small camera icon that opens the "+" Food flow. Send runs `FoodApi_describe`, which counts one AI use, shows the choices from `FoodChoicesReview`, and one tap adds them. When the AI cap is reached the box says so and offers Search and Barcode, which are free.
- The day's entries as a plain list grouped by meal, each with kcal and protein. Empty state: "Start logging your meals…" in grey, with the bear peeking from the corner.
- The macros pill: "🔥 1,240 · C 130 · P 84 · F 40", tap expands into the current summary card with the Consumed and Remaining toggle.

The describe panel's state (text, loading, choices, note, error) moves out of the component into a pure reducer in a new `src/models/foodDescribeEstimate.ts`, with the component owning only the fetch. The "+" flow's steps (camera, result, serving) move into a pure `src/models/foodScanSteps.ts`.

Removed from the top of the screen.

- The big summary card. It becomes the pill.
- The "Full Breakdown" expander. It lives inside the expanded pill.
- The gear icon. It becomes "Targets" inside the expanded pill.
- The copy-day icon. It becomes "Same as yesterday" on the Log food screen.

### The handle screen

After, as a sheet over My bear on first sign-in, from `ProfileForm` in `screenFriends.tsx` moved to its own `src/components/handleSheet.tsx`.

- The cub, centred.
- "Pick a handle" and one line: "Friends find you by it. Letters, numbers, underscore."
- One field, with `@` drawn inside it, live format check, 16 pt text.
- Name field, prefilled from Apple or Google, or from the email's local part.
- "Show my bear as": two chips, `@handle` (default) and the name. Stored in `bebear_bear` as `titleKind`.
- One Save button in honey.

Removed: the grey card wrapper, the three-sentence explanation, the Cancel button on first run.

### Friends

After. Friends management splits in two.

- "+" → Friend: a sheet with one field and Find, the inline result with Send request, and "Share my invite link" (U17, share sheet with the invite link).
- My bear → Friends row: the list, each with name, handle and stage, with Remove and Block behind a kebab, not two text buttons per row. Sent requests sit under the list with Cancel.

Removed: the Friends tab, "You are victor @victor" as a line of prose, the three-button rows. With no friends yet, the Friends row on My bear reads "Add your first friend" and opens the "+" Friend sheet (U28).

## 8. Build batches

Every batch names its goal, findings, files, pure modules with tests, who builds it, hours, and what it can run beside. "Codex" means the batch is fully specified here. "Opus" means it holds design calls. A batch runs beside another when they share no file. The order follows the owner: onboarding first, then cut buttons and dead ends, then sign-in, then the bear.

Group 1, after batch J lands. Onboarding.

- O1, the plan family. Opus, with `.claude/commands/write-program.md` steps 2 and 3 and `.claude/skills/liftoscript/SKILL.md`. 16 hours of code plus 2 hours of the owner reading the three gym plans. Addendum items "Program choice" and "One family". Files: new `src/models/bearPlan.ts`, new `src/models/bearPlanSlots.ts`, new `src/models/bearPlace.ts`, new `src/models/bearPlanRecommend.ts`, new `scripts/build-bear-plans.ts`, `programs/builtin/bebear-ulppl.md` (regenerated), new `programs/builtin/bebear-3day.md` and `bebear-4day.md`, `package.json` (a `build:bear-plans` script that runs before `build:programs`), new `test/bearPlan.test.ts`, new `test/bearPlace.test.ts`, new `test/bearPlanRecommend.test.ts`, the 27 golden files under `test/fixtures/bearPlan/`. The module contract for O2: `BearPlan_text(params): string`, `BearPlan_recommend(answers): IBearPlanCard[]` with the recommended card first, `BearPlace_resolve(places): "gym" | "home" | "street"`, `BearPlace_equipmentKeys(place): IEquipment[]`. Runs beside O2.
- O2, the first-run screens. Opus. 14 hours. Addendum items "Equipment" and "Questions", the owner's walkthrough note, U11, U16, U32. Files: `src/components/onboardingChat.tsx` (becomes a six-screen flow), `src/components/onboardingQuestions.tsx` (keeps only the import fields), new `src/components/onboardingWelcome.tsx` with a slot for sign-in buttons, new `src/components/onboardingPlanCards.tsx`, `src/models/onboarding.ts` (steps: welcome, place, about, want, plan), `src/models/onboardingAnswers.ts` (places as a set, goal as size, strength or both, agile flag, youth rule, no days or minutes), `src/utils/onboardingCommand.ts` (recommend path through `BearPlan_text`, equipment apply through `Equipment_mergeEquipment`, goal card fill, delete the `OnboardingPicker_pick` fallback), `src/models/onboardingPicker.ts` (deleted with its test), `src/models/onboardingProgram.ts` (name from the card), `api/ai/onboard.mjs` and `llms/program_builder_prompt.md` (place and goal in the import prompt), `src/components/tour/workoutTourConfig.tsx` and `programTourConfig.tsx` (`shouldStart`), new `src/models/firstUseTips.ts` and `src/components/tipBar.tsx`, tests `test/onboarding.test.ts`, `test/onboardingAnswers.test.ts`, new `test/firstUseTips.test.ts`. Until O1 lands, O2 builds against the contract above with a stub that returns one fixed plan. Design calls: the chip screens, the welcome screen, the plan cards. Runs beside O1.

Group 2, after group 1. Cut buttons and dead ends.

- R1, finish screen cut. Codex. 3 hours. Owner's finish-screen notes, U15. Files: `src/components/screenFinishDay.tsx`, new `src/models/finishDayActions.ts`, new `test/finishDayActions.test.ts`. Lands after review batch I, which also edits the finish screen, or the builder takes batch I's finish-screen hunks too. Swaps `dinohappy.svg` for a bear placeholder, which R5 leaves alone. Runs beside R2, R3, R4.
- R2, tab bar, "+" sheet, workout exit. Opus. 14 hours. Owner's sketch, the notes on the middle tab, the "+", and leaving a workout, plus U34. Files: `src/components/footer2.tsx`, new `src/components/plusSheet.tsx`, new `src/components/addFriendSheet.tsx` (the Add a friend part of `friendsPeople.tsx`, moved), new `src/models/quickActions.ts` and `test/quickActions.test.ts`, `src/navigation/screens/NavScreenFooter2.tsx`, `src/components/screenWorkout.tsx` (the nav left button), `src/components/workoutMenu.tsx` and `src/utils/workoutMenuActions.ts` (hide Show Tour offline, rename Delete), `src/navigation/AppNavigator.tsx` and `AppNavigator.native.tsx` (register the sheets as modals, the My bear placeholder on the `friends` stack). Until B1 lands, the My bear tab shows the old Friends screen under the new name. Design calls: the sheet's look, the Resume state. Runs beside R1, R3, R4.
- R3, Home, and Progress folded into My bear. Codex. 7 hours. Owner's calendar note and sketch, U23, U25. Files: `src/components/screenProgressDashboard.tsx` (drop `ProgressCalendarHeader` and the person icon, add `WeekInsights`, export the body as `ProgressSections` for `screenMyBear.tsx`), new `src/components/screenMyBear.tsx` as a thin shell that renders `ProgressSections` until B1 fills the top, `src/navigation/AppNavigator.tsx` and `.native.tsx` (My bear as the `graphs` root), `src/components/programHistory.tsx` (bear head placeholder, seven dots and day pill in the header, drop `WeekCalendar`, the Run button and `WeekInsights`), new `src/models/weekDots.ts` and `test/weekDots.test.ts`, `src/components/homeChecklist.tsx`, `src/components/dailyChecklistCard.tsx`, `src/models/dailyChecklist.ts` (weekly weigh-in, new titles), new `src/models/todayPill.ts` and `test/todayPill.test.ts` (the "Legs!" text), `test/dailyChecklist.test.ts`. Runs beside R1, R2, R4.
- R4, Food: camera-first "+" flow and the Ami meals section. Codex. 10 hours. Owner's sketch and food note. Files: `src/components/screenFood.tsx` (becomes `journalMeals.tsx`, a section), `src/components/foodDescribePanel.tsx`, `src/components/screenFoodAdd.tsx` (camera first, the Barcode and AI scan toggle, the serving-size step), `src/components/foodSummaryCard.tsx`, new `src/models/foodDescribeEstimate.ts`, new `src/models/foodScanSteps.ts`, new `src/models/foodMealForTime.ts`, new `test/foodDescribeEstimate.test.ts`, new `test/foodScanSteps.test.ts`, new `test/foodMealForTime.test.ts`. The "Share with friends" switch is drawn but disabled until B3. Lands after review batch F, which edits the same food files. Runs beside R1, R2, R3.
- R6, the Journal, Notes and the check-in chart. Opus. 16 hours. Owner's Journal and second-brain notes. Files: new `src/components/screenJournal.tsx` (the day, its sections, the week strip moved from `progressCalendarHeader.tsx`), new `src/components/noteEditor.tsx`, new `src/components/journalMindfulness.tsx`, new `src/models/journalDay.ts` (builds one day from history, food log, music log, stats and notes; pure) and `test/journalDay.test.ts`, new `src/models/checkInTrend.ts` (the 30-day and 90-day score lines, pure) and `test/checkInTrend.test.ts`, new `src/components/checkInChart.tsx` (mounted on My bear through a slot R3's shell leaves), new `src/models/notes.ts` (day links, `[[title]]` parsing, the mood field, the Markdown export) and `src/utils/notesStore.ts`, new `src/models/journalExport.ts` and `test/journalExport.test.ts`, `src/utils/exporter.ts` and `src/models/fullBackup.ts` (the `journal/` files), `src/navigation/AppNavigator.tsx` and `.native.tsx` (Journal as the `food` root), new `test/notes.test.ts`. The "+" Note square from R2 opens the editor. Lands after R4, which turns the Food screen into the meals section. Design calls: the day layout, the mindfulness line. Runs beside R1, R5.
- R7, AI caps and beBEAR+ codes. Codex. 6 hours. Owner's decisions on open sign-up, the 3 a day and 10 a week cap, and pro codes. Files: new migration `supabase/migrations/<date>_ai_caps_and_plans.sql` (`account_plans`, `pro_codes`, `redeem_pro_code`, the new `ai_usage_take` with `kind` and the seven-day window), `api/_auth.mjs` (the `kind` per route, the four cap variables, the 429 body), `api/ai/onboard.mjs` and `api/ai/report.mjs` (their own `kind`), `src/utils/aiRequest.ts` (the cap message), new `src/models/aiCaps.ts` (the message text and the "2 of 3" line, pure) and `test/aiCaps.test.ts`, `src/components/cloudBackupCard.tsx` ("Enter a code", the beBEAR+ line), `src/utils/cloudBackupCommand.ts` (the redeem call), `test/aiAuth.test.ts`. Owner actions: set `AI_DAILY_CAP=3`, `AI_WEEKLY_CAP=10`, `AI_PLUS_DAILY_CAP=30`, `AI_PLUS_WEEKLY_CAP=150` in Vercel, apply the migration, insert the first codes. Runs beside every group 2 batch except R1 and S1's cloud card edits, which it precedes.
- R5, dinosaurs out. Codex plus the owner's art. 3 hours. U29. Files: `src/utils/imagePreloader.tsx` and `.native.tsx`, `src/utils/bundledImagesSvg.native.ts`, `src/components/historyRecordsNullState.tsx`, `src/components/screenProgramSelect.tsx`, `src/components/statsList.tsx`, `src/models/whatsnewParser.ts` or `screenSettings.tsx` (hide Changelog offline), the eight `dino*` files under `/images/`. The tour, unit, equipment and hear-about-us screens keep their dinosaurs, because the offline build never shows them and O2 gates the tours off. Needs the cub still from the art list under The bear first. Runs beside everything in group 2 except R1.

Group 3, after group 2. Sign-in and the look.

- S1, Sign in with Apple and Google on the web. Opus. 10 hours of code, 2 hours of the owner's dashboard work from What the owner sets up. Review S1's sign-up policy. Files: new `src/models/oauthFlow.ts`, new `src/utils/supabaseOAuth.ts`, `src/models/spotifyAuth.ts` (export the PKCE helpers), `src/models/cloudBackup.ts` (parse `pending`), `src/utils/supabaseClient.ts`, `src/components/cloudBackupCard.tsx` (two buttons above the email card), `src/components/onboardingWelcome.tsx` (fill the slot O2 left), `src/index.tsx` (the return branch), tests `test/oauthFlow.test.ts`, `test/cloudBackup.test.ts`. Day-one phone check: Google in the standalone app. Runs beside S3.
- S2, sign-in in the native build. Codex. 6 hours. Files: new `src/utils/supabaseOAuth.native.ts`, `ios/Liftosaur/Info.plist` (URL scheme), the entitlements file for Sign in with Apple, `src/utils/forkServices.ts` (allow the two SDKs offline), `test/forkServices.test.ts`. Needs the friend's team ID. After S1.
- S3, theme and Liquid Glass. Opus. 8 hours. U33's colour part. Files: `src/index.html` (`html.bear` variables, `.glass-bar`), `src/utils/tailwindConfig.ts`, new `src/components/primitives/glassBar.tsx` and `glassBar.native.tsx`, `src/components/footer2.tsx` (use `GlassBar`, after R2), `src/components/foodUi.tsx` (`FoodPrimaryButton` becomes a `kind` on `Button`). Runs beside S1.

Group 4, after group 3. The bear.

- B1, bear core and the top of My bear. Opus. 22 hours. Owner's bear notes and sketch. Files: new `src/models/bear.ts`, new `src/models/bearGrowth.ts`, `src/models/bearTier.ts` (ten levels), new `src/utils/bearStore.ts` (`bebear_bear`, seen flags, honey spent, through `JsonStore_create`), new `src/components/bearSprite.tsx`, `src/components/screenMyBear.tsx` (the top half above `ProgressSections`, the handle as title), new `src/components/bearTv.tsx`, `src/components/programHistory.tsx` (the head in the header), `src/components/screenJournal.tsx` (the small bear in the day header), `src/components/screenFinishDay.tsx` (the celebration), `src/components/screenFriends.tsx` (cut to the feed), new `src/components/handleSheet.tsx` ("Name your bear"), `src/components/shareCards/bearMark.tsx` (level sprite), the 30 level SVGs, the 10 celebration SVGs and the TV under `/images/bear/`, `src/utils/bundledImagesSvg.native.ts`, `src/navigation/AppNavigator.tsx` and `.native.tsx` (Feed and the friends list on the `friends` stack), tests `test/bear.test.ts`, `test/bearGrowth.test.ts`, `test/bearTier.test.ts`. Design calls: the My bear layout, the TV, the animations. Runs alone, because B2, B3 and B4 read its module.
- B2, streaks and badges. Codex. 8 hours. U24. Files: `src/components/screenStreak.tsx` (flame, calendar, badge grid as in `08591160-b714-4cff-b6fb-29a6b9daf569.JPG`), new `src/components/badgeGrid.tsx` and `badgeUnlockedSheet.tsx`, `src/models/bearBadges.ts` (streak and stage badges), new `src/models/badgeCelebration.ts`, `src/models/dailyChecklist.ts` (streak day rule), the 21 PNGs under `/images/badges/`, tests `test/bearBadges.test.ts`, new `test/badgeCelebration.test.ts`. The sheet mounts from `screenMyBear.tsx` through a slot B1 leaves, so it does not touch the finish screen. After B1, beside B3 and B4.
- B3, the TV: lifts and meals in the feed. Codex. 10 hours. U17, U28. Files: `src/models/workoutPost.ts` (summary version 2 with bear, equipped and songs), new `src/models/mealPost.ts`, `src/models/feed.ts` (merge two kinds), `src/utils/feedClient.ts` (the new table and the photo upload), `src/components/friendsFeed.tsx` (two row kinds), `src/components/screenFoodAdd.tsx` (enable the "Share with friends" switch), new migration `supabase/migrations/<date>_meal_posts.sql` (the table, its policies, the `meal-photos` bucket and its policies), tests `test/workoutPost.test.ts`, `test/workoutFeed.test.ts`, new `test/mealPost.test.ts`. After B1, beside B2 and B4.
- B4, honey and the accessory shop. Codex. 9 hours. Owner's accessories note and honey rates. Files: new `src/models/bearHoney.ts` (the five earning rules and the balance), new `src/models/bearAnchors.ts`, new `src/components/bearShop.tsx`, `src/components/bearSprite.tsx` (overlay layer, through a prop B1 leaves), `src/utils/bearStore.ts` (owned and equipped), the 12 item SVGs under `/images/bear/items/`, `src/components/screenFinishDay.tsx` ("+5 honey" line), tests new `test/bearHoney.test.ts`, new `test/bearAnchors.test.ts`. After B1, beside B2 and B3.

Group 5, Winter Arc. Added 2026-10-23. It has a date: W1 must be on the owner's iPhone by 2026-12-05, a week before the event, to leave time for one fix. It needs B1 and B2 merged. It runs beside any group 2 to 4 batch that touches none of its files.

- W2, the Hibernation pass. Codex. 8 hours. The rules under The Hibernation pass. Files: new `src/models/hibernationPass.ts` (`HibernationPass_settle`, `HibernationPass_buy`, the 25 honey price, the hold limit of 2, the 3-day minimum streak) and `test/hibernationPass.test.ts`, `src/models/bearStoreData.ts` (`passes` and `coveredDays`, parsed with the same guards as `spent`), `src/models/dailyChecklist.ts` (`DailyChecklist_doneDays` takes covered days) and `test/dailyChecklist.test.ts`, `src/models/bearHoney.ts` (covered days join the 7-day run and earn nothing) and `test/bearHoney.test.ts`, `src/utils/useBear.ts` (settle on open), `src/utils/useBearBadges.ts` (covered days in the streak), `src/components/screenStreak.tsx` (passes held and the buy row), new `src/components/hibernationWakeSheet.tsx`, `src/components/screenJournal.tsx` (the sleeping bear on a covered day). Art: one sleeping bear still per body stage, 5 files. Lands before W1, because both touch the badge hook.
- W1, The Big Hibernation. Opus. 14 hours. The rules under Winter Arc: The Big Hibernation. Files: new migration `supabase/migrations/<date>_season_events.sql` (the two tables, their policies, `season_event_total`, the 2026 event row), new `src/models/seasonEvent.ts` (the window check, the user's contribution from counted workouts, the day rows to upsert, the reward states, the goal text from `BearComparison_all`) and `test/seasonEvent.test.ts`, new `src/utils/seasonEventClient.ts` (upsert and total), new `src/utils/useSeasonEvent.ts`, new `src/components/seasonEventBanner.tsx`, new `src/components/screenSeasonEvent.tsx`, `src/components/programHistory.tsx` (the banner on Home), `src/components/bearFinishBanner.tsx` (the "+3,100 kg to The Big Hibernation" line), `src/models/bearBadges.ts` (the three event badges) and `test/bearBadges.test.ts`, `src/utils/useBearBadges.ts` (event input), `src/navigation/AppNavigator.tsx` and `.native.tsx` (register the event screen). Art: the banner bear in snow, and three coins plus three item SVGs (beanie, scarf, puffer jacket) under `/images/events/winter-2026/`. Owner action: apply the migration, then set `goal_kg` on 2026-12-05. Design calls: the banner and the event screen. After W2.

Totals: group 1 about 30 hours plus 2 of the owner's, group 2 about 56 hours, group 3 about 24 hours plus 2 of the owner's. Group 4 about 49 hours, group 5 about 22 hours. About 181 hours of code, plus the art.

## 9. Decisions for the owner

Decided on 2026-10-22, from the owner's reply and sketch.

- The "+" sits right of the pill as its own circle.
- The tab bar stays visible during a workout, with a Close chevron as well.
- The tabs are Home, Progress and My bear. Food and Friends have no tab. The feed is the bear's TV.
- Sign-in is built, and skippable while testing.
- Equipment picks are Full gym, Only dumbbells, Street workout bars and No equipment. "At home" means no equipment at all.
- Ten bear levels, with extinct and mythical bears at the top, so nobody finishes in a year.
- The art is generated, with the prompt below.
- The tabs are Home (house), Journal (book) and My bear (the logo), with the "+" at the right. Progress folds into My bear. My bear's title is the bear's name, which is the handle.
- The Journal is the day's log: workout, meals and macros, songs, weigh-in, notes, mindfulness. Many notes a day. Every note is dated and shows the day's workout and meals as chips. Exported as Markdown, one file per day.
- Sharing a meal or a workout with friends is off every time, with a switch the user flips on each post.
- Honey: 5 per workout, 1 for weighing in, 1 per macro in range (protein, carbs, fat), 1 per meal or workout shared with friends, a daily maximum of 10, plus 5 per week of streak.
- Sign-up stays open. Free accounts get 3 AI uses a day and 10 a week, counted over Describe, the photo scan and the warmup. The post-workout report (one per workout) and the onboarding import (3 per account) stay outside the cap. A code from the owner upgrades an account to beBEAR+ at 30 a day and 150 a week.
- All ten levels are drawn now.
- The Journal day has two check-ins: three five-face scales (energy, soreness, overall mood) and one open reflection line.
- The My bear title is the handle by default, and the user can switch it to their name.
- My bear is the bear, how he's doing (the bars and the check-in scores), the dashboard with stats to dive into, and the TV with the feed.
- In version one the check-in scores never change the bear. A later version makes the bear react to them (stretching, yawning, bouncing), possibly as a 3D model. The rules are kept pure so that swap touches only the renderer.

Open for group 5, added 2026-10-23. Each has a default, so W1 and W2 can start without an answer.

- Event dates. Default 2026-12-12 to 2026-12-21, ending on the winter solstice. An earlier window catches more of Winter Arc, but W1 then has less time to land.
- The goal kg. Default: signed-in users times 24,000 kg, set on 2026-12-05.
- The pass price and limit. Default 25 honey, at most 2 held.
- The three reward items. Default beanie, scarf and puffer jacket.

## 10. Art prompt for the owner

Paste this into ChatGPT, with the app icon attached as the reference image. Ask for one image per line of the shot list, same session, so the style holds.

```text
You are designing the mascot for beBEAR, a gym app for 16 to 23 year olds who want to put on muscle the healthy way. The mascot is a bear that is a cute version of the user. It starts as a small cub and grows as the user trains. Every day at the gym earns honey, and honey buys the bear accessories such as caps, headbands, bandanas, chains, headphones, a dumbbell, a protein shaker and a gym bag.

Use the attached app icon as the style reference: round ears, a flat lighter muzzle mask, two flat colours, bold simple shapes, thick clean outlines, no gradients, no texture, no background. The bear must read at 40 pixels and at 400 pixels. Front-facing, standing, centred, whole body in frame, feet on the bottom edge. Friendly eyes, a small smile. Keep the same face and proportions across every image so it is clearly the same bear growing up.

Shot list, one image each, square, transparent background:
1. Cub: small, big head, short legs, stage one.
2. Sun bear: a little taller, same cub face.
3. Black bear: teenage, shoulders starting to show.
4. Brown bear: adult, rounder chest.
5. Grizzly: big shoulders, thick arms, a hump.
6. Polar bear: tall and wide, white fur, same face.
7. Kodiak: the biggest natural bear, heavy and calm.
8. Cave bear: huge, a faint glow, slightly prehistoric.
9. Short-faced bear: towering, long legs, a glow.
10. Ursa Major: a bear made of night sky and stars, the final form.

Then three moods of the Brown bear only, same pose, for me to check: happy (eyes bright, arms slightly out), hungry (looking at an empty honey jar, mouth open), lazy (lying on its side, eyes half closed, a small yawn).

Then the accessories, each alone on transparent background, drawn to fit the Brown bear: a baseball cap, a headband, a bandana, a chain, headphones, a dumbbell held in one paw, a protein shaker, a gym bag over one shoulder.

Then a small cartoon television in the same style, with a blank screen, that the bear would own.

Give every image as a PNG with a transparent background, 1024 by 1024.
```

What to check in the results before handing them to the builders: the face stays the same across all ten, the outline weight stays the same, the feet sit on the bottom edge, and nothing bleeds off the square. The builders trace the chosen PNGs to SVG, so flat colours matter more than detail.

Next action: commit the uncommitted bear and share-card files on `share-cards-bear`, then hand O1 to Opus with this file and `.claude/commands/write-program.md`.
