# Codex handoff 14: realistic bear and cabin room

Paste this into Codex on GPT-5.6 Sol. Never Astra. Output goes to `~/Documents/Codex/bebear-art/14-realistic-bear/`.

## Why

The owner rejected the human-shaped cartoon bear on 2026-11-11. The new bear is a real animal painted like a plate in a printed field guide. It has no human muscles, no clothes and no smile. It grows from a cub to an old grizzly, and size is the only sign of progress.

The home screen keeps eight objects: door, whiteboard, mirror, bed, bowl, scale, phone, wall calendar. The honey jar, wardrobe, boombox, notebook, passport, TV, trophy shelf and padlock are gone. Do not paint them.

This batch replaces the art for one room and one bear line. It makes 35 images.

## Style, for every image

- Gouache and watercolour natural history illustration. Fine brush strokes in the fur. Accurate bear anatomy. Earthy muted colours.
- The five approved test images in `refs/` set the look. Match them. Do not restyle.
- Never: human muscles, a human chest, hands, clothes, accessories, a smile, a smirk, text, numbers, logos, people.
- The belly and groin are plain fur in every pose.
- One exception to "no accessories": levels 10 to 12 wear a space helmet. The owner asked for it on 2026-11-11. It is a helmet only, never a suit, so the fur and the body size stay visible.

## Inputs, all in `~/Documents/Codex/bebear-art/14-realistic-bear/refs/`

- `ref-wave.png`: the approved adult brown bear, sitting and waving. This is the face, the fur colour and the paint style.
- `ref-roar.png`: the approved standing roar. Hind legs together, front paws at the chest.
- `ref-growth.png`: four growth stages on one ground line. The fourth bear shows the silver fur of an old grizzly. Its silver patch has a hard edge like a cape. Paint it with a soft edge.
- `ref-room.png`: the approved room, 759 by 2072. One flaw: the mirror shows wall boards and looks like an empty frame.
- `ref-room-iphone-crop.jpg`: the same room cropped to an iPhone screen. This is the layout the owner approved.
- `ref-helmet.png`: the approved helmet, head and fur colour for level 12. Its body shape is rejected.
- `ref-species.png`: four species. Not used in this batch. It is there so the brown bear stays distinct from the later lines.

## Output 1: the empty room

- `room-cabin.png`, opaque, exactly 1024 by 2304.
- It holds the wall, the floor, the door and the whiteboard. Nothing else. No bear, no bed, no bowl, no scale, no mirror, no calendar, no phone.
- Wall: pale whitewashed horizontal boards. Floor: warm wood boards. No ceiling.
- The wall meets the floor at row 1592.
- Whiteboard: blank, thin metal frame, inside the rect x 32 to 992, y 190 to 650. The app draws live numbers on it, so the white area stays flat and empty.
- Rows 0 to 189 are plain wall. The iPhone clock covers part of them.
- Door: plain wooden plank door with a frame and a handle, drawn flat on the wall, inside the rect x 20 to 250, y 896 to 1592.
- Rows 1592 to 2303 are plain floor. The light falls from the upper left, as in `ref-room.png`.
- The image tool returned 759 by 2072 for a tall request on 2026-11-11. If it does that again, crop to 4 by 9 and resize to 1024 by 2304 with Lanczos in Pillow.

## Output 2: eight objects, ten files

Each file is one RGBA PNG with a clear background, cropped to the object with an 8 pixel margin, long side 960 pixels. Paint each one in the camera and light of `ref-room.png`: straight on, at the bear's eye level, floor seen slightly from above. No cast shadow outside the object.

- `bed.png`: the low wooden bed with the olive blanket, as in `ref-room.png`. Show the part visible in the reference, cut at the right edge.
- `bowl-empty.png`, `bowl-quarter.png`, `bowl-half.png`, `bowl-three-quarter.png`, `bowl-full.png`: the metal food bowl in five fill states. The app picks the state from how much food the user logged today. Same bowl, same angle, same size in all five, so the app can swap them in place. The food is salmon and berries. Quarter holds a few berries. Half adds one piece of salmon. Three-quarter is a full layer. Full is a heap above the rim with a whole salmon on top.
- `mirror.png`: tall mirror in a plain wooden frame. The glass is smooth silver-grey, lighter at the top left, with two thin diagonal light streaks. No wall boards in the glass. No reflection of the bear or the room.
- `phone.png`: a dark smartphone lying flat on a blanket, screen dark, seen from the same angle as in `ref-room.png`. No logo.
- `scale.png`: the bathroom scale with a round dial. The dial is blank.
- `wall-calendar.png`: a paper wall calendar with two rings and an empty grid. No numbers, no month name.

## Output 3: the brown bear, 24 sprites

Every sprite is one RGBA PNG, exactly 1024 by 1536, clear background.

- The lowest point of the bear sits on row 1470.
- The body is centred on x 512. A raised paw may reach to one side.
- No ground shadow. The app draws its own.
- No white fringe. Check each sprite on `#2B2522` and on `#F4EEE2`.
- The visible width never passes 980 pixels.

### Twelve levels, sitting and waving

Files `level-01.png` to `level-12.png`. Same pose as `ref-wave.png` in all twelve: sitting upright, facing the viewer, one front paw raised, head level, eyes open, mouth closed.

The app shows these at one fixed scale, so the size difference lives inside the canvas. Visible height is the distance from the top of the bear to row 1470.

