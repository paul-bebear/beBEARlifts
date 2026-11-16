# Converts the Codex batch 16-painted-gyms into the app's seven gym pictures and prints each gym's wall colour.
# The source folder lives outside the repo. Run it again after Codex repaints a file: `python3 -I scripts/painted-gyms-art.py`.
# The wall colour is the median of rows 0 to 189, the plain wall under the iPhone clock. Paste it into gymWalls in images/bear/house/manifest.json.
import os
import statistics
import sys

from PIL import Image

QUALITY = 82
SOURCE_SIZE = (1024, 2304)
GYM_SIZE = (768, 1728)
WALL_ROWS = 190

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
art = os.path.expanduser("~/Documents/Codex/bebear-art/16-painted-gyms")
gyms_dir = os.path.join(root, "images", "bear", "gyms")

gyms = ["trailer-park", "discount-gym", "luxury-club", "mansion-gym", "spaceship", "moon", "mars"]


def wall_color(image):
    pixels = list(image.crop((0, 0, SOURCE_SIZE[0], WALL_ROWS)).getdata())
    channels = [int(statistics.median(pixel[channel] for pixel in pixels)) for channel in range(3)]
    return "#%02x%02x%02x" % tuple(channels)


os.makedirs(gyms_dir, exist_ok=True)
for name in gyms:
    image = Image.open(os.path.join(art, f"gym-{name}.png")).convert("RGB")
    if image.size != SOURCE_SIZE:
        sys.exit(f"gym-{name}.png is {image.size}, expected {SOURCE_SIZE}")
    image.resize(GYM_SIZE, Image.LANCZOS).save(os.path.join(gyms_dir, f"{name}.webp"), "WEBP", quality=QUALITY)
    print(f'    "{name}": "{wall_color(image)}",')
