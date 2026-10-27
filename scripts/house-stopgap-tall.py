# Stopgap until the Codex tall rooms and gyms land (HANDOFF-codex-tall-rooms.md): pads each 768 by 1152 room and
# gym picture to 768 by 1728, the tall canvas at 0.75 scale. 336 rows of the top colour go above and 240 rows of
# the bottom colour below. The last 24 padding rows fade into the picture's edge row, so the seam does not show as
# a hard line. A picture that is not 768 by 1152 is skipped, so a second run changes nothing. Run it once with `python3 -I scripts/house-stopgap-tall.py`.
import glob
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageStat

OLD_SIZE = (768, 1152)
TOP_ROWS = 336
BOTTOM_ROWS = 240
FADE_ROWS = 24
EDGE_ROWS = 4
QUALITY = "82"

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
files = sorted(glob.glob(os.path.join(root, "images/bear/house/room-*.webp")))
files += sorted(glob.glob(os.path.join(root, "images/bear/gyms/*.webp")))


def mean_color(im, top):
    return tuple(round(c) for c in ImageStat.Stat(im.crop((0, top, im.width, top + EDGE_ROWS))).mean)


def band(width, rows, color, edge, fade_at_end):
    out = Image.new("RGB", (width, rows), color)
    for i in range(FADE_ROWS):
        y = rows - FADE_ROWS + i if fade_at_end else FADE_ROWS - 1 - i
        share = (i + 1) / (FADE_ROWS + 1)
        out.paste(Image.blend(Image.new("RGB", (width, 1), color), edge, share), (0, y))
    return out


def pad(path, out_png):
    im = Image.open(path).convert("RGB")
    if im.size != OLD_SIZE:
        print(f"skip {path}: {im.size}")
        return False
    width, height = im.size
    tall = Image.new("RGB", (width, TOP_ROWS + height + BOTTOM_ROWS))
    top_edge = im.crop((0, 0, width, 1))
    bottom_edge = im.crop((0, height - 1, width, height))
    tall.paste(band(width, TOP_ROWS, mean_color(im, 0), top_edge, True), (0, 0))
    tall.paste(im, (0, TOP_ROWS))
    tall.paste(band(width, BOTTOM_ROWS, mean_color(im, height - EDGE_ROWS), bottom_edge, False), (0, TOP_ROWS + height))
    tall.save(out_png)
    return True


with tempfile.TemporaryDirectory() as tmp:
    for path in files:
        png = os.path.join(tmp, os.path.basename(path).replace(".webp", ".png"))
        if pad(path, png):
            subprocess.run(["cwebp", "-quiet", "-q", QUALITY, png, "-o", path], check=True)
            print(f"padded {os.path.relpath(path, root)}")
sys.exit(0)
