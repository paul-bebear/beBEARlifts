# Replaces the stopgap tall rooms and gyms (scripts/house-stopgap-tall.py) with the Codex art from
# HANDOFF-codex-tall-rooms.md. The Codex files are 1024 by 2304 and live outside the repo, so a missing one is skipped.
# The 06-gym-ladder spaceship, moon and mars are not the pictures the app ships, so those gyms come from 13-tall-app-gyms.
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
    "images/bear/gyms/trailer-park.webp": "12-tall-rooms/trailer-park.png",
    "images/bear/gyms/discount-gym.webp": "12-tall-rooms/discount-gym.png",
    "images/bear/gyms/luxury-club.webp": "12-tall-rooms/luxury-club.png",
    "images/bear/gyms/mansion-gym.webp": "12-tall-rooms/mansion-gym.png",
    "images/bear/gyms/spaceship.webp": "13-tall-app-gyms/spaceship.png",
    "images/bear/gyms/moon.webp": "13-tall-app-gyms/moon.png",
    "images/bear/gyms/mars.webp": "13-tall-app-gyms/mars.png",
    "images/bear/gyms/bedroom.webp": "13-tall-app-gyms/bedroom.png",
    "images/bear/gyms/garage.webp": "13-tall-app-gyms/garage.png",
    "images/bear/gyms/pro.webp": "13-tall-app-gyms/pro.png",
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
