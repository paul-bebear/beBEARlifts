// One-off: moves images/bear/house/manifest.json from the 1024 by 1536 canvas to the 1024 by 2304 one, where the
// old picture sits at rows 448 to 1984, and records a wall colour per room and per gym. HOUSE_HOME_PLAN.md has the
// numbers. Run it with `TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/house-manifest-tall.ts`.
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "images", "bear", "house", "manifest.json");
const gymDir = path.join(root, "images", "bear", "gyms");
const oldTop = 448;
const tallCanvas = [1024, 2304];

type ISlot = { rect: number[]; pill: number[] };
interface IRoom {
  room: string;
  door: string;
  wall?: string;
  objects: Record<string, ISlot>;
}
interface IManifest {
  canvas: number[];
  whiteboard: number[];
  bearFoot: number[];
  gymExit: ISlot;
  images: Record<string, number[]>;
  rooms: Record<string, IRoom>;
  gymWalls?: Record<string, string>;
}

// The mean of the picture's top 4 rows, which is the ceiling a wide screen shows beside the art.
function wallColor(file: string): string {
  const code = [
    "import sys",
    "from PIL import Image, ImageStat",
    "im = Image.open(sys.argv[1]).convert('RGB')",
    "print('#%02x%02x%02x' % tuple(round(c) for c in ImageStat.Stat(im.crop((0, 0, im.width, 4))).mean))",
  ].join("\n");
  return execFileSync("python3", ["-I", "-c", code, file], { encoding: "utf8" }).trim();
}

function down(xy: number[], at: number[]): number[] {
  return xy.map((v, i) => (at.includes(i) ? v + oldTop : v));
}

function slotDown(slot: ISlot): ISlot {
  return { rect: down(slot.rect, [1, 3]), pill: down(slot.pill, [1]) };
}

function format(manifest: IManifest): string {
  return `${JSON.stringify(manifest, undefined, 2).replace(
    /\[\s+([-\d.,\s]+?)\s+\]/g,
    (_, inner: string) => `[${inner.split(/,\s*/).join(", ")}]`
  )}\n`;
}

function main(): void {
  const manifest: IManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.canvas[1] === tallCanvas[1]) {
    console.log("manifest.json is already on the tall canvas");
    return;
  }
  const rooms: Record<string, IRoom> = {};
  for (const [tier, room] of Object.entries(manifest.rooms)) {
    const objects: Record<string, ISlot> = {};
    for (const [id, slot] of Object.entries(room.objects)) {
      objects[id] = slotDown(slot);
    }
    const wall = wallColor(path.join(root, "images", "bear", "house", `${room.room}.webp`));
    rooms[tier] = { room: room.room, door: room.door, wall, objects };
  }
  const gymWalls: Record<string, string> = {};
  for (const file of fs
    .readdirSync(gymDir)
    .filter((f) => f.endsWith(".webp"))
    .sort()) {
    gymWalls[file.replace(/\.webp$/, "")] = wallColor(path.join(gymDir, file));
  }
  const tall: IManifest = {
    canvas: tallCanvas,
    whiteboard: down(manifest.whiteboard, [1, 3]),
    bearFoot: down(manifest.bearFoot, [1]),
    gymExit: slotDown(manifest.gymExit),
    images: manifest.images,
    rooms,
    gymWalls,
  };
  fs.writeFileSync(manifestPath, format(tall));
  console.log(`wrote ${manifestPath}`);
}

main();
