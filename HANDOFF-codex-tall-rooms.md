# Codex handoff 12: tall rooms and gyms

Paste this into Codex on GPT-5.6 Sol. Never Astra. Output goes to `~/Documents/Codex/bebear-art/12-tall-rooms/`.

## Why

The beBEAR home screen becomes the whole phone screen. An iPhone screen is 9 by 19.5. The rooms are 1024 by 1536, which is 2 by 3. Each room and each gym grows to 1024 by 2304, which is 4 by 9, by adding ceiling above and floor below. The old picture stays pixel for pixel, because the app's object positions are measured on it.

## Inputs

- The seven rooms in `~/Documents/Codex/bebear-art/10-home-rooms/`: `room-trailer.png`, `room-apartment.png`, `room-loft.png`, `room-mansion.png`, `room-spaceship.png`, `room-moon.png`, `room-mars.png`. Each is 1024 by 1536.
- The seven gyms in `~/Documents/Codex/bebear-art/06-gym-ladder/`: `trailer-park.png`, `discount-gym.png`, `luxury-club.png`, `mansion-gym.png`, `spaceship.png`, `moon-base.png`, `mars-dome.png`, or whichever seven the folder's `notes.md` marks as final. Each is 1024 by 1536.

## Output, per file

- One opaque PNG, exactly 1024 by 2304, named as the input.
- The input picture occupies rows 448 to 1983 unchanged. Check it in Python: `ImageChops.difference(Image.open(input).convert("RGB"), Image.open(output).convert("RGB").crop((0, 448, 1024, 1984))).getbbox()` returns `None`.
- Rows 0 to 447 continue the room upward: the rest of the ceiling, the top of the walls, the lamp's cone of light, the window's top. Same materials, same warm light, same camera. No new furniture, no text, no bears, no people.
- Rows 1984 to 2303 continue the floor downward: the same carpet, boards, tiles or metal deck, with the same light falling on it. Nothing on the floor.
- The seam at row 448 and at row 1984 shows no line. Blend only outside the kept region.

## Method

The image tool outputs 1024 by 1536 at most, so each file is two generations and one composite.

- Generate the top tile: a 1024 by 1536 picture of the same room whose bottom 640 rows match the input's top 640 rows, as an edit with the input as the reference and the instruction to extend the view upward. Keep the input's own pixels for those 640 rows in the composite, and use the tile only for rows 0 to 447.
- Generate the bottom tile the same way for the floor, and use it only for rows 1984 to 2303.
- Composite in Python with Pillow: paste the input at (0, 448), the top tile's rows 0 to 447 at (0, 0), the bottom tile's rows 896 to 1215 at (0, 1984). Feather 24 rows into the tiles, never into the input.
- Run the compare command above on every file before you finish.

## Also deliver

- `check-rooms.png` and `check-gyms.png`: contact sheets, seven columns each, every file scaled to 256 by 576, with the file name under it.
- `notes.md` in the same format as the other handoff folders: file, tool, prompt, notes, one block per file, and the compare result for each.

Next action: run the compare on `room-trailer.png` first and send its check image before doing the other thirteen.
