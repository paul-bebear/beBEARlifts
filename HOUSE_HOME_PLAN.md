# The full-screen house home

Planning pass of 2026-10-27, from the owner's feedback on iOS 124 (6). Nothing in this file is built. It follows `BEAR_WORLD_PLAN.md`, whose T3 (one home, PR 148) and H1 (the house, PR 151) have merged to master `8bece8d0`. The weigh-in check and the scale's readings are being fixed in a separate session and are taken as done here.

Read-only findings come from the worktree at `8bece8d0`. The owner's words are quoted where they decide something.

## 1. What the owner said

- The home screen is the bear's house and fills the whole screen. No scrolling. "Everything gotta be accessible ... by tapping it in the house."
- Remove the "My bear" title, the gear top right, which does nothing on iOS, and "none of all the stuff at the bottom".
- The house is small and the top of the room is cut off.
- The bowl already opens food, so "Today's food" under the house goes.
- The goal card becomes two whiteboard lines: "Goal: build muscle" and "since October 21 at 73 kg".
- Fewer labels. "You don't need to label bed, calendar." Onboarding explains the objects once.
- The whiteboard writing looks written with a marker.
- The house art "is going to need quite a bit of work, but we can leave that for now." The owner wants to move objects around on the phone instead of describing positions.

## 2. What the code does today

- `ScreenHome` in `src/components/screenHome.tsx` renders inside `NavScreenContent`, an `Animated.ScrollView`. The header is `NavHeader` with `navTitle: "My bear"` and a cog that dispatches `Thunk_pushScreen("settings")` with no tab. The home stack does not register `settings`, so the tap is dropped on iOS. `src/components/foodAiSignIn.tsx` shows the working call: `Thunk_pushScreen("settings", undefined, { tab: "me" })`.
- Under the scene: `SeasonNudgeCard`, then `MyBearSections` from `src/components/screenProgressDashboard.tsx`, which holds `CloudRestoreBanner` (offline builds only), `TodayMacros` with `FoodSummaryCard`, `ProgressGoalCard` with Change goal and Change pace, and a row to `reportsHub`.
- The "+" is the only footer, drawn by `Footer2View` in `src/components/footer2.tsx` through the tab navigator's `tabBar`, so it floats over every screen. It opens `plusSheetModal` with Food, Weight, Run and Start or Resume workout.
- The house box is `Math.min(480, width - 32)` wide and 1.5 times that tall, from `BearScene_layout` in `src/models/bearScene.ts` on the 1024 by 1536 art canvas. On a 393 pt iPhone the house is 361 by 541 pt, under a 100 pt header. `room-trailer.webp` is 768 by 1152, the same 2:3 shape, and `resizeMode="cover"` crops nothing. The roof starts at the art's top edge, so the room reads as cut off at the top.
- An iPhone 16 Pro screen is 393 by 852 pt, a 1:2.17 shape. The art is 1:1.5. Filling the screen at the art's width leaves 311 pt empty, 36 percent of the height.
- `BearBoard_lines` in `src/models/bearBoard.ts` gives six lines: Train, Eat, Weigh-in, the weight trend, Level, Lifted. `BoardLine` in `src/components/bearSceneParts.tsx` draws them with the `Text` primitive, which forces Poppins. `TextRaw` in `src/components/primitives/text.tsx` draws with whatever `fontFamily` it is given.
- `BearHouse_objects` in `src/models/bearHouse.ts` gives every object a `label` and a `pill`. `BearHouseScene` draws a `HousePill` on every unlocked object. `HouseObjectView` uses `object.pill` as the accessibility label.
- The goal lives in `ProgramGoalStore` (`src/utils/programGoalStore.ts`) as `IProgramGoal` with `kind`, `startedAt` and `startWeight`. `ProgressHub_goal` in `src/models/progressHub.ts` formats "Oct 21" and "73 kg".
- Fonts bundled: Poppins and Iosevka, in `assets/fonts`, `ios/Fonts`, `UIAppFonts` in `ios/Liftosaur/Info.plist`, and `android/app/src/main/assets/fonts`.
- Tours: `ITourId` in `src/models/state.ts` is `"workout" | "program"`. A tour is a list of steps with a title, a picture and a text, shown by `tourModal.tsx`. Seen steps are flags in `storage.helps` through `Tour_stepHelpFlag`.
- Codex art on disk: `~/Documents/Codex/bebear-art/10-home-rooms/` holds the seven rooms at 1024 by 1536 with the white board at x 125 to 825, y 195 to 675, and `07-bear-house/` holds the objects. `mockup-padlocked.png` is the layout the owner picked.

