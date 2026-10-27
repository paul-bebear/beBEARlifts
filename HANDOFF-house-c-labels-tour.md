# Handoff: piece C, labels and the house tour

You are the Sonnet build session for the house labels. `HOUSE_HOME_PLAN.md` at the repo root is the plan. Read its section Labels before the first edit. Read `CLAUDE.md` for the repo rules. Piece A has merged; branch from master.

## What you build

Open objects lose their pills. A one-time tour explains each object instead.

The modules and their tests first.

- `src/models/bearHouse.ts`. `IBearHouseObject.pill` becomes `pill?: string`. `BearHouse_objects` sets it only for the empty-state lines in `BearText_houseEmpty` (the TV with no friends, the scale with no weight, the passport) and for `isNew`, where the text is "New". `label` stays on every object. `test/bearHouse.test.ts` checks that a day-0 room with a weight, one friend and the passport note has no pill except the passport's, and that an empty day-0 room has exactly three.
- `src/models/state.ts`. `ITourId` gains `"house"`.
- New `src/models/houseTour.ts`. `HouseTour_lines` is the table of object id to line, from the plan: whiteboard "Your to-do list. Tap a line to log it.", door "The gym. Tap it to start a workout.", bowl "Your food. Tap it to see today's meals.", scale "Weigh in here.", bed "Your bear rests here. Tap it to see how it feels.", notebook "Your journal. Every day you logged is in it.", tv "Your friends. Add one to see their workouts.", phone "Settings and everything else.", passport "A stamp for every city you train in. Coming soon." `HouseTour_steps(objects)` returns `{ id, title, line, image }` for each open object in the order above, with `title` the object's `label` and `image` its sprite path or the room's whiteboard crop for the whiteboard. `test/houseTour.test.ts` covers the day-0 room, which gives nine steps, and a room where the calendar is open, which still gives nine because the calendar has no line.

The views after that.

- `src/components/bearHouseScene.tsx`. The pill loop filters on `o.pill != null`. The accessibility label in `HouseObjectView` reads `object.label` for an open object and the lock line for a locked one, as today.
- New `src/components/tour/houseTourConfig.tsx`. `id: "house"`. `shouldStart` returns true when the current screen is `main`, the state has a current program, `storage.progress` is empty, and the history has fewer than 4 records, the same gate the workout tour uses. Each step comes from `HouseTour_steps`, with `dino` set to the object's image and `content` drawing the line in the tour's paragraph style. `src/components/tour/tourConfigs.ts` registers it.
- `src/components/screenHome.tsx` passes nothing new. `TourConfigs_findTourId` finds the tour through `shouldStart`, the way the workout tour starts.

## What you do not decide

The owner chose no labels on open objects and these nine lines. Do not touch the frame, the board or the phone sheet.

## Done means

- `npm test` and `npm run lint` are green.
- On the owner's iPhone with a fresh install: the house shows no label under the bed, the TV, the notebook or the door; the scale says "Weigh in" until the first weight; the tour runs once through the nine objects with each object's picture; after the tour, a reinstall of the same backup does not show it again.
- The PR body carries that list as the owner's phone checklist, plus what is not covered.

## Conventions

- Do not run the iOS Simulator or the browser pane. The owner tests on the phone.
- The PR title ends with `[skip deploy]`. Do not merge.
- Commit messages name what the user sees. No AI attribution lines.

Next action: write `test/houseTour.test.ts` with the day-0 room, then `src/models/houseTour.ts`.
