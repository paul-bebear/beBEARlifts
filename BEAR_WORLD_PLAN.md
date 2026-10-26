# beBEAR world plan

Planning pass of 2026-10-26, revised the same day with the owner's answers. Nothing in this file is built. It follows `REDESIGN_PLAN.md`, whose V1 batches have merged up to master `2fd8e74b` (iOS build 124). Opus 5.5 builds from `HANDOFF-opus-bear-world.md`, which points here. Codex draws from `docs/bear-art/codex/`.

Every pace below assumes the owner's pace for `src/models/bearTier.ts`: 6,000 kg counted per workout, 3 workouts a week, 18,000 kg a week. The female thresholds are 60 percent of the male ones. A female bear at 3,600 kg a workout reaches each level in the same week.

None of the Codex art existed when this was written. `~/Documents/Codex/bebear-art/` is missing. Every art count below comes from the handoffs.

## 1. Frame

- The app is one screen and a "+". The screen is the bear's home. The "+" logs things: food, weight, a run, a workout.
- Every object in the home opens a part of the app. The whiteboard is today's to-do list. The notebook is the Journal. The TV is the friends feed. The bowl is today's food. The passport is the cities. The scale is the weigh-in.
- The door is the gym. Tap it, check your bag, lift in the gym scene, tap the exit, check you racked your weights, and the bear is home again.
- When the user lifts, the app shows the workout screen. When the user runs, the running screen. The rest of the time, the home.
- Two ladders. Lifetime counted kg grows the bear through 12 levels and moves it up the gym ladder: trailer park, discount gym, boutique club, mansion gym, spaceship, Moon, Mars. Active days, which are days with any log, move the house up its own ladder: trailer, apartment, loft, mansion, spaceship cabin, Moon habitat, Mars dome. Neither ladder ever goes down.
- Every training day, which is any counted exercise session, lifts, a run, later boxing, unlocks the paid beBEAR+ features one by one. At 550 training days everything is free for life.
- beBEAR+ is creatine for the bear. Every kg a paying user lifts earns 1.5 XP instead of 1, and every active day counts 1.5. The bear levels up faster and the house arrives sooner. The lifetime kg total never changes, and the leaderboard ranks by kg, so paying never puts anyone above a stronger lifter.
- Honey is earned only. Nothing in the game is bought with money.
- What stays a plain tool: the workout screen, the finish screen, the Journal, Settings and More. Logging a set or a meal never goes through the game.
- What a grandma sees: one room, every object with its name under it, and a "+" button.

## 2. One home and the "+"

The owner's call on 2026-10-26: Home and My bear merge into one screen, the bear's home. The Journal is the notebook on the wall. No tabs at all. The bottom of the screen holds the "+" and nothing else.

The "+" at the bottom.

- The round "+" button alone, bottom right, where it sits today. The glass pill with the tabs goes. `QuickActions_list` in `src/models/quickActions.ts` still returns Food, Weight, Run when `RunSensors_isAvailable()`, and the wide Start or Resume workout bar.
- The way back is the back chevron, the "<" every pushed screen already draws top left. The Journal, the feed, the passport, More and Settings all sit one push above the home, so one tap on the chevron is home. Settings → Graphs is two.
- The "+" stays visible during a workout, as decided in `REDESIGN_PLAN.md`. The workout screen keeps its Close chevron, which pops to the home with the workout still running. The "+" bar then reads "Resume workout".
- `ITab` keeps all seven keys and none has a button. `food`, `graphs`, `friends`, `workout`, `program` and `me` stay registered as stacks that pushes land on, so no `Thunk_pushScreen` call changes. `Screen_tab` in `src/models/screen.ts` is unchanged.
- `src/components/footer2.tsx` keeps only the "+" `Pressable`. `TabButton`, `GlassBar` and `GlassTabLens` leave the file. No `tabBar.ts` module is needed, because a bar with no tabs holds no decision.

The home screen, `screenHome.tsx`, which is today's `screenMyBear.tsx` renamed and mounted as the root of the `home` stack in place of `NavScreenMain`.