## 3. The new home

Full screen.

- `ScreenHome` sets `navHidden: true`, which `NavHeader` already honours, and renders a plain `View` with `flex: 1` in place of `NavScreenContent`. Nothing scrolls. The status bar draws over the ceiling.
- The art canvas grows from 1024 by 1536 to 1024 by 2304, a 4:9 shape. The old picture sits unchanged at y 448 to 1984. Above it 448 rows of ceiling, below it 320 rows of floor. Codex paints the extension for the seven rooms, so the old whiteboard rectangle and every measured object slot keep their pixels and move down by 448.
- `HouseFrame_fit(box, insets)` in a new `src/models/houseFrame.ts` places the art in the screen. The scale is `min(box.width / 1024, box.height / 1536)`, so the old region is always whole. The art is centred horizontally. Rows that do not fit are cut from the ceiling first and from the floor extension only after the 448 ceiling rows are gone. The empty sides on a wide screen take the room's wall colour, one value per room in the manifest.
- On a 393 by 852 iPhone the art is 393 by 884 pt and loses 32 pt of ceiling. On a 375 by 667 iPhone SE it loses 177 pt of ceiling. On an iPad at 820 by 1180 pt the old region is whole, with 17 pt of wall colour on each side. On the web the same rule gives a centred column, which is how the owner tests on Safari.
- `HouseFrame_safeRect(fit, insets)` returns the part of the canvas inside the safe area. `test/houseFrame.test.ts` checks the three devices above and that every object rect in `manifest.json` lies inside the safe rect on the iPhone with a 59 pt top inset and a 34 pt bottom inset.
- The bear stands on `bearFoot`, moved down by 448 like everything else. `BearScene_layout` takes the canvas as an argument instead of reading `BearScene_canvas`, and the gym keeps its own.
- During a workout the scene is the gym, as `BearScene_place` decides today. The gym goes full screen through the same `HouseFrame_fit`, with the seven gym pictures extended the same way. The owner confirmed on 2026-10-27: everything extended, 14 Codex files. Until the tall gym art is on disk the gym scene shows the stopgap picture with the ceiling strip in the gym's wall colour.
- The "+" stays where it is, bottom right over the floor. The owner's call on 2026-10-27: keep it for now, maybe remove it later. It covers canvas x 826 to 982, y 2017 to 2304, which no object slot touches.

What leaves the screen, and where each thing goes.

- The "My bear" title: gone. The bear's name shows in the bear panel, which the bed opens.
- The gear: gone. Settings opens from the phone on the dock, below.
- "Today's food" and `FoodSummaryCard`: gone. The bowl opens the Journal on today's meals, as it does now.
- The goal card: the whiteboard's goal lines, below. A tap on them opens the goal wizard in pace mode, because the owner decided on 2026-10-27 that the goal is always to gain weight and the user picks only the pace. The card's Change menu never worked on iOS: `MyBearSections` pushes `goalWizard` with no tab, and only `GraphsStack` registers it, the same fault as the gear. The new tap passes `{ tab: "graphs" }`.
- The reports link, "More": a row in the phone sheet.
- `SeasonNudgeCard`: its line, "900 kcal left", goes on the bowl's pill in bulk season after 18:00, as `BEAR_WORLD_PLAN.md` already says. Its snack rows move to the top of the Journal's meals for today, so a tap on the bowl lands on them.
- `CloudRestoreBanner`, offline builds only: the first row of the phone sheet while a restore is pending.
- The "+": stays, with its four actions. When the owner removes it later, Food is the bowl, Weight is the scale, Start workout is the door, Resume workout is the bear in the gym scene, and Run becomes a second button on the door's bag check sheet.

