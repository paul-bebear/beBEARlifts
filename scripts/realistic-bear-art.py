# Converts the Codex batch 14-realistic-bear into the app's art: 24 brown bear sprites, the cabin room and ten objects.
# The source folder lives outside the repo. Run it again after Codex repaints a file: `python3 -I scripts/realistic-bear-art.py`.
import json
import os
import re
import sys

from PIL import Image

QUALITY = 82
SPRITE_SOURCE_SIZE = (1024, 1536)
SPRITE_SIZE = (512, 768)
ROOM_SOURCE_SIZE = (1024, 2304)
ROOM_SIZE = (768, 1728)
OBJECT_LONG_SIDE = 480
FOOT_ROW = 1470
ALPHA_THRESHOLD = 8

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
art = os.path.expanduser("~/Documents/Codex/bebear-art/14-realistic-bear")
brown_dir = os.path.join(root, "images", "bear", "brown")
house_dir = os.path.join(root, "images", "bear", "house")

levels = [f"level-{n:02d}" for n in range(1, 13)]
moods = [f"mood-{size}-{mood}" for size in ("small", "medium", "big", "space") for mood in ("hungry", "tired", "pumped")]
objects = [
    "bed",
    "phone",
    "bowl-empty",
    "bowl-quarter",
    "bowl-half",
    "bowl-three-quarter",
    "bowl-full",
    "mirror",
    "scale",
    "wall-calendar",
]


def rounded(value):
    return int(value + 0.5)


def save_webp(image, path):
    image.save(path, "WEBP", quality=QUALITY)


def convert_sprites():
    assets = {}
    for name in levels + moods:
        source = os.path.join(art, f"{name}.png")
        image = Image.open(source).convert("RGBA")
        if image.size != SPRITE_SOURCE_SIZE:
            sys.exit(f"{name}.png is {image.size}, expected {SPRITE_SOURCE_SIZE}")
        left, top, right, bottom = image.getchannel("A").point(lambda a: 255 if a > ALPHA_THRESHOLD else 0).getbbox()
        save_webp(image.resize(SPRITE_SIZE, Image.LANCZOS), os.path.join(brown_dir, f"{name}.webp"))
        assets[f"bear_{name.replace('-', '_')}.png"] = {
            "kind": "bear",
            "canvas": list(SPRITE_SOURCE_SIZE),
            "mode": "RGBA",
            "foot_anchor": [512, FOOT_ROW],
            "visible_bbox": [left, top, right, bottom],
            "visible_height": FOOT_ROW - top,
        }
    manifest = {"canvas": list(SPRITE_SOURCE_SIZE), "bear_foot_anchor": [512, FOOT_ROW], "assets": assets}
    with open(os.path.join(brown_dir, "manifest.json"), "w") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")


def convert_room():
    image = Image.open(os.path.join(art, "room-cabin.png")).convert("RGB")
    if image.size != ROOM_SOURCE_SIZE:
        sys.exit(f"room-cabin.png is {image.size}, expected {ROOM_SOURCE_SIZE}")
    save_webp(image.resize(ROOM_SIZE, Image.LANCZOS), os.path.join(house_dir, "room-cabin.webp"))


def convert_objects():
    sizes = {}
    for name in objects:
        image = Image.open(os.path.join(art, f"{name}.png")).convert("RGBA")
        scale = OBJECT_LONG_SIDE / max(image.size)
        size = (rounded(image.width * scale), rounded(image.height * scale))
        save_webp(image.resize(size, Image.LANCZOS), os.path.join(house_dir, f"{name}.webp"))
        sizes[name] = list(size)
    return sizes


def update_house_manifest(sizes):
    path = os.path.join(house_dir, "manifest.json")
    with open(path) as handle:
        text = handle.read()
    match = re.search(r'"images": \{\n(.*?)\n  \}', text, re.S)
    images = {}
    for line in match.group(1).split("\n"):
        name, width, height = re.match(r'\s*"([^"]+)": \[(\d+), (\d+)\],?', line).groups()
        images[name] = [int(width), int(height)]
    images.update(sizes)
    body = ",\n".join(f'    "{name}": [{w}, {h}]' for name, (w, h) in sorted(images.items()))
    with open(path, "w") as handle:
        handle.write(text[: match.start(1)] + body + text[match.end(1) :])


os.makedirs(brown_dir, exist_ok=True)
convert_sprites()
convert_room()
update_house_manifest(convert_objects())
print("done")