- The scene on top: the house with the bear, the whiteboard, and the objects (see The bear's house).
- Under the scene: the W3 season card when it applies, then one row, "More", which opens `reportsHub`. The More list keeps every row it has today, so anything an object opens is also findable by its name.
- The gear top right opens Settings, as today.
- `programHistory.tsx`, today's Home, is retired. Its three parts move: the next-workout card becomes the whiteboard's Train line, the week dots and the History link go to the Journal, and the bear head is the bear.

The whiteboard, drawn by the app on the blank board in the art.

- Three to-do lines from `dailyChecklist.ts`, which already builds Train, Feed the bear and Weigh-in: "Train · Upper" with the day's name from `todayPill.ts`, "Eat · 1,200 of 2,800 kcal", "Weigh-in · Sunday". A done line gets a check mark. The bear scratching it off is a later animation.
- Under them: the weight line, "72.4 kg · +0.8 in 30 d", from today's weight tile, the level line, "Level 5 · 48,000 XP to Strong", and the honest line, "Lifted 310,000 kg since day one".
- Taps: a tap on any to-do line opens the "+" sheet, the same sheet the "+" button opens. The owner wants no second way to do the same thing, and the whiteboard lines are small, so the whole board is one big target for the sheet. The weight line and the level line open the bear panel sheet.
- `src/models/bearBoard.ts` changes from `BearBoard_tiles` to `BearBoard_lines`, which returns each line's text, done flag and target, `plus` or `bear`. `test/bearBoard.test.ts` covers the three states of each line.
- The whiteboard rect is the same in every room and every gym, x 125 to 825 and y 195 to 675 on the 1024 by 1536 canvas, so `BearScene_layout` needs no per-room rect. Codex handoff 10 adds the board to the seven rooms.

The door, and where the scene is.

- The home by default. The gym while a workout is in progress. `BearScene_place(isOngoingProgress)` in `src/models/bearScene.ts` returns `home` or `gym`, and `test/bearScene.test.ts` covers both.
- The door in the room is labelled "Gym". A tap opens the bag check sheet: the day's workout name, "Push day · 5 exercises · about 45 min", and a short list of things to bring, built from the day's exercises. Water always. A belt when the day has a squat or a deadlift at 80 percent of the best or more. Straps when it has a row or a deadlift. Shoes when it has a run block. The user taps "Let's go", and the workout starts through the same branch as the "+" bar's Start workout. Each item is a tick box, and the ticks are not stored. "Skip the check" under the list turns the sheet off for good in Settings.
- The "+" bar's Start workout shows the same sheet, so the door and the "+" are one flow with two entrances, and the sheet is the only place the checklist lives.
- While the workout runs, the scene is the gym with the `lift-<size>` sprite, the whiteboard shows the same lines, and the workout screen is one push above it. The Close chevron on the workout screen lands on the gym scene.
- The gym has an exit door, labelled "Exit". A tap opens the exit sheet: "Racked your weights?", "Cooled down?", then "Finish workout", which runs the finish the way the workout screen's Finish does today, and the finish screen follows. The exit sheet and Finish on the workout screen are again one flow with two entrances.
- A rest day tap on the door opens the same bag check with "Rest day · next: Pull on Thursday" and a "Train anyway" button.
- `src/models/gymBagCheck.ts` builds the list from the planned day and the user's history, `GymBagCheck_items(day, history, settings)`, and `test/gymBagCheck.test.ts` covers the belt, strap, shoes and water rules and the rest day. `src/models/gymExit.ts` holds the exit lines and `GymExit_sheet(progress)`, with `test/gymExit.test.ts`.
- The bear walking down the street between the door and the gym is an animation for later. A restaurant scene is parked, as the owner said.

Where every current screen goes.

- Home: retired into the home screen.
- My bear: becomes the home screen.
- The Journal: the notebook. It keeps `screenJournal.tsx`, the `food` stack, the week strip, the month calendar, and the day with meals, weigh-in, the workout card, notes, songs and check-in. Today's "+" Food scan still returns to the Journal day, so the user sees the meal land, then Home.
- Food: the bowl opens the Journal on today with the Meals section scrolled into view. The "+" Food square opens the scan.
- The feed, the friends list and Add a friend: the TV. An empty TV opens Add a friend.
- Honey and badges: the honey jar and the trophy shelf. Until they arrive, More.
- Workout history: the Journal's calendar, and More → Exercise stats.
- Program editing: More's program card, as today.
- Settings: the gear.
- Graphs, measurements, body composition, steps, runs, reports, music: More, and the objects that arrive later.

## 3. The bear's house

The home screen is the house. Objects are the navigation. The three layers become: the room shows what the user has, More lists everything, and objects that have not arrived are not drawn.

The rules.

- Every object shows its name in a small pill under it, always. A tap on the object or the pill opens the same thing. Hit boxes are at least 44 pt.
- An object that has not arrived yet is not drawn. One cardboard box stands by the door with the next object's name and the active days left: "Calendar · 3 active days". Codex handoff 10 draws the room both ways, hidden with one box and padlocked, so the owner picks on a picture. The plan assumes hidden.
- An arrival plays once: the box shakes, opens, the object slides to its place, the pill reads "New". The seen flag goes in `bebear_bear`, so a restored backup shows no second arrival.
- Objects have states drawn from today's data, from the same sources as the whiteboard: history, the food log, stats, notes, badges, honey, the feed cache, the passport.
- The house shows no beBEAR+ upsell. The creatine tub is the one object that names beBEAR+, and it appears only for a paying account.
- `src/models/bearHouse.ts` owns it: `BearHouse_objects(houseTier, activeDays, sources, seen)` returns each object's id, image, label, state, target and canvas rect, and `BearHouse_nextBox(activeDays)` the box. `test/bearHouse.test.ts` checks every object has a label, no object is drawn before its day, and the day-0 room has exactly the seven objects below.
- `bearHouseScene.tsx` draws the room, the whiteboard lines, the objects, the bear with `BearScene_layout`, the pills and the box. It holds the arrival animation and nothing else.
- Object positions per room live in `images/bear/house/manifest.json`, measured once per room, the way `bearScene.ts` keeps the sprite boxes. The floor from x 180 to 844 and y 930 to 1510 is the bear's.

Day 0, the trailer. Eight objects, all there from the first open. The owner wants the passport and the TV from the start, and the room must be the whole app on day one.

- Whiteboard. The to-do list above. Any to-do line opens the "+" sheet.
- Door, labelled "Gym". Opens the bag check sheet, then the gym. In the gym scene the same spot is the exit door, labelled "Exit", which opens the exit sheet.
- Food bowl. Opens the Journal on today's meals. States: `bowl-empty` under 25 percent of the kcal target, `bowl-half` to 75 percent, `bowl-full` above. In bulk season after 18:00 an empty bowl's pill reads the W3 number: "900 kcal left".
- Bed. Opens the bear panel sheet: mood line, level bar, fullness and the Rested bar. States: `bed-small` to house tier 3, `bed-big` from the mansion. The bear lies on it when tired, and sleeps on it on a Hibernation pass day (W2).
- Notebook. Opens the Journal on today. States: `notebook-closed` with no note today, `notebook-open` with one.
- TV. Opens the feed. States: the latest friend post's photo on the screen through the transparent screen area, `tv-crt` in the trailer and apartment, `tv-flat-small` in the loft, `tv-flat-big` in the mansion, `tv-hologram` from the spaceship. Empty: static and the pill "No friends yet", which opens Add a friend.
- Passport. Opens the passport (see City passport). States: closed with no stamp, open with the last stamp showing. Empty pill: "Stamp your first city". Arrives with batch C1, so until then the trailer has six objects.
- Scale. Opens `stats` with weight first. State: the latest weight on its display. Empty: "Weigh in".

Arrivals, by active days. An active day is a day with a counted training session, a food entry or a weigh-in. A daily logger earns 30 a month. A 3-a-week lifter who logs no food earns 13.

- Wall calendar, 3 active days. Opens the Journal's month calendar. State: the streak number drawn on it from `DailyChecklist_streak`.
- Boombox, 7 active days. Opens More → Workout music. Shown only when `isOffline`. State: a note icon bouncing while a workout with kept songs runs.
- Honey jar, 14 active days. Opens the honey sheet with the honey earned since day 1: "Your bear saved 60 honey for you." States: `honey-jar-empty` at 0, `honey-jar-half` under 50, `honey-jar-full` from 50.
- Trophy shelf, 30 active days, the move to the apartment. Opens the badge grid. States: `trophy-shelf-empty`, `trophy-shelf-some` to 9, `trophy-shelf-full` from 10.
- Wardrobe, 30 active days. Opens the shop from PR 105. States: `wardrobe-closed` with nothing owned, `wardrobe-open` with one outfit. Empty pill: "Buy your first outfit · 20 honey".
- Mirror, 100 active days, the move to the loft. Opens progress photos. State: the latest photo blurred in the mirror, only on the user's own phone.
- Creatine tub, any day, only while the account is plus. Opens the beBEAR+ screen. Pill: "beBEAR+ · house ×1.5".
- Desk, 250 active days, the move to the mansion. V2 after the free ladder exists. Opens the beBEAR+ screen with the earned list.

What stays off the walls: check-ins, body composition, steps, runs, reports, seasons. More keeps them.

## 4. The ladders

Two ladders, as the owner decided. The gym follows bear XP, which is lifetime counted kg with the creatine boost, through the levels in `bearTier.ts`. The house follows house XP, which is active days with the same boost. Lifetime kg itself is a third number, never boosted, and it is the one the leaderboard and the comparisons use. A heavy lifter who logs nothing else has a big bear in a trailer. A daily food logger who lifts light has a cub in a loft. Both are true.

The gym ladder, with the week a free 3-a-week lifter reaches each level. The thresholds are in XP, which equals kg for a free user. A paying user reaches each level in two thirds of the time: level 9 in week 34 instead of week 50.

- Level 1 Cub, 0 kg, day 0. Trailer park.
- Level 2 Teen, 5,000 kg, workout 1, day 1. Trailer park.
- Level 3 Amateur, 25,000 kg, workout 5, week 2. Trailer park.
- Level 4 Rookie, 60,000 kg, workout 10, week 4. Discount gym.
- Level 5 Regular, 120,000 kg, workout 20, week 7. Discount gym.
- Level 6 Strong, 220,000 kg, workout 37, week 13, month 3. Boutique club.
- Level 7 Athlete, 380,000 kg, workout 64, week 22, month 5. Boutique club.
- Level 8 Power, 600,000 kg, workout 100, week 34, month 8. Mansion gym.
- Level 9 Titan, 900,000 kg, workout 150, week 50, month 12. Mansion gym.
- Level 10 Astronaut, 1,400,000 kg, workout 234, week 78, month 18. Spaceship.
- Level 11 Lunar, 3,500,000 kg, workout 584, week 195, year 3.75. Moon base.
- Level 12 Mars, 7,000,000 kg, workout 1,167, week 389, year 7.5. Mars dome. The owner's ladder ends at the Moon. Mars stays as the level that always shows a next step.

The `gym` values in `bearTier.ts`: `trailer-park` for 1 to 3, `discount-gym` for 4 to 5, `luxury-club` for 6 to 7, `mansion-gym` for 8 to 9, then `spaceship`, `moon-base`, `mars-dome`. Handoff 06 keeps the old space gyms if the new ones look worse, so the last three names follow whichever files win.

The house ladder, in active days, with the month a daily logger reaches it, then a 3-a-week lifter who logs no food.

- Trailer, 0. Day 0.
- Apartment, 30. Month 1, or month 2.3.
- Loft, 100. Month 3.3, or month 8.
- Mansion, 250. Month 8, or year 1.6.
- Spaceship cabin, 500. Month 17, or year 3.2.
- Moon habitat, 1,000. Year 2.8, or year 6.4.
- Mars dome, 2,000. Year 5.5, or year 13.

`src/models/houseTier.ts` holds the thresholds, `HouseTier_for(activeDays)`, `HouseTier_progress(activeDays)` with the days to the next room, and `HouseTier_activeDays(history, foodLog, stats, boostedDays)`. `test/houseTier.test.ts` covers the thresholds and the boost.

The creatine boost, as the owner set it on 2026-10-26: beBEAR+ makes the bear a bit bigger and stronger a bit faster, the way creatine does, and it never changes what was lifted.

- Bear XP: each counted workout's kg, times 1.5 when the workout's day falls inside a paid month. `BearTier_for` reads XP. A free user's XP equals their kg, so nothing changes for them.
- House XP: each active day, times 1.5 inside a paid month. A daily logger on beBEAR+ reaches the apartment on day 20 and the loft in month 2.2.
- Lifetime kg: the plain sum of counted kg, never boosted. It is the whiteboard's "Lifted 310,000 kg" line, the finish screen's "+3,100 kg", the comparisons in `bearComparison.ts` ("you lifted the ISS"), the squad whiteboard and the leaderboard.
- Honey and the free ladder are not boosted. Honey is earned only, and paying to pay less sooner is a loop the paywall cannot explain.
- Paid days come from `store_entitlements` through `AccountPlanStore`, kept on the phone with the plan. XP earned in a paid month stays after the subscription ends, because levels never drop.
- Why 1.5 and not 1.1: at 1.1 a paid month at 3 lifts a week adds 1.3 days of house progress and one workout's worth of XP, which no user would ever see. At 1.5 a paid user reaches level 9 in week 34 instead of week 50, which a user can feel and which sells.
- Friends' bears on the TV show the level, so a paid bear can look bigger than a free bear with the same lifts. The leaderboard next to it ranks by kg, so the stronger lifter is still first. The owner accepts that split; Liftoff sells the same XP boost.

`src/models/bearXp.ts` owns the boost: `BearXp_fromWorkouts(workouts, paidDays)` and `BearXp_activeDays(days, paidDays)`, with `test/bearXp.test.ts` covering a free user, a user paid for one month in the middle, and a lapsed user. `bear.ts` passes XP to `BearTier_for` and keeps `growthKg` as the honest total.

The first week in the trailer park, workouts 1 to 3.

- Day 0: six objects, the whiteboard with three open lines, a box that says "Calendar · 3 active days". The bear is a cub on a floor mattress in a trailer with a lamp. The gym outside has the cement-bucket barbell and the lawn chair.
- Workout 1: level 2 on the finish screen, the first level badge, the gym scene for an hour. The level bar reads "25,000 kg to Amateur".
- Day 3 of logging: the calendar arrives. Day 7: the boombox. Day 14: the honey jar with two weeks of honey in it.
- Week 2: level 3. Week 4: level 4 and the discount gym. Day 30: the apartment, the shelf and the wardrobe.
- That is 3 level-ups, 3 arrivals, one gym move and one house move in the first month. The trailer park's job is to be funny: the lawn chair, the tire, the swing-set pull-up bar. "Funny and scrappy, never sad" is the acceptance test for the art.

The moving-day card shows on the finish screen for a gym move and on the next open for a house move: "Moving day! Your bear moved to the apartment."

## 5. Unlocks and money

Free for life, never behind anything: workout logging, food logging, runs, notes, the bear, the house, honey, badges, the passport, furs and lines.

The unit of use: training days. A training day is a day with at least one counted exercise session. Three kinds count, one day counts once.

- A counted workout under `bearGrowth.ts`: at least 10 minutes, one completed set.
- A recorded run from `runLog.ts` of at least 10 minutes.
- Later, an activity entry: boxing, a class, a swim, logged from a new "Activity" square in the "+" sheet with a name and minutes, at least 10 minutes. Batch A1.

A lifter who lifts 3 days, runs 2 and boxes 2 earns 7 training days a week, as the owner said. `src/models/trainingDay.ts` holds the rule, `TrainingDay_days(history, runs, activities)` returns the set of days, and `test/trainingDay.test.ts` covers the three kinds and the one-a-day rule. The free ladder, the price ladder and honey's workout rule all read this one set.

Why training days and not kg. Levels reward volume. A light lifter who shows up 4 days a week would reach level 9 a year after a heavy lifter on the same days. Showing up is what the owner pays for. One a day stops a user from logging ten short sessions.

The features, today and proposed.

- Today, from `plusAccess.ts` and commit `f73317cc`: the AI allowance of 30 a day and 150 a week (free is 3 and 10), Week Insights, muscle views, trend lines, API and MCP keys.
- Proposed: Bear coach, an AI monthly review of the logs that adjusts next month's plan text through `BearPlan_text`. One AI call a month.
- Proposed: the computer dashboard, the web app's wide read-only layout.
- Proposed, V2 later: recovery sync from the watch, Whoop or Oura into the Rested bar.
- The creatine boost on bear XP and house XP, above. It is the subscription's one game benefit and the paywall's first line: "Creatine: your bear grows 1.5× faster."
- Never: anything that logs, anything cosmetic, anything the house shows, and never the kg total or the leaderboard.

The leaderboard, V2, batch L2. The owner wants one, ranked by lifetime counted kg, never by level or XP.

- Friends only by default, with a second list for the gym group once gyms as groups exist. No global list, because a global list of teenagers' lifts invites fake logging and the anti-cheat caps are built for one bear, not a prize.
- Sign-in and an opt-in switch, "Show me on the leaderboard", off by default. A user who is off still sees the list.
- One Supabase view over `counted_days`, `leaderboard_kg(user_id, total_kg)`, readable through the friends policy from batch E. Nothing new is written.
- The list is a row under the TV's feed, and a tab in the squad screen later. Each row shows the bear at its level, the handle and the kg. A paid bear can look bigger than the bear above it, and the kg says who lifted more.

The unlock order, cheapest for the owner first, with the month a 3-a-week lifter (13 training days a month) reaches it. A lifter who also runs twice a week (22 a month) reaches each one in 60 percent of the time.

- Trend lines: 30 training days, month 3.
- Muscle views: 60, month 5.
- Week Insights: 100, month 8.
- AI step one, 10 a day and 50 a week: 150, month 12.
- API and MCP: 200, month 16.
- Bear coach: 300, month 23.
- Computer dashboard: 400, month 31.
- Full AI allowance, 30 a day and 150 a week, and with it everything: 550, month 42, year 3.5. At 7 training days a week it is month 18.

After the last unlock the account is plus for life with grant `earned`. The paywall never shows again. The Settings row reads "beBEAR+ · earned for life". The creatine boost ends with the last paid month, because there is nothing left to pay for. A "support us" lifetime thank-you offer at that point is the owner's later idea and is not planned here.

What AI costs the owner per long-time user. The routes in `api/_ai.mjs` run `anthropic/claude-haiku-5.5` through the Vercel AI Gateway. Haiku 5.5 costs $0.10 per million input tokens and $0.50 per million output tokens. `gemini-flash-lite-latest` is the other path at a similar price.

- One meal photo at 1024 px is about 1,500 image tokens, plus about 1,000 tokens of prompt and 300 of answer. That is $0.0004 a use.
- At the full cap, 150 a week is about 650 a month: $0.26 a month at the most. That is 650 meal scans. A user who scans every meal uses about 90.
- A heavy real user, 60 scans a month: $0.03.
- The owner's call: the full paid allowance at the end, cap unchanged. The cap bounds the cost.
- If the model ever moves to Sonnet at $2 and $10 per million, the same cap costs $5 a month at the most. The thresholds stay, the model is the knob.

How it fits the price ladder, lifetime and a returning user.

- The price ladder prices the month: $6.99, or $3 and $1 through promotional offers after 1 to 3 short and 4 or more training days a week. It stays as planned in batch L1, reading `trainingDay.ts`. Both ladders read the same `counted_days` rows.
- The paywall lists only the features still locked for this account plus the creatine line. The yearly price hides once fewer than three features remain.
- Lifetime at $79.99 is unchanged. A lifetime buyer has the boost for life.
- A user who stops paying for a year and comes back keeps every unlock, because `counted_days` rows never leave. The first month back costs $6.99, because last month had 0 training days.
- A subscriber who earns everything: Apple does not let a developer cancel a subscription for the user, and neither does RevenueCat. The app shows one card on every open until the subscription ends: "You earned beBEAR+ for life. Cancel your subscription so you stop paying." with the button opening RevenueCat's `managementURL`, which is Apple's subscriptions page. The webhook's `CANCELLATION` and `EXPIRATION` events clear the card through `Billing_refresh`.

The App Store check.

- Guideline 3.1.1 requires in-app purchase for unlocking features and bans "mechanisms to unlock content or functionality, such as license keys, augmented reality markers, QR codes". The free ladder counts workouts logged in the app, so there is nothing outside Apple to bypass. Progression unlocks are how every game ships levels. The owner's code field stays hidden in App Store builds.
- Guideline 3.1.2(a) requires an auto-renewing subscription to give ongoing value and to be cancellable by the user, and leaves renewal with the user. So "a subscription that ends itself" cannot exist on Apple. The cancel card above is what Apple allows. A subscription benefit that is a progress multiplier is ordinary in games.
- The $1 and $3 months are promotional offers for existing subscribers, which is what Apple made them for. They need the signed-offer route from L1.
- RevenueCat: the entitlement `plus` stays attached to the three products. The earned state is beBEAR's, in Supabase. `account_plan_effective` gains a `grant` value `earned` and an `unlocks` list. `PlusOffer_reduce` takes `earned` and never presents the paywall for an earned account.

## 6. What to take from Torn

Torn's loops, with the owner's rule applied: skip anything that rewards unhealthy training or punishes rest.

- The property ladder, Shack to Private Island, 14 standard properties. Each has a base happy from 100 to 2,000 and an upkeep cost. Take the ladder as the house, keyed to active days. Skip upkeep: a bill for missing a week punishes rest. Skip happy: the bear's mood already does that job.
- Gyms that unlock as you train. Torn opens the next gym after a set amount of energy spent, 200 for Average Joes up to 4,000 for Global Gym. Each gym also charges a membership fee. Take it as the gym ladder keyed to counted kg, which it already is. Skip the fee and the specialist gyms.
- Energy that refills over time, 5 every 15 minutes to a cap of 100. Change it. Spending energy to train rewards logging many sessions a day. The bear's `energy` in `bear.ts` runs the other way: it falls with days away and refills with a workout. Keep that, rename the bar "Rested" in the bed sheet, so a rest day reads as the bar refilling.
- Education courses that take real days. Take it as "Bear school", V2: a course is 5 to 14 daily steps built from PR 111's exercise demos and `describe-technique` content, one step a day, enrol in one at a time. Finishing gives a badge and a wardrobe item. It rewards learning on rest days.
- Factions. Change it to squads, as decided on 2026-10-22: at most 8 people, a shared goal in kg, no ranking. Gyms as groups are the second kind of squad.
- Travel to other countries. Take it as the city passport, from day 0.
- Missions. Take a small version: one weekly ask from the bear, "Log 3 meals this week", set from what the user did least last week, paying honey at the daily cap. V2.
- Awards and merits. Already badges.
- Donator status that raises the energy cap for money. Changed: beBEAR+ is creatine, a 1.5 boost on XP, never on the kg total or the leaderboard.
- Hospital, jail, crimes, the stock market, the casino, the bazaar. Skip. Punishment, money and gambling, for teenagers.
- Mail and forums. Skip. The feed exists.

## 7. City passport

The passport lies in the trailer from day 0. A workout in a new city stamps it.

Detection.

- iPhone only in this version. A stamp earned on the phone shows on the web through the backup.
- One location fix at Finish of a counted session, never at start and never in the background. `CLLocationManager` with when-in-use permission and `kCLLocationAccuracyReduced`, Apple's city-scale approximate location, which shows an approximate circle in the permission prompt. The runs feature from `a322016d` already holds the when-in-use string in `ios/Liftosaur/Info.plist`, and its native bridge is the pattern to copy. A run that already has GPS points uses its own last point and asks for nothing.
- Reverse geocoding on the device through `CLGeocoder`, keeping `locality` and `isoCountryCode` only. Apple's geocoder does call Apple's servers; the privacy text says so.
- The app stores `city: { name: "Paris", country: "FR" }` on the `IHistoryRecord` and on the run record. No coordinates. The field goes into the full backup and the cloud backup like the rest of the record.
- A fix older than 10 minutes or missing is no stamp. The workout saves as normal.

Opt-in.

- Off by default. The first Finish shows one sheet: "Stamp your passport? beBEAR reads your city when you finish a workout. Only the city name is saved, and only you see it." Buttons "Stamp it" and "Not now". "Not now" is asked again never; the passport's pill offers it.
- Settings → Privacy → City passport, a switch. Turning it off deletes every `city` field through `CityPassport_clear` and the next backup carries the deletion.
- A second switch, "Show my city to friends", off by default, adds the city to `IWorkoutPostSummary` as version 3. Without it the feed never sees a city.
- Under 16 in the EU and under 13 in the US the sheet is the same, because a city name on the user's own phone is the user's data and no third party receives it. No account is needed.

The stamp.

- One stamp per city, earned by the first counted session there. A visit count per city, at most one a day. The home city is the one with the most sessions, stamped too, titled "Home gym".
- Art: the 32 stamps from handoff 08 by file name. Any other city gets the generic stamp with the city name drawn by the app.
- Badges in `bearBadges.ts`: First trip at 2 cities, Globetrotter at 5, World tour at 10.
- The finish screen adds one line: "New stamp: Paris".
- Honey rules do not change. A stamp earns no honey, so a spoofed location buys the user's own stamp and nothing shared.

The postcard: a share card with the bear sprite in front of the city art and the stamp in the corner, "First workout in Paris". The 8 postcards from handoff 08 by city, the stamp on a plain card for the rest. Shared through `shareCardExport.ts` only when the user taps Share.

Anti-cheat. The fix comes from the OS at Finish while the app is in the foreground. The app never accepts a typed city. A stamp needs a counted session. Spoofing on a jailbroken phone changes the user's own passport and nothing shared, so there is no server check.

The App Store privacy label.

- Data type: Location, Coarse.
- Linked to the user, used for app functionality, optional.
- Stored on the device and in the user's own backup.
- Shared with friends only when the second switch is on.

Gyms as groups, V2 after squads.

- On the stamp sheet the user may type the gym's name once, "Basic-Fit Alicante". That makes a group keyed by city and name. A table `gym_groups` and a membership table with the friends-read policies from batch E, block and report included.
- "How much can your gym lift": the sum of counted kg of members this month, on the gym's page and as a whiteboard goal. No location polling, no map of members, no ranking of people.
- Needs sign-in and the passport switch on. Nobody sees another user's city unless that user turned on the friends switch.

## 8. Personalisation

What exists: the anthro male and female lines, 28 sprites each in brown under `images/bear/male/` and `images/bear/female/`, with their visible boxes in `bearScene.ts`. Black and polar fur for both are in Codex handoff 09, 112 sprites, the one production set so far.

The model: line, fur, name.

- A line is a silhouette. It costs 28 sprites per fur, a row of visible boxes in `bearScene.ts`, and 24 wardrobe renders per fur once outfits ship.
- A fur is a recolour of a line. It costs 28 sprites and no boxes, because handoff 09 keeps the feet and the box within 6 px.
- The owner's call: make many lines with the spare Codex budget, try them all, drop the bad ones. Codex handoff 11 does that at 3 sprites per candidate, levels 1, 5 and 10, so twelve candidates cost 36 images, and only the keepers get their 28.
- One render style per app still holds for the shipped set. Friends' bears share one TV, so a chibi bear beside a photoreal bear reads as two apps. The candidates in handoff 11 are drawn in the current 3D film render, in different silhouettes.

The twelve candidates in handoff 11.

- Four-paw lines: chonk, grizzly, a female bear, a polar bear.
- Anthro lines: panda, sun bear, a skinny-to-huge "gym rat", an old-timer with a grey muzzle, a plush toy bear.
- Odd ones: a human body with a bear head, a person in a bear-ear hoodie, a cub that stays small and gets strong.
- The owner picks on the contact sheet.

What ships, in order.

- Black and polar fur for the two anthro lines: 112 sprites, handoff 09, V1, free for everyone.
- The keepers from handoff 11: 28 sprites each in brown, then 56 more for black and polar. V2, with batch P1.
- Wardrobe: 24 renders per line per fur. V2 after the furs. Accessories stay collectible icons until then.

Where the choice lives: `bebear_bear` gets `fur` next to `line` in `bearStoreData.ts`, parsed with the same guards. `BearArt_sprite(line, fur, level, mood)` builds `/images/bear/<line>-<fur>/<name>.webp`, with brown at the old path so no shipped bear moves. Until P1, Settings → Your bear offers line and fur.

## 9. The ad

A 30 to 45 second Instagram Reel, vertical, from the 16 keyframes in handoff 05. Captions are set in editing. Spoken lines are the two bears only. Each shot names the feature the composited phone screen shows, if any.

- Shot 1, the door, 2.5 s. Caption: "Day one." No feature.
- Shot 2, the paw, 2 s. Big Bear: "Hey." No feature.
- Shot 3, Big Bear, 2 s. Big Bear: "First time?" No feature.
- Shot 4, doors open, 2.5 s. Caption: "beBEAR". No feature.
- Shot 5, the crowd, 3 s. Caption: "Everyone in here started somewhere." No feature.
- Shot 6, scared, 1.5 s. No caption.
- Shot 7, the clang, 1.5 s. No caption.
- Shot 8, the kneel, 3 s. Big Bear: "Don't worry, son. I'll show you the ropes." No feature.
- Shot 9, the phone, 2.5 s. Big Bear: "Pick your bear." Phone: the Pick your bear cards, then "Where do you train?" with three chips. Feature: first run in three taps.
- Shot 10, first squat, 3 s. Big Bear: "Three sets. That's it." Phone: the whiteboard with "Train · Full body" and the "+". Feature: the plan from the three answers.
- Shot 11, log set, 2 s. Caption: "Tap. Logged." Phone: the set row turning green, the plates line. Feature: set logging, free forever.
- Shot 12, the meal, 3 s. Big Bear: "Snap your plate." Caption: "Photo to protein in 3 seconds." Phone: the scan result, then the bowl filling. Feature: the food scan.
- Shot 13, mirror week 1, 2 s. Caption: "Week 1." Phone: the cub in the trailer. Feature: the bear.
- Shot 14, mirror month 3, 2.5 s. Caption: "Month 3." Phone: the level 6 bear in the loft, the moving-day card. Feature: the two ladders.
- Shot 15, high five, 2.5 s. Caption: "Your bear grows when you do." Phone: the level-up card. Feature: the daily loop.
- Shot 16, full circle, 3 s. The fitter Little Bear to a new cub, the same framing as shot 2: "Hey. First time?" Caption: "Bring a friend." Feature: the invite link.
- End card, 2 s: the bear logo, "beBEAR. Free. Forever.", the App Store badge.

That is 41 seconds. The cut to 30 seconds drops shots 3, 6 and 7 and halves shot 5. The last spoken line is the first spoken line. The invite is the only call to action, because the app is free and the ad never says a price.

## 10. V1 and V2

V1 keeps the rule from `REDESIGN_PLAN.md`. A change ships in V1 when it fixes a bug or finishes a core flow. A data-only swap the owner already decided ships in V1 too. Everything else is V2. The owner's one-home decision moves the house to the front of the app, so the house scene is V1 and its ladder is V2.

V1.

- One home and the "+": the bar, the home screen, the whiteboard lines, the retired Home screen.
- The house scene with the day-0 objects and the home-or-gym rule. Rooms at one tier, the trailer, until the ladder lands.
- The gym ladder as a `gym` field change once handoff 06's art exists.
- Black and polar fur, handoff 09.
- The ad.

V2.

- The house ladder on active days, the arrivals, the box, the moving-day card, the creatine boost on both XP numbers.
- The leaderboard by lifetime kg, friends first.
- The free ladder, phone and server, and the training-day rule that counts runs.
- Activities: boxing and the rest in the "+" sheet.
- The city passport, the postcards, the three badges. Gyms as groups after squads.
- Bear school, the weekly ask, the Rested rename.
- The line keepers from handoff 11, P1's picker with a fur row, the wardrobe renders.
- The desk object and the computer dashboard. Recovery sync.
- Already V2 from the last plan and unchanged: W1, W2, W4, L1, the Apple Watch ideas.

## 11. Build batches

Every batch: goal, files, pure modules and tests, Opus or Codex, hours, and what runs beside it. "Codex" means the batch is specified here. "Opus" means it holds design calls. Hours assume the art is on disk; waiting for art is not counted. `HANDOFF-opus-bear-world.md` is the brief for group A.

Group A, V1. G1 and G2 run beside each other now. T3 runs beside them. H1 follows T3.

- G1, the gym ladder. V1. Codex. 2 hours if handoff 06's seven files pass their check images, 4 if the whiteboard rect has to move for one gym. Files: `src/models/bearTier.ts` (the `gym` values), `images/bear/gyms/trailer-park.webp`, `discount-gym.webp`, `luxury-club.webp`, `mansion-gym.webp`, the three space gyms only if their notes say they beat the old ones, converted from 1024 by 1536 PNG with the same `cwebp` settings as the current files, `src/utils/imagePreloader.tsx` and `.native.tsx`, `test/bearTier.test.ts`. No new module: `BearArt_gym` already reads the field.
- G2, black and polar fur. V1. Codex. 5 hours. Files: `src/models/bearStoreData.ts` (`fur`, parsed like `line`) and `test/bearStoreData.test.ts`, `src/models/bearArt.ts` (`BearArt_sprite` and `BearArt_cardSprite` take the fur, brown keeps the old path) and new `test/bearArt.test.ts`, `src/models/bearScene.ts` (the visible-box key drops the fur, the manifest test covers the four new folders), `images/bear/male-black/`, `male-polar/`, `female-black/`, `female-polar/` (28 webp each), `src/components/screenSettings.tsx` (a "Your bear" row with line and fur), `src/components/shareCards/bearMark.tsx`, `src/models/workoutPost.ts` (the fur in summary version 3, old posts read as brown) and its test.
- T3, one home. V1. Opus. 14 hours. Files: `src/components/footer2.tsx` (the "+" alone; `TabButton`, `GlassBar` and `GlassTabLens` leave the file, and `src/models/tabBarLayout.ts` loses the pill width if nothing else reads it), `src/components/screenMyBear.tsx` renamed `screenHome.tsx` and mounted as the `home` root in `src/navigation/AppNavigator.tsx`, `.native.tsx` and `src/navigation/screens/NavScreenHome.tsx`, `src/components/programHistory.tsx` and `src/components/homeChecklist.tsx` (deleted), `src/models/bearBoard.ts` (`BearBoard_lines` from `dailyChecklist.ts` and `todayPill.ts`, targets `plus` and `bear`) and `test/bearBoard.test.ts`, `src/components/bearScene.tsx` (lines with check marks in place of tiles, a line tap opens `plusSheetModal`), `src/models/bearScene.ts` (`BearScene_place`) and `test/bearScene.test.ts`, `src/models/journalDay.ts` (the week dots and History link in the Journal header) and its test, `src/components/screenJournal.tsx`, `src/components/seasonNudgeCard.tsx` (mounted under the scene), `src/models/screen.ts` (the `main` screen name maps to the home), `scripts/lint-views-baseline.json` (drop the deleted files' entries). Design calls: the whiteboard typography. The old `BearScene` gym stays as the scene until H1.
- H1, the house scene and the door. V1. Opus. 22 hours. After T3. Files: new `src/models/bearHouse.ts` (the day-0 objects, states, targets, the arrivals table with the active-day thresholds but every object drawn at tier 1 until H2 turns the gate on) and `test/bearHouse.test.ts`, new `images/bear/house/manifest.json`, new `src/components/bearHouseScene.tsx`, `src/components/screenHome.tsx` (the house scene on top, `BearScene_place` picks house or gym), new `src/models/gymBagCheck.ts` and `test/gymBagCheck.test.ts`, new `src/models/gymExit.ts` and `test/gymExit.test.ts`, new `src/components/gymBagCheckSheet.tsx` and `gymExitSheet.tsx`, `src/components/plusSheet.tsx` (Start workout opens the bag check), `src/models/quickActions.ts` (the workout action gains `bagCheck`) and its test, `src/components/screenWorkout.tsx` (Finish runs the same finish as the exit sheet, one function in `src/utils/workoutMenuActions.ts`), `src/components/screenSettings.tsx` (the "Bag check before a workout" switch), `src/models/featureLayer.ts` (`FeatureUnlock_activeDays(feature)`) and new `test/featureLayer.test.ts`, `src/models/bearText.ts` (the pills' empty lines) and its test, `src/utils/imagePreloader*.tsx`. Art: handoff 07's objects, handoff 10's rooms with the whiteboard and the two doors. Design calls: the pill style, the object layout per room, the two sheets.

Group B, V2, after group A. H2 and U1 run beside each other.

- H2, the house ladder and creatine. V2. Codex. 12 hours. Files: new `src/models/bearXp.ts` (`BearXp_fromWorkouts`, `BearXp_activeDays`, the 1.5 on paid days) and `test/bearXp.test.ts`, `src/models/bear.ts` (XP to `BearTier_for`, `growthKg` kept honest) and `test/bear.test.ts`, `src/models/bearText.ts` (the XP line and the Lifted line) and its test, new `src/models/houseTier.ts` (thresholds, `HouseTier_for`, `HouseTier_progress`) and `test/houseTier.test.ts`, `src/models/bearHouse.ts` (the gate on, `BearHouse_nextBox`) and its test, `src/models/bearStoreData.ts` (`seenObjects`) and its test, `src/models/bearCelebration.ts` (the moving-day line) and its test, `src/components/bearHouseScene.tsx` (the box and the arrival animation), `src/models/accountPlan.ts` (`paidMonths` from the entitlement row) and its test, `src/utils/accountPlanClient.ts`. Art: handoff 07's six other rooms, the box, the creatine tub.
- U1, the free ladder on the phone. V2. Opus. 12 hours. Files: new `src/models/trainingDay.ts` and `test/trainingDay.test.ts`, new `src/models/plusLadder.ts` (features in order, thresholds, `PlusLadder_unlocked`, `PlusLadder_next`, the AI caps per step) and `test/plusLadder.test.ts`, `src/models/plusAccess.ts` (`PlusAccess_allows` takes the unlock list) and its test, `src/models/accountPlan.ts` (`unlocks`, grant `earned`) and its test, `src/utils/plusAccessClient.ts`, `src/models/plusOffer.ts` (never present for an earned account, the cancel card state) and its test, `src/components/screenSubscription.tsx` (the locked list, the creatine line, the earned state, the cancel card with `managementURL`), `src/components/bearFinishBanner.tsx` (one line when a feature unlocks), `src/models/bearHoney.ts` (the workout rule reads training days) and its test. Runs beside H2.
- U2, the free ladder on the server. V2. Opus. 12 hours, 16 if L1 has not landed and this batch creates `counted_days`. Files: new migration `supabase/migrations/<date>_plus_unlocks.sql` (`counted_days` if missing, `plus_unlocks`, `plus_unlocks_refresh(p_user)` run by the `counted_days` upsert, `account_plan_effective` returning `unlocks` and grant `earned`, `ai_usage_take` reading the AI step caps), `supabase/tests/plus_unlocks.sql`, `api/_auth.mjs` and `test/aiAuth.test.ts`, `api/billing/sync.mjs`, `api/_billing.mjs` and `test/billing.test.ts`, new `src/utils/countedDaysClient.ts` (one row per training day, shared with L1) and `test/countedDays.test.ts`. The thresholds live in `plusLadder.ts`, and a test reads the migration to check the copy. After U1.
- L2, the leaderboard. V2. Codex. 6 hours. Files: new migration `supabase/migrations/<date>_leaderboard.sql` (the `leaderboard_kg` view and its policy), new `src/models/leaderboard.ts` (the rows, the opt-in rule, the user's own row pinned when outside the top 20) and `test/leaderboard.test.ts`, new `src/utils/leaderboardClient.ts`, new `src/components/leaderboardList.tsx` mounted under the feed, `src/components/screenSettings.tsx` (the opt-in switch). After U2, because it reads `counted_days`.
- A1, activities. V2. Codex. 6 hours. Files: new `src/models/activityLog.ts` (an entry with name, minutes and day, parsed with the usual guards) and `test/activityLog.test.ts`, new `src/utils/activityStore.ts`, `src/models/quickActions.ts` (the Activity square) and its test, new `src/components/activitySheet.tsx`, `src/models/journalDay.ts` (an Activity section) and its test, `src/models/trainingDay.ts` (the third kind) and its test, `src/models/fullBackup.ts` and its test. After U1.

Group C, V2, after H1.

- C1, the city passport. V2. Opus. 16 hours. Files: new `ios/Liftosaur/CityLocation.swift` and its bridge, `ios/Liftosaur/Info.plist` (the purpose string names the passport), new `src/utils/cityLocation.ts` and `.native.ts` (web answers nothing), new `src/models/cityPassport.ts` (the stamp rule, the visit count, the home city, the generic stamp, the badge thresholds, `CityPassport_clear`, the opt-in state) and `test/cityPassport.test.ts`, `src/types.ts` (`city` on `IHistoryRecord`), `src/models/runLog.ts` (`city` on a run) and its test, `src/models/fullBackup.ts` and its test, `src/components/screenFinishDay.tsx` (the stamp line, the opt-in sheet on the first finish), new `src/components/cityOptInSheet.tsx`, new `src/components/screenPassport.tsx`, `src/models/bearBadges.ts` (three badges) and its test, `src/models/workoutPost.ts` (city in version 3 behind the switch) and its test, `src/components/screenSettings.tsx` (two switches under Privacy), `src/models/bearHouse.ts` (the passport object). Art: handoff 08's 32 stamps and one generic template, and the passport object from handoff 10. Design calls: the passport page, the opt-in text. Beside U2.
- C2, postcards. V2. Codex. 5 hours. New `src/models/postcard.ts` and `test/postcard.test.ts`, new `src/components/shareCards/postcardCard.tsx`, `src/components/screenPassport.tsx` (Share on a stamp). After C1.
- S1, Bear school. V2. Opus. 12 hours. New `src/models/bearSchool.ts` and `test/bearSchool.test.ts`, new `src/components/screenBearSchool.tsx`, `src/models/bearBadges.ts` (course badges), `src/models/bearHouse.ts` (the desk). After H2.
- Q1, the weekly ask. V2. Codex. 4 hours. New `src/models/weeklyAsk.ts` and its test, `src/models/bearHoney.ts` (an `ask` reason) and its test, `src/components/bearHouseScene.tsx` (the ask on the bed's pill). After H2.
- P1, the picker, as planned: 8 hours plus the keepers' art. The fur row joins the card. After G2, H1 and handoff 11.

Group D, later, no estimate until a web dashboard exists: the desk object, the computer dashboard, recovery sync.

Totals: group A 45 hours, group B 50 hours, group C 45 hours, 140 hours of code. Art from the running handoffs: 7 gyms, 7 rooms, about 31 objects, 112 fur sprites, 32 stamps and 8 postcards. Handoff 10 adds the rooms with the whiteboard, the two locked-object mockups, the passport, the creatine tub and the box. Handoff 11 adds 36 line-test sprites.

Art readiness before each batch: G1 needs `06-gym-ladder/` with its `check-*.png` files, G2 needs the four `09-black-and-polar/` folders with `review.png`, H1 needs `07-bear-house/` and `10-home-rooms/`, C1 needs `08-city-stamps/`. The next session checks `~/Documents/Codex/bebear-art/` first.

## 12. Decisions for the owner

Answered on 2026-10-26, and now in the plan.

- The Journal is the notebook on the wall, not a tab.
- Use is training days: lifts, runs, later boxing, one a day.
- Everything is free at 550 training days.
- The full AI allowance at the end.
- Locked objects are hidden, and Codex draws both ways for a look.
- Two ladders: the gym on kg, the house on consistency.
- The passport from day 0.
- Many bear lines, tested at 3 sprites each.

Answered later the same day, and now in the plan.

- The bottom of the screen holds the "+" alone. The back chevron is the way home.
- A whiteboard line opens the "+" sheet. No second way to start a workout.
- Active days for the house, training days for the gym. The house is never behind the gym.
- The creatine boost is 1.5 on bear XP and house XP. The bear levels up faster and looks bigger sooner. The lifetime kg total and the leaderboard never move for money.
- The door is the gym, with the bag check on the way in and the exit check on the way out.
- A leaderboard by lifetime kg, friends first, V2.

No question is open. Group A starts.

Next action: paste `docs/bear-art/codex/10-home-rooms.md` into Codex, then open `HANDOFF-opus-bear-world.md` in an Opus session.
