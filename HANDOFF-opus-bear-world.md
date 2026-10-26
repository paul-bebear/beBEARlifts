# Handoff: build the bear world, group A

You are the Opus build session for beBEAR's bear world. `BEAR_WORLD_PLAN.md` at the repo root is the plan. This file says what to build first, in what order, and what not to decide. Read the plan's sections One home and the "+", The bear's house, The ladders and Build batches before the first edit. Read `CLAUDE.md` for the repo rules; its "Where logic lives" rule applies to every batch here.

## What you build

Group A, in this order. Each batch is its own branch and PR, tagged `[skip deploy]` in the title, because the owner merges PRs in batches and deploys once.

- T3, one home. 14 hours. Start here. It needs no art.
- H1, the house scene and the door. 22 hours. After T3 merges, because both edit `screenHome.tsx`. It needs `~/Documents/Codex/bebear-art/07-bear-house/` and `10-home-rooms/`.
- G1, the gym ladder. 2 to 4 hours. Only when `~/Documents/Codex/bebear-art/06-gym-ladder/check-trailer-park.png` exists. Runs beside T3.
- G2, black and polar fur. 5 hours. Only when the four folders under `09-black-and-polar/` each hold `review.png` and 28 sprites. Runs beside T3.

Check the art folders first. A batch whose art is missing waits. Say so and start the next one.

## The contract for T3

The modules and their tests exist before the components change.

- `src/models/bearBoard.ts`: `BearBoard_lines(input)` replaces `BearBoard_tiles`. It returns the three to-do lines from `DailyChecklist_build`, each with `text`, `isDone` and `target: "plus"`, then the weight line, the level line and the "Lifted 310,000 kg since day one" line, all with `target: "bear"`. In T3 the level line still counts kg, because XP arrives with H2. The Train line's text takes the day's name from `TodayPill_text`. `test/bearBoard.test.ts` covers an untouched day, a done day and a rest day.
- `src/models/bearScene.ts`: `BearScene_place(isOngoingProgress)` returns `"gym"` while a workout runs, else `"home"`. `test/bearScene.test.ts`.
- `src/models/journalDay.ts`: the Journal header gains the week dots from `weekDots.ts` and the History link that `programHistory.tsx` had. `test/journalDay.test.ts`.
- `src/models/screen.ts`: `"main"` keeps its name and now means the home screen. `Screen_tab("main")` stays `"home"`.

The components after that.

- `src/components/footer2.tsx`: the "+" `Pressable` alone, bottom right where it is today. `TabButton`, `GlassBar` and `GlassTabLens` leave the file, and the tab bar fade stays only if the "+" still needs it. There is no Home button. The back chevron on every pushed screen is the way home.
- `src/components/screenMyBear.tsx` becomes `src/components/screenHome.tsx`, mounted as the `home` stack root in `src/navigation/AppNavigator.tsx`, `AppNavigator.native.tsx` and `src/navigation/screens/NavScreenHome.tsx`. The nav title is the bear's name, as today. The gear stays.
- `src/components/bearScene.tsx` draws the lines on the whiteboard with a check mark on done lines, in place of the tiles. A tap on a `plus` line calls `navigateToModal("plusSheetModal")`, the same call the "+" makes. A tap on a `bear` line opens the bear panel sheet. Until H1 the scene is still the gym art; H1 adds the house.
- `src/components/programHistory.tsx` and `src/components/homeChecklist.tsx` are deleted, with their entries in `scripts/lint-views-baseline.json`. `seasonNudgeCard.tsx` mounts under the scene on the home screen.
- The W3 card, the "Name your bear" sheet, the level-up card and the first-program beBEAR+ offer keep working. `NavScreenMain` in `NavScreenHome.tsx` still calls `PlusOffer_afterFirstProgram`.

Done means four things. `npm test` and `npm run lint` are green. The web app at the host in `localdomain.js` shows the "+" and no tab bar. The whiteboard shows three lines and a tap on one opens the "+" sheet. The Journal shows the week dots.

The owner tests on the iPhone. Do not run the iOS Simulator or the browser pane for testing, per the owner's standing rule on token use. A screenshot of the web app from `npm start` is enough.

## The contract for H1

- `src/models/bearHouse.ts`: `BearHouse_objects(houseTier, activeDays, sources, seen)` and `BearHouse_nextBox(activeDays)` as the plan describes them. In H1 every object in the table is drawn regardless of `activeDays`, behind one constant `BearHouse_gateOn = false`, so H2 turns the gate on with one line. `test/bearHouse.test.ts` checks labels, targets and the day-0 set.
- `images/bear/house/manifest.json`: one rect per object per room on the 1024 by 1536 canvas, plus the whiteboard rect, which is the same in every room.
- `src/components/bearHouseScene.tsx`: the room, the objects at their rects, the pills, the bear through `BearScene_layout`, the whiteboard lines from T3. The gym scene stays `bearScene.tsx`; `screenHome.tsx` picks one with `BearScene_place`.
- The objects open what the plan's The bear's house section says. The TV's empty state opens the Add a friend sheet. The notebook opens the Journal on today. The bowl opens the Journal on today's meals.
- The door. `src/models/gymBagCheck.ts`: `GymBagCheck_items(day, history, settings)` returns the sheet's title line and the items to bring, by the plan's rules: water always, a belt for a squat or deadlift at 80 percent of the best or more, straps for a row or a deadlift, shoes for a run block, and the rest-day form. `test/gymBagCheck.test.ts`. `src/models/gymExit.ts`: `GymExit_sheet(progress)` returns the two exit questions and the finish label. `test/gymExit.test.ts`. The sheets are `gymBagCheckSheet.tsx` and `gymExitSheet.tsx`. The "+" bar's Start workout opens the bag check too, so the start lives in one function, and the exit sheet's Finish and the workout screen's Finish call one function in `src/utils/workoutMenuActions.ts`. A Settings switch, "Bag check before a workout", turns the sheet off.

## What you do not decide

The owner decided these on 2026-10-26, so build them as written. The "+" alone at the bottom, no tab bar. A whiteboard line opens the "+" sheet and nothing else. The door is the gym, with the bag check on the way in and the exit check on the way out. The gym scene shows only while a workout runs.

Creatine, when H2 adds it, multiplies XP by 1.5 and never the kg total. Group A does not touch it. Change nothing about kg, levels, honey, badges or billing.

Do not add objects that are not in the plan. Do not add a tab. Do not put beBEAR+ into the house.

## Conventions

- Tests are mocha, run with `npm test` or `npm run onetest <file>`.
- `scripts/lint-views.ts` runs on every edit through the hook. A function it flags moves to a module or gets a baseline entry with a reason.
- Commit messages name what the user sees. No AI attribution lines.
- When a batch is done, push the branch a second time under the name `preview/<batch>`, for example `preview/bear-world-t3`, so Vercel builds a preview the owner opens in Safari on the iPhone. Put that URL in the PR body.
- The PR body has four lines: what changed, the preview URL, what the owner should tap, what is not covered. The owner tests UI batches on the web preview first and cuts one iOS build per merged batch. Only native batches, such as location, go straight to an iOS build.

Next action: run `ls ~/Documents/Codex/bebear-art/`, then start T3 with `BearBoard_lines` in `src/models/bearBoard.ts` and its test.