The phone on the dock.

- `phone-dock.webp` exists and arrives at 7 active days today, opening Add a friend. It becomes a day-0 object with no padlock, and it opens a sheet.
- The sheet, `src/components/phoneSheet.tsx`, lists rows from `PhoneSheet_rows(input)` in a new `src/models/phoneSheet.ts`: Settings, which pushes `settings` with `{ tab: "me" }`; More, which pushes `reportsHub` with `{ tab: "graphs" }`; Friends, which pushes `friends` with `{ tab: "friends" }` when the user has a friend and opens `addFriendModal` otherwise; and the restore banner row when `OfflineOnly_isEnabled()` and a restore is pending. The pending-request badge stays on the phone.
- `test/phoneSheet.test.ts` covers the three states: no friends, friends, offline with a pending restore.

## 4. The whiteboard

The lines, in order, from `BearBoard_lines`.

- Train · Upper. Target `plus`.
- Eat · 1,200 of 2,800 kcal. Target `plus`.
- Weigh-in · Sunday. Target `plus`.
- Goal: build muscle. Target `goal`. Without a goal the line reads "Goal: tap to set one".
- since October 21 at 73 kg. Target `goal`. Without a start weight it reads "since October 21". Without a goal the line is absent.
- 72.4 kg · +0.8 in 30 d. Target `bear`.
- Level 5 · 48,000 kg to Strong. Target `bear`.
- Lifted 310,000 kg since day one. Target `bear`.

That is eight lines on a board that is 269 by 184 pt on the iPhone. The ink height stays 152 pt, so each line gets 19 pt and the font is 13 pt. Permanent Marker is about 30 percent wider than Poppins, so the Eat line at 13 pt needs about 265 pt of the 269 available. Each line therefore sets `adjustsFontSizeToFit` with `minimumFontScale: 0.8`, so a long line shrinks to 10.4 pt instead of cutting off. The owner keeps all eight lines.

- `IBearBoardTarget` becomes `"plus" | "goal" | "bear"`. `BearBoard_goalLines(goal, units, now)` builds the two goal lines. The date format is the full month name and the day, "October 21", and gains the year when it is not this year, "October 21, 2025". `test/bearBoard.test.ts` covers a goal with a start weight, a goal without one, and no goal.
- `openBoardTarget` in `screenHome.tsx` sends `goal` to `Thunk_pushScreen("goalWizard", { mode: "pace" }, { tab: "graphs" })`. Without a goal it sends `{ mode: "goal" }`, so a new user can set one.
- The marker font is Permanent Marker, Apache License 2.0, by Font Diner, one weight, 70 KB. The owner asked for "a whiteboard or permanent marker" look on 2026-10-27. Kalam, OFL, was the narrower alternative and is dropped. Before the font lands in a build, piece B renders the board at 393 pt width with Pillow and attaches the PNG to its PR, so the owner can veto the look from the PR page.
- The file goes to `assets/fonts`, `ios/Fonts`, `android/app/src/main/assets/fonts`, and its name into `UIAppFonts` in `ios/Liftosaur/Info.plist`. The licence text goes next to it as `PermanentMarker-LICENSE.txt`. `BoardLine` draws with `TextRaw` and `fontFamily: "PermanentMarker-Regular"`. The to-do lines stay darker than the rest through opacity, as today, because the font has one weight. The check mark is drawn with two `View` strokes in the marker ink, because handwriting fonts have no check glyph.
- The ink colour stays `markerInk`, `#1F3A5F`. A done line keeps the strike-through.

## 5. Labels

The rule: no pill on an open object. Three pills remain.

