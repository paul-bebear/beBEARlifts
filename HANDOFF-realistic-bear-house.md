# Handoff: realistic bear and cabin house in code

Position: the art is done, the code is not started. This plan has four steps. Each step is one commit on one branch.

Run this on Sonnet (`claude-sonnet-5-5`). Never on Fable. No simulator and no browser testing. The owner tests on his iPhone.

## Why

The owner rejected the human-shaped cartoon bear and the crowded house on 2026-11-11. Codex painted a new set: one cabin room, eight objects and one brown bear in 24 sprites. The app still draws the old art. This plan swaps the art and removes seven house objects and the padlock.

## Before the first edit

- PRs 176 to 180 are merged into `master`. PR 180 changed `src/models/houseTour.ts` and `src/models/phoneSheet.ts`, and this plan edits both.
- Branch from `master`.
- The art is in `~/Documents/Codex/bebear-art/14-realistic-bear/`. It holds 35 PNG files. `HANDOFF.md` in that folder gives every size and anchor.
- Two files in that folder may still get a repaint: `mood-space-pumped.png` and `wall-calendar.png`. The art script in step 1 can run again, so do not wait for them.

## Owner decisions, 2026-11-11

- Eight house objects stay: whiteboard, door, bowl, bed, scale, wall calendar, phone, mirror.
- Seven leave the house: honey jar, wardrobe, boombox, TV, trophy shelf, passport, notebook. The padlock leaves too.
- Every object is there from day 0. Nothing is locked.
- The feed and friends live in the phone. Badges live in the phone. Music lives in the phone. The streak becomes a number on the whiteboard.
- During a workout the home screen shows the cabin. The gym scene returns when a gym is painted.
- The bear picker row leaves Settings. The saved `line` and `fur` values stay stored.
- No lifting poses. The share card uses the roar.
- The old art files get deleted in step 4, after the owner tests steps 1 to 3 on his iPhone.

## Step 1: art into the repo

Write `scripts/realistic-bear-art.py`. Run it with `python3 -I`. Use Pillow and the webp settings of `scripts/house-tall-art.py` (quality 82).

- Bear: 24 sprites, 1024 by 1536, become 512 by 768 webp files in `images/bear/brown/`. The names stay: `level-01` to `level-12`, and `mood-<size>-<mood>` for `small`, `medium`, `big`, `space` and `hungry`, `tired`, `pumped`.
- The script writes `images/bear/brown/manifest.json` with one `visible_bbox` per sprite. Copy the format of `images/bear/male/manifest.json`.
- Room: `room-cabin.png` becomes `images/bear/house/room-cabin.webp` at 768 by 1728.
- Objects: resize each so the long side is 480. Write `bed.webp`, `phone.webp`, `bowl-quarter.webp` and `bowl-three-quarter.webp` as new files. Overwrite `bowl-empty.webp`, `bowl-half.webp`, `bowl-full.webp`, `mirror.webp`, `scale.webp` and `wall-calendar.webp`.
- The five bowl files share one canvas of 960 by 619. Keep that, so the app swaps them in place.
- The script updates the `images` sizes in `images/bear/house/manifest.json`.
- Add the new files to the `bundled` map in `src/utils/bearImage.native.ts`. That map is written by hand.

## Step 2: one bear

- `BearArt_sprite` in `src/models/bearArt.ts` returns the `brown` folder for every `line` and `fur`. Keep both parameters. Friends' bears, backups and old clients still send them.
- `BearArt_liftingSizes` becomes an empty list. `BearArt_cardSprite` then falls back to the `pumped` mood. That fallback exists today.
- `visibleBoxes` in `src/models/bearScene.ts` holds the 24 boxes from `images/bear/brown/manifest.json`. `BearScene_visibleBox` maps every line and fur to them. `test/bearScene.test.ts` compares the map with the manifest.
- Scale is fixed. The new art holds the size inside the canvas: level 01 is 580 pixels tall and level 12 is 1442. In the house, one sprite pixel is 0.62 canvas pixels, and the sprite point (512, 1470) sits on `bearFoot`. Remove `BearScene_heightShare`, `BearScene_maxHeightShare`, `minHeightShare`, `inLevelGrowth` and `BearArt_scale` if nothing else calls them.
- At 0.62 the tallest sprite ends at row 727. The whiteboard ends at row 650. Add a test that every sprite's top stays below the whiteboard.
- `ShareCardBear_frame` in `src/models/shareCardBear.ts` has crop shares measured on the old pumped poses. Measure them again on the four new `pumped` sprites.
- `BearScene_headCrop` and `src/components/bearAvatar.tsx` read the new boxes. Check the head crop of `level-10` to `level-12`, where the helmet is the top of the sprite.
- Remove the bear picker row from `src/components/settingsForkRows.tsx`. Leave `src/models/bearLook.ts` and `src/components/bearLookSheet.tsx` as they are. A second species brings the row back.