```
level  stage         visible height  look
01     cub                 580       big head, short muzzle, round body
02     cub                 700       same cub, a little longer in the leg
03     older cub           790       face still round, body longer
04     yearling            870       lanky, narrow chest, long legs
05     yearling            950       lanky, starting to fill out
06     young adult        1040       filled out, small shoulder hump
07     young adult        1130       heavier neck
08     prime adult        1210       the bear in ref-wave.png
09     prime adult        1280       wider shoulders, thicker neck
10     old grizzly        1340       light silver tips on the hump, clean helmet
11     old grizzly        1400       clear silver on hump and upper back, helmet with grey moon dust
12     old grizzly        1442       most silver, widest shoulders, biggest hump, helmet with rust-red Mars dust
```

The helmet on levels 10 to 12 is one design, shown in `refs/ref-helmet.png`: a clear glass bubble on a matte off-white collar ring. The whole face and both ears show inside the glass. No logo, no flag, no text, no lights, no bolts. Measure visible height to the top of the helmet.

The collar stays off-white on all three levels. Level 10 is clean. Level 11 has grey moon dust and level 12 has rust-red Mars dust. The dust covers the collar and the lower third of the glass, with a soft edge, and the face stays clear. On `sheet-09-12.png` the three helmets look the same at phone size. The dust colour has to show when the bear is 400 pixels tall.

The first `level-12.png` had a copper shell covered in rust and looked like an old diving helmet. That one is rejected.

The owner chose a broad bear over a fat bear on 2026-11-11. From level 06 up, the shoulders are as wide as the hips, as in `ref-wave.png`. Levels 09 to 12 grow in the shoulders, the hump and the neck. The belly never becomes the widest part.

The bear in `refs/ref-helmet.png` has shoulders 700 pixels wide and a belly 950 pixels wide. That pear shape is rejected. Copy its helmet, its head and its fur colour only.

All twelve are the same individual. Keep the fur colour, the face markings and the paint texture of `ref-wave.png`. Growth shows only as real bear size and mass.

The head keeps the proportion of `ref-wave.png` at every level from 06 up. Measured without the helmet, the head is at least 40% as wide as the widest part of the body. The first `level-12.png` had a head 28% as wide, on a body shaped like a pear. A heavier bear has a thicker neck and wider shoulders, never a smaller head.

The silver fur sits on the hump and the upper back only. The chest, belly, legs and face keep the warm brown of `ref-wave.png`. Paint the silver as loose fur strokes. On `sheet-09-12.png` it has a regular pattern like scales or knitting.

Make the levels in three sheets of four first, the way `ref-growth.png` was made. The sheets are levels 01 to 04, 05 to 08 and 09 to 12. Each sheet shows its four bears on one ground line at true relative scale. Then paint each level alone at full size with its sheet as the reference.

### Twelve moods

Three moods for four body sizes. The size names are the app's own: `small` is the level 02 body, `medium` is level 05, `big` is level 08, `space` is level 10.

Files: `mood-small-hungry.png`, `mood-small-tired.png`, `mood-small-pumped.png`, then the same three for `medium`, `big` and `space`.

- hungry: sitting as in the level image, both front paws down, head lowered and turned to the lower left, nose forward as if sniffing for food. Mouth closed. Visible height is 0.95 of that body's level height.
- tired: lying on the belly facing the viewer, chin on the front paws, eyes closed. Visible height is 0.45 of that body's level height.
- pumped: the standing roar of `ref-roar.png`. Hind legs close together, front paws at the chest, head tilted up, mouth open. Visible height is 1.3 times that body's level height, and never above 1440.
- The three `space` moods use the clean helmet of level 10. Hungry and pumped wear it. Tired has it on the floor beside the bear.

## Not in this batch

- Black, polar and Asiatic bears.
- The other six rooms and all gyms.
- Lifting poses. A real bear does not lift a barbell.
- Phone app icons.

## Also deliver

- `check-first.png`: two panels side by side. Each panel is `room-cabin.png` with one bear pasted at scale 0.62, feet at x 512, y 1620. The left panel has `level-12.png`, the right panel has `level-01.png`.
- `check-room.png`: the room with all eight objects placed as in `ref-room-iphone-crop.jpg` and `level-08.png` at scale 0.62. Use `bowl-half.png`.
- Scale 0.62 makes `level-08.png` as tall in the room as the bear in `ref-room-iphone-crop.jpg`. The first check used 0.48 and every bear came out a quarter too small.
- `check-levels.png`: the twelve levels on one ground line at one scale, with the file name under each.
- `check-moods.png`: the twelve moods in a grid, four columns by size, three rows by mood.
- `notes.md` in the same format as the other handoff folders: file, tool, prompt, notes, one block per file.

Checks on 2026-11-11: `room-cabin.png` and `level-01.png` passed. Keep both files as they are. The second `level-12.png` passed on the helmet, the head size and the fur colour, and failed on the body shape. A copy is `refs/ref-helmet.png`.

The three level sheets passed on 2026-11-11: `sheet-01-04.png`, `sheet-05-08.png` and `sheet-09-12.png`. Each single level sprite matches its bear on the sheet in shape and proportion.

Final check on 2026-11-11: all 35 images arrived and every size matches this brief. 33 passed. Two get one repaint.

- `mood-space-pumped.png`: the body is slimmer than `mood-big-pumped.png`. The level 10 bear is the heavier one. Repaint it with shoulders and belly wider than `mood-big-pumped.png`, same height, same helmet.
- `wall-calendar.png`: the grid has 5 columns. A week has 7 days. Repaint it with 7 columns and 5 rows, same rings, same paper.

Next action: repaint `mood-space-pumped.png` and `wall-calendar.png`, then rebuild `check-moods.png` and `check-room.png`.