- A call to action on an empty object: "No friends yet" on the TV, "Weigh in" on the scale, "Stamp your first city" on the passport. These are the `BearText_houseEmpty` lines already in `bearHouse.ts`.
- "New" on an object that just arrived, from H2's unlock flag.
- The three-second note under a padlocked object and under the passport.

How it is built.

- `IBearHouseObject.pill` becomes `pill?: string`, set only for the three cases above. `label` stays on every object and is the accessibility label in `HouseObjectView`, so VoiceOver still reads "Bed". `BearHouseScene` draws a `HousePill` only when `pill` is set. `test/bearHouse.test.ts` checks that a day-0 room with a weight, a friend and a stamp has no pill at all.
- The house tour explains the objects once. `ITourId` gains `"house"`. `src/components/tour/houseTourConfig.tsx` has one step per day-0 object, each with the object's own picture in place of the dino and one line of text. It starts when the home shows the house scene, the user has a program, and no step is seen, through `shouldStart`. Seen flags go to `storage.helps` like the other tours.
- The lines. Whiteboard: "Your to-do list. Tap a line to log it." Door: "The gym. Tap it to start a workout." Bowl: "Your food. Tap it to see today's meals." Scale: "Weigh in here." Bed: "Your bear rests here. Tap it to see how it feels." Notebook: "Your journal. Every day you logged is in it." TV: "Your friends. Add one to see their workouts." Phone: "Settings and everything else." Passport: "A stamp for every city you train in. Coming soon."
- `src/models/houseTour.ts` holds `HouseTour_steps(objects)`, which returns the steps in room order for the objects that are open, so a tour started on day 0 never names a padlocked object. `test/houseTour.test.ts` covers the day-0 room and a room with the calendar open.

## 6. Arranging the house

The owner arranges the room on the phone and sends the positions back as text.

- The tool lives in the web build, which the owner opens in Safari on the iPhone through a `preview/*` branch or `lifts.paulbebear.com`. `https://<host>/app?arrange=1` turns it on. The iOS app never has it.
- With the flag on, every object in the house scene can be dragged. A tap selects an object and shows two buttons, bigger and smaller, which scale its slot by 5 percent around its bottom edge, because objects stand on their slot's bottom. The pill anchor is a dot that drags on its own. The bear drags by its feet. The whiteboard does not move, because it is painted in the room.
- A room picker at the top switches between the seven rooms, so the owner can arrange rooms that the house ladder has not opened yet.
- "Copy manifest" writes the whole `manifest.json` to the clipboard, two-space indented, keys in the file's order. The owner pastes it into a Claude session message or into Notes. A session writes it to `images/bear/house/manifest.json`, and `test/bearHouse.test.ts` already checks every slot's shape. "Reset" returns to the file's values.
- `src/models/houseArrange.ts` owns it: `HouseArrange_isOn(search)` reads the query, `HouseArrange_reduce(state, action)` handles move, scale, movePill, moveFoot, pickRoom and reset, clamps every rect to the canvas and snaps to 2 px, and `HouseArrange_export(state)` returns the JSON text. `test/houseArrange.test.ts` checks the clamp, the snap, that scaling keeps the bottom edge, and that the export parses back to the manifest shape.
- `src/components/houseArrange.tsx` is the web component with `PanResponder`, which takes touch and mouse. `src/components/houseArrange.native.tsx` exports a component that returns null, so Metro bundles nothing of the tool. `src/utils/houseArrangeFlag.ts` reads `window.location.search`; its `.native.ts` twin returns `false`. `BearHouseScene` mounts the tool over the scene when the flag is on, one line.
- Estimate: 6 hours. Drag and clamp 2, scale and pill 1, export and room picker 1, the pure module and tests 2. It depends on the full-screen frame, because the canvas changes shape.

## 7. Build split

Four pieces of code and one Codex art handoff. Each code piece is one branch and one PR titled with `[skip deploy]`, not merged by the session. No session runs the simulator or the browser. Each PR body gives the owner a phone checklist. Models follow the owner's rule: Opus for design calls, Sonnet for a fully specified batch.

