# Handoff: piece D, the arrange tool

You are the Sonnet build session for the arrange tool. `HOUSE_HOME_PLAN.md` at the repo root is the plan. Read its section Arranging the house before the first edit. Read `CLAUDE.md` for the repo rules. Piece A has merged; branch from master.

## What you build

A web-only mode, `?arrange=1`, in which the owner drags the house objects on the iPhone's Safari and copies the manifest as text. The iOS app never bundles it.

The module and its test first.

- New `src/models/houseArrange.ts`. `HouseArrange_isOn(search)` returns true when the query string holds `arrange=1`. `IHouseArrangeState` holds the manifest, the picked room and the picked object id. `HouseArrange_reduce(state, action)` handles `move { id, dx, dy }`, `scale { id, factor }`, `movePill { id, dx, dy }`, `moveFoot { dx, dy }`, `pickRoom { room }`, `pick { id }` and `reset`. Every rect is clamped to the canvas from `HouseFrame_canvas` and snapped to 2 px. `scale` keeps the slot's bottom edge and centre x, because objects stand on the slot's bottom. `HouseArrange_export(state)` returns the manifest as JSON text, two-space indented, keys in the file's order, with a trailing newline.
- `test/houseArrange.test.ts` checks a move past the left edge clamps to 0, a move of 3 snaps to 2 or 4, a scale of 1.05 keeps the bottom edge and centre x, `reset` returns the file's values, and `JSON.parse(HouseArrange_export(state))` deep-equals the manifest.

The views after that.

- New `src/utils/houseArrangeFlag.ts` returns `HouseArrange_isOn(window.location.search)`. Its twin `src/utils/houseArrangeFlag.native.ts` returns false.
- New `src/components/houseArrange.tsx`. It receives the fit from `HouseFrame_fit` and the scene's objects and draws, over the scene, one `PanResponder` handle per object rect, a dot per pill anchor, a handle at the bear's feet, a room picker row at the top with the seven tiers, and a bar at the bottom with Bigger, Smaller, Reset and Copy manifest. Copy manifest calls `navigator.clipboard.writeText(HouseArrange_export(state))` and shows "Copied" for two seconds. The picked object draws a 2 px outline. Dragging converts screen deltas to canvas units with `1 / fit.scale`.
- New `src/components/houseArrange.native.tsx` exports `HouseArrange` returning null, so Metro bundles none of the tool.
- `src/components/bearHouseScene.tsx` mounts `<HouseArrange ... />` after the pills when `HouseArrangeFlag_isOn()` is true, and draws the objects from the tool's state instead of the props while it is on. One mount line and one ternary.

## What you do not decide

The owner asked for drag, scale, the pill dot, the bear's feet, the room picker and a text export. Add no save to the server and no file write. Do not touch the board, the phone sheet or the labels.

## Done means

- `npm test` and `npm run lint` are green.
- On the owner's iPhone in Safari at the preview URL with `?arrange=1`: every object drags, Bigger and Smaller change the picked one, the pill dot drags, the bear's feet drag, the room picker switches rooms, Copy manifest puts JSON on the clipboard that pastes into Notes, and the same URL without the flag shows the plain house.
- `npm run build:lambda` is not needed. Check that `grep -c houseArrange ios/build` style searches are not needed either: the native stub is the whole guarantee, so say in the PR body that `houseArrange.native.tsx` returns null.
- The PR body carries the phone checklist, the preview URL and what is not covered.

## Conventions

- Do not run the iOS Simulator or the browser pane. The owner tests on the phone.
- The PR title ends with `[skip deploy]`. Do not merge.
- Commit messages name what the user sees. No AI attribution lines.
- Push the branch a second time as `preview/house-d` so Vercel builds the web preview, and put the URL in the PR body.

Next action: write `test/houseArrange.test.ts` with the five checks, then `src/models/houseArrange.ts`.
