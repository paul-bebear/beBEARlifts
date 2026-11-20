# Replaces the stopgap tall rooms and gyms (scripts/house-stopgap-tall.py) with the Codex art from
# docs/archive/HANDOFF-codex-tall-rooms.md. The Codex files are 1024 by 2304 and live outside the repo, so a missing one is skipped.
# The gym pictures come from scripts/painted-gyms-art.py now. This script no longer writes them.
# Run it with `python3 -I scripts/house-tall-art.py`.
import os
import subprocess
import sys
import tempfile

from PIL import Image

TALL_SIZE = (1024, 2304)
APP_SIZE = (768, 1728)
QUALITY = "82"

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
art = os.path.expanduser("~/Documents/Codex/bebear-art")
sources = {
    "images/bear/house/room-trailer.webp": "12-tall-rooms/room-trailer.png",
    "images/bear/house/room-apartment.webp": "12-tall-rooms/room-apartment.png",
    "images/bear/house/room-loft.webp": "12-tall-rooms/room-loft.png",
    "images/bear/house/room-mansion.webp": "12-tall-rooms/room-mansion.png",
    "images/bear/house/room-spaceship.webp": "12-tall-rooms/room-spaceship.png",
    "images/bear/house/room-moon.webp": "12-tall-rooms/room-moon.png",
    "images/bear/house/room-mars.webp": "12-tall-rooms/room-mars.png",
}

with tempfile.TemporaryDirectory() as tmp:
    for target, source in sources.items():
        path = os.path.join(art, source)
        if not os.path.exists(path):
            print(f"skip {target}: no {source}")
            continue
        im = Image.open(path).convert("RGB")
        if im.size != TALL_SIZE:
            print(f"skip {target}: {source} is {im.size}")
            continue
        png = os.path.join(tmp, os.path.basename(path))
        im.resize(APP_SIZE, Image.LANCZOS).save(png)
        subprocess.run(["cwebp", "-quiet", "-q", QUALITY, png, "-o", os.path.join(root, target)], check=True)
        print(f"replaced {target}")
sys.exit(0)