Piece A, the full-screen frame and the phone. Opus. 16 hours. First. The brief is `HANDOFF-house-a-frame.md`.

- Modules: new `src/models/houseFrame.ts` and `test/houseFrame.test.ts`. `src/models/bearScene.ts` takes the canvas as an argument and `test/bearScene.test.ts` covers both canvases. New `src/models/phoneSheet.ts` and `test/phoneSheet.test.ts`. `src/models/bearHouse.ts` moves the phone to day 0 with target `{ kind: "phone" }` and reads the wall colour; `test/bearHouse.test.ts` follows.
- Data: `images/bear/house/manifest.json` rewritten for the 1024 by 2304 canvas by a one-off script, `scripts/house-manifest-tall.ts`, which adds 448 to every y and sets `canvas` to `[1024, 2304]`. Stopgap tall rooms and gyms made with `cwebp` and ImageMagick padding until the Codex files land.
- Views, the scene: `src/components/screenHome.tsx` (no header, no scroll, the phone sheet, every removed section gone), `src/components/bearHouseScene.tsx` and `src/components/bearScene.tsx` (the frame, no `px-4`, no rounded corners), `src/components/bearSceneParts.tsx` (the board scales with the frame).
- Views, the rest: new `src/components/phoneSheet.tsx`, `src/navigation/AppNavigator.native.tsx` and `AppNavigator.tsx` (the `phoneSheetModal` route), `src/components/screenProgressDashboard.tsx` (`MyBearSections` and `TodayMacros` deleted), `src/components/progressHubCards.tsx` (`ProgressGoalCard` deleted if nothing else renders it), `src/components/seasonNudgeCard.tsx` (moved into the Journal day), `src/utils/imagePreloader.tsx` and `.native.tsx`.
- Design calls: the wall colours, the stopgap strip, the status bar style per room, the phone sheet's look.

Piece B, the whiteboard. Sonnet. 5 hours. After A merges, because both touch `bearSceneParts.tsx` and `screenHome.tsx`. The brief is `HANDOFF-house-b-board.md`.

- Modules: `src/models/bearBoard.ts` (`goal` target, `BearBoard_goalLines`) and `test/bearBoard.test.ts`.
- Views: `src/components/bearSceneParts.tsx` (`BoardLine` with `TextRaw`, the marker font, the drawn check), `src/components/screenHome.tsx` (`goal` opens the wizard).
- Files: the font in the three folders, `Info.plist`, the licence text.

Piece C, labels and the house tour. Sonnet. 7 hours. After A merges, because both touch `bearHouse.ts` and `bearHouseScene.tsx`. The brief is `HANDOFF-house-c-labels-tour.md`.

- Modules: `src/models/bearHouse.ts` (`pill` optional) and `test/bearHouse.test.ts`. New `src/models/houseTour.ts` and `test/houseTour.test.ts`. `src/models/state.ts` (`ITourId` gains `"house"`).
- Views: `src/components/bearHouseScene.tsx` (pills only when set), new `src/components/tour/houseTourConfig.tsx`, `src/components/tour/tourConfigs.ts`.

Piece D, the arrange tool. Sonnet. 6 hours. After A merges, because the canvas changes shape. The brief is `HANDOFF-house-d-arrange.md`.

- Modules: new `src/models/houseArrange.ts` and `test/houseArrange.test.ts`.
- Views: new `src/components/houseArrange.tsx` and `houseArrange.native.tsx`, new `src/utils/houseArrangeFlag.ts` and `.native.ts`, one mount line in `src/components/bearHouseScene.tsx`.

The Codex art, in parallel with A. GPT-5.6 Sol, never Astra. The brief is `HANDOFF-codex-tall-rooms.md`.

- Fourteen files: the seven rooms and the seven gyms, each extended to 1024 by 2304 with the old picture unchanged at y 448 to 1984. The handoff asks for a pixel check that the old region is identical, and a `check-<room>.png` contact sheet.
- Until the files land, piece A ships the stopgap. Whichever session is open when the files arrive converts them with the `cwebp` settings in the handoff and replaces the stopgap.