## Step 3: the cabin house

### Manifest

`images/bear/house/manifest.json` gets a room `cabin`. Top-level values change for it:

- `whiteboard`: [32, 190, 992, 650].
- `bearFoot`: [512, 1620].
- Wall colour `#EBD2C0`.
- The door is painted in the room image. It has no image file. Its tap rect is [20, 896, 250, 1592].

Starting slots, in canvas pixels on the 1024 by 2304 canvas:

```
object     x0    y0    x1    y1   layer
calendar   65   700   217   867   back
mirror    767   907   995  1417   back
bed       700  1556  1024  2246   front
phone     856  1661   982  1741   front, above the bed
bowl       37  1975   370  2190   front
scale     454  2002   843  2190   front
```

The iPhone shows about rows 0 to 2222. The bowl and the scale end at row 2190, so they stay whole. The bed runs off the bottom edge, as in the room the owner approved.

The phone slot is 126 by 80 canvas pixels. That is about 53 by 34 points on the screen. Pad its tap area to 44 points in both directions.

The owner moves these slots after his first test. The web arrange mode (`?arrange=1`) exports a manifest.

### Objects and removals, all in `src/models/bearHouse.ts`

- `IBearHouseTier` gets `cabin`. `src/utils/useBearHouse.ts` and `src/components/tour/houseTourConfig.tsx` use it in place of `trailer`.
- `specs()` returns eight objects. Delete the specs for `notebook`, `tv`, `passport`, `boombox`, `honey`, `shelf` and `wardrobe`.
- The bed uses `bed`. The phone uses `phone`. `tierIndex` no longer picks art.
- Delete `tvImage`, `tvScreens`, `honeyImage`, `shelfImage`, the `line` target kind and the `honey` target kind.
- Delete the locks: `arrivals`, `IBearHouseLock`, `BearHouse_lockLine`, `BearHouse_padlock`, the lock branch in `BearHouse_tap` and `BearText_lockLine`. Delete `BearHouse_activeDays` if nothing else calls it.
- `src/components/bearSceneParts.tsx` stops drawing the padlock and the TV overlay. `src/components/bearHouseScene.tsx` loses the lock note if no other line uses it.
- `bowlImage` picks from five files. The `share` it reads today stays. Under 0.1 is `bowl-empty`, under 0.4 is `bowl-quarter`, under 0.65 is `bowl-half`, under 0.9 is `bowl-three-quarter`, the rest is `bowl-full`.
- `BearHouse_artOf` computes `inkBottom` from the old board offsets. The new board is 960 by 460 and all of it takes ink. Compute `inkBottom` from the new rect and extend `test/bearBoardSize.test.ts`.

### Honey

Delete `src/models/bearHoney.ts`, `src/utils/useBearHoney.ts`, `src/components/honeySheet.tsx` and `test/bearHoney.test.ts`.

Remove the honey parts of these files:

- `src/components/screenHome.tsx`: `isHoneyOpen`, `HoneySheet`, the `honey` case.
- `src/components/screenReportsHub.tsx` and `src/models/reportsHub.ts`: `HoneySheetHost`, the `honey` row, the `openHoney` action.
- `src/models/featureLayer.ts`: the `honey` feature.
- `src/models/bearText.ts`: `BearText_honeyLine`, `BearText_honeyBreakdown`, `BearText_honeySaved`.
- `src/models/phoneSheet.ts`: the word "honey" in the Stats subtitle.
- `src/utils/useBearHouse.ts`, `src/models/houseArrange.ts`, `src/components/tour/houseTourConfig.tsx`: `honeyEarned`.

Keep `spent` in `IBearStoreData` and in `BearStoreData_parse`. Old clients and old backups still carry it. Keep the `honeyHunter` badge and the honey colours. They are names, not the currency.

### TV, shelf, passport, notebook, boombox

