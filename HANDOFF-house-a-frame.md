# Handoff: piece A, the full-screen house and the phone

You are the Opus build session for the full-screen house home. `HOUSE_HOME_PLAN.md` at the repo root is the plan. Read its sections The new home and Build split before the first edit. Read `CLAUDE.md` for the repo rules. Its "Where logic lives" rule applies to every file here.

## What you build

The home screen becomes the house, edge to edge, with no header, no scroll and nothing under it. The settings and the More list move into a sheet the phone on the dock opens. Everything the plan lists under "What leaves the screen" leaves.

The modules and their tests come first.

- New `src/models/houseFrame.ts`. `HouseFrame_canvas` is `{ width: 1024, height: 2304 }` and `HouseFrame_oldTop` is 448. `HouseFrame_fit(box, insets)` returns `{ scale, left, top, width, height, sideColorWidth }` for the art in a screen box, with the rule in the plan: scale is `min(box.width / 1024, box.height / 1536)`, the art is centred horizontally, rows are cut from the ceiling first and from the floor extension only after the 448 ceiling rows are gone. `HouseFrame_safeRect(fit, insets)` returns the canvas rectangle inside the safe area. `test/houseFrame.test.ts` checks a 393 by 852 box with insets 59 and 34 (scale 0.3838, 32 pt cut from the top), a 375 by 667 box with insets 20 and 0 (177 pt cut from the top), an 820 by 1180 box (old region whole, 17 pt of side colour each side), and that every object rect in `images/bear/house/manifest.json` lies inside the safe rect on the first box.
- `src/models/bearScene.ts`. `BearScene_layout` takes a `canvas` argument and stops reading `BearScene_canvas` inside. The gym passes the gym canvas, the house passes `HouseFrame_canvas`. `BearScene_dashboardRect` moves to the manifest for the house, because the board sits 448 lower there. `test/bearScene.test.ts` covers both canvases.
- New `src/models/phoneSheet.ts`. `PhoneSheet_rows({ friendCount, isOffline, hasPendingRestore })` returns rows with `id`, `title`, `subtitle` and `target`. Targets are `{ kind: "screen", screen: "settings", tab: "me" }`, `{ kind: "screen", screen: "reportsHub", tab: "graphs" }`, `{ kind: "screen", screen: "friends", tab: "friends" }` or `{ kind: "addFriend" }`, and `{ kind: "restore" }`. `test/phoneSheet.test.ts` covers no friends, friends, and offline with a pending restore.
- `src/models/bearHouse.ts`. The phone leaves the `arrivals` table, so it is open on day 0. Its target becomes `{ kind: "phone" }`, a new member of `IBearHouseTarget`. The pending-request badge stays. `BearHouse_wallColor(tier)` reads a `wall` hex value per room from the manifest. `test/bearHouse.test.ts` follows: the day-0 open set gains `phone`.

The data.

- `scripts/house-manifest-tall.ts`, run once and committed with its output: sets `canvas` to `[1024, 2304]`, adds 448 to every y in `whiteboard`, `bearFoot`, `gymExit` and every room's `objects`, and adds `wall` per room. ImageMagick is not installed. Pillow 12 is, under `/opt/anaconda3/bin/python` and `python3`. Pick each wall colour as the mean of the room's top 4 rows: `python3 -c "from PIL import Image, ImageStat; im = Image.open('images/bear/house/room-trailer.webp').convert('RGB'); print('#%02x%02x%02x' % tuple(round(c) for c in ImageStat.Stat(im.crop((0, 0, 768, 4))).mean))"`.
- Stopgap tall pictures until the Codex files land: for each room and gym, pad the 768 by 1152 webp to 768 by 1728 with 336 rows of the top colour above and 240 rows of the bottom colour below, in one Pillow script, `scripts/house-stopgap-tall.py`, that writes a PNG per file, then `cwebp -q 82`. The file names stay the same, so no code path changes when the real art replaces them. Keep the stopgap commit separate, so it is one revert when the art arrives.

The views after that.

- `src/components/screenHome.tsx`. `useNavOptions({ navHidden: true })`. The root is a `View` with `flex: 1`, not `NavScreenContent`. It renders the scene and the honey sheet and nothing else. `openHouseTarget` gains `case "phone"`, which opens `phoneSheetModal`. The cog, `MyBearSections` and `SeasonNudgeCard` leave the file.
- `src/components/bearHouseScene.tsx` and `src/components/bearScene.tsx`. The scene fills its parent. `onLayout` measures the parent box, `HouseFrame_fit` places the art, and `BearScene_layout` gets the fit's width and the canvas. No `px-4`, no `rounded-3xl`, no `maxWidth`. The sides outside the art take `BearHouse_wallColor`. The room `Image` keeps `resizeMode="cover"` because the fit already matches the art's shape.
- `src/components/bearSceneParts.tsx`. `BearSceneBoard` reads the board rect from the layout, as today. Nothing else changes here; piece B owns `BoardLine`.
- New `src/components/phoneSheet.tsx`, mounted as `phoneSheetModal` in `src/navigation/AppNavigator.native.tsx` and `AppNavigator.tsx` next to `bearPanelModal`. It draws the rows from `PhoneSheet_rows` with the `SheetScreenContainer` and `FormSheet` pattern from `src/components/plusSheet.tsx`. The restore row renders `CloudRestoreBanner`.
- `src/components/screenProgressDashboard.tsx`. `MyBearSections` and `TodayMacros` are deleted. `StatsSections` stays. `src/components/progressHubCards.tsx` loses `ProgressGoalCard` if no other file renders it; `grep -rn ProgressGoalCard src` decides.
- `src/components/seasonNudgeCard.tsx` moves into the Journal's day view above the meals, in `src/components/screenJournal.tsx`, for today only. `src/models/journalDay.ts` decides when it shows and `test/journalDay.test.ts` covers today and another day.
- `src/utils/imagePreloader.tsx` and `.native.tsx` preload the same file names as before.
- `scripts/lint-views-baseline.json` loses entries for deleted functions.

## What you do not decide

The owner decided these on 2026-10-27, so build them as written. Full screen, no header, no scroll, nothing under the house. The phone opens Settings and More. The "+" footer stays. The rooms and the gyms both go tall. The goal, the labels and the marker font are pieces B and C and you do not touch `BoardLine`, `pill`, or the fonts.

Change nothing about kg, levels, honey, badges or billing. Add no objects. Add no tab.

## Done means

- `npm test` and `npm run lint` are green.
- On the owner's iPhone: the house fills the screen under the status bar, the ceiling shows, the "+" sits over the floor, there is no title and no gear, the phone opens the sheet, Settings opens from the sheet and the back chevron returns to the house, the bowl opens the Journal, nothing scrolls, and the gym shows while a workout runs.
- The PR body carries that list as the owner's phone checklist, plus what is not covered.

## Conventions

- Do not run the iOS Simulator or the browser pane. The owner tests on the phone.
- The PR title ends with `[skip deploy]`. Do not merge.
- Commit messages name what the user sees. No AI attribution lines.
- Push the branch a second time as `preview/house-a` so Vercel builds a web preview, and put the URL in the PR body.

Next action: write `test/houseFrame.test.ts` with the three device boxes, then `src/models/houseFrame.ts`.