Order: A now, with the Codex art beside it. B, C and D each start when A merges, and run beside each other, because they touch different files once A is in. Total 34 hours of code.

## 8. V1 and V2

V1: everything in pieces A to D and the art. The owner asked for all of it from the build in hand.

V2, unchanged from `BEAR_WORLD_PLAN.md`: the house ladder, the arrivals and the "New" pill, the creatine boost, and the passport. The next round of room art, which the owner wants to do later with the arrange tool, is V2 too.

## 9. Parked from the owner's 2026-10-27 message

The owner added direction while this plan was in review. None of it changes pieces A to D. Each item names where it lands.

- Levels should track how a committed person who lifts most days and eats well sees results. The pace in `src/models/bearTier.ts` is a separate retune, in the onboarding plan below.
- Onboarding becomes a one-week baseline: rest 3 or 4 days, then a 1-week plan that PRs everything, which sets the base the app builds on. That is its own plan, `BASELINE_WEEK_PLAN.md`, in a Fable session after this PR.
- Two user groups: 15 to 17 year old skinny kids who want an alternative to peptides and testosterone, and 18 to 25 year olds stuck at a plateau weight. The goal is always to gain weight, so "Goal: build muscle" is the usual board line, and the goal wizard's other two kinds stay for the few who pick them.
- The week of baseline data is sunk cost that keeps users consistent, with leaderboards and the social views. That belongs to the leaderboard batch L2 in `BEAR_WORLD_PLAN.md`.
- Every new user is a cub with a number, and the owner is player 0. In the house that is a number plate on the door, "Cub 412", drawn by the app over the door art the way the scale's number is. It needs a server counter in Supabase and a signed-in account, so it goes with the onboarding plan, and the door's slot in the arrange tool should leave room for it.
- A pool of bear GIFs for the cards after a workout, in the style of Liftoff's social cards. The reference is the 71 Liftoff screenshots in `~/Downloads/Screenshots for gym app/Liftoff/` and the teardown in `docs/research/liftoff-in-app.md`, which is git-ignored. The share cards in `src/components/shareCards/` export a still through `shareCardExport.ts` today. An animated card needs the bear animated by Codex, one short loop per mood and size, and an export path that writes a GIF or a short MP4. That is a Codex art handoff and a build batch of its own, after the house, and it goes into `BASELINE_WEEK_PLAN.md`'s follow-up list so it is not lost.

## 10. Decisions

Answered by the owner on 2026-10-27, and now in the plan.

- The "+" stays for now. Maybe it goes later.
- The phone on the dock is Settings, More and Friends from day 0.
- The goal card goes. The board shows the goal lines, and a tap lets the user pick the pace. Goals get developed per person later: after the baseline week, the app breaks the goal into tiny goals tailored to each user. That belongs to `BASELINE_WEEK_PLAN.md` (PR 162).
- The whiteboard keeps all eight lines, in Permanent Marker, shrinking a long line instead of cutting it.
- No pill on open objects. The tour explains them once.
- Everything extended: the seven rooms and the seven gyms.

Still open, one decision each.

- The season nudge card. It is the bulk-season helper from `src/models/seasonNudge.ts`: when the season changes it offers the new food targets, and late in a bulk day with kcal left it lists three one-tap snacks, the Bear shake, mixed nuts and a peanut butter sandwich, that add themselves to the food log. The plan removes it from the home, puts its "900 kcal left" line on the bowl's pill, and moves the snack rows into the Journal's meals for today. Yes or no?
- The arrange tool. The owner asked to move objects around the house instead of describing positions. The tool is a web-only mode, `?arrange=1` on the preview URL in Safari on the iPhone, where every object drags, two buttons scale it, and "Copy manifest" puts the positions on the clipboard as text to paste into a session. It never ships in the iOS app. Build it now as piece D, 6 hours, or not yet?

Next action: answer the two questions in the session, then the four build cards follow.