- Delete `src/models/bearTv.ts` and the `BearTv` overlay in `src/components/bearTv.tsx`. `BearHead` lives in the same file. Find its callers first and move it if one remains.
- `test/workoutFeed.test.ts` reads the manifest for `BearTv_rect`. Remove that part.
- Remove `badgeCount`, `hasNoteToday` and `isOffline` from `IBearHouseSources` if no spec reads them.
- The `music` route, `src/components/screenMusic.tsx` and all music tracking stay. Only the house object goes.
- The `journal` target stays. The bowl uses it.

### Home screen during a workout

- `src/components/screenHome.tsx` always renders `BearHouseScene`. It stops calling `BearScene_place`.
- With a workout running, the door opens that workout: pass `isOngoingProgress: true` to `QuickActions_workout`. The door label reads "Back to workout".
- `src/components/bearScene.tsx`, `src/models/gymExit.ts` and the gym images stay in the repo, unused. List them in the PR body. The owner decides about them when a gym is painted.

### Whiteboard and tour

- `BearBoard_lines` in `src/models/bearBoard.ts` gets a streak line. Use the count that the `streak` screen shows. Add a case to `test/bearBoard.test.ts`.
- `HouseTour_lines` in `src/models/houseTour.ts` lists eight objects in this order: whiteboard, door, bowl, scale, mirror, calendar, bed, phone. Write one line for the mirror and one for the calendar.

## Step 4: delete the old art

Do this as its own commit, and only after the owner says the iPhone test passed.

- The six folders `images/bear/male`, `female`, `male-black`, `female-black`, `male-polar` and `female-polar`. They hold 168 sprites.
- The seven old rooms and their entries in the manifest: trailer, apartment, loft, mansion, spaceship, moon, mars.
- The old object images: `boombox`, the seven `door-*`, the three `honey-jar-*`, the two `notebook-*`, `padlock`, the two `passport-*`, `phone-dock`, the three `trophy-shelf-*`, the four `tv-*`, the two `wardrobe-*`, `bed-big`, `bed-small`.
- Their lines in `src/utils/bearImage.native.ts`.
- The ten gym images stay. Nobody asked the owner about them.

## Which module owns what

- Sprite path and folder: `src/models/bearArt.ts`, tested in `test/bearArt.test.ts`.
- Sprite boxes, fixed scale, head crop: `src/models/bearScene.ts`, tested in `test/bearScene.test.ts`.
- Object list, bowl state, tap targets: `src/models/bearHouse.ts`, tested in `test/bearHouse.test.ts`.
- Whiteboard lines and the streak line: `src/models/bearBoard.ts`, tested in `test/bearBoard.test.ts`.
- Whiteboard ink size: `src/models/bearBoardSize.ts`, tested in `test/bearBoardSize.test.ts`.
- Tour lines: `src/models/houseTour.ts`, tested in `test/houseTour.test.ts`.
- Share card crop: `src/models/shareCardBear.ts`, tested in `test/shareCardBear.test.ts`.
- Arrange mode: `src/models/houseArrange.ts`, tested in `test/houseArrange.test.ts`.

No `.tsx` file in this plan holds a decision. `screenHome.tsx`, `bearHouseScene.tsx` and `bearSceneParts.tsx` only render what the modules return.

## Rules for the session

- Edit and Write for file changes. The art script is the one shell exception.
- Zero code comments by default.
- No "Co-Authored-By" line and no AI attribution in commits or in the PR.
- The PR title ends with `[skip deploy]`.
- Run `npm test`, `npm run lint` and the TypeScript check before each commit.

## Not in this plan

- A painted gym and the gym scene.
- Black, polar and Asiatic bears.
- The other six rooms.
- The calendar day-tap fix in `NavModalMonthCalendar.tsx`.
- The Journal, History and Calendar path rework.
- Bear-led onboarding and the support slider.

## Done means

- Steps 1 to 3 are three commits in one PR. Step 4 waits.
- The house shows the cabin, eight objects and the painted bear at every level and mood.
- No screen shows a cartoon bear, a padlock or the word "honey" as a currency.
- All tests pass and lint is clean.
- The PR body lists what was not checked on a device, and the unused gym files.

## Effort

Step 1 takes about 30 minutes if Pillow writes webp on this machine. Step 2 takes about 1 hour, and 2 hours if the share card crops need a second pass. Step 3 takes about 2 hours. It touches about 25 files and 10 test files. Step 4 takes 20 minutes.

Next action: confirm PRs 176 to 180 are merged, then branch from `master` and write `scripts/realistic-bear-art.py`.
