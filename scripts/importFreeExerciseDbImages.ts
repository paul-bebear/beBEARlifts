import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { FreeExerciseDbImages_allIds } from "../src/models/freeExerciseDbImages";

// Pinned so a re-run produces the same files that the licenses page credits.
const COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5";
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "images", "exercises");
const SMALL_SIZE = 192;
const LARGE_WIDTH = 850;

async function importOne(id: string): Promise<void> {
  const url = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/exercises/${encodeURIComponent(id)}/0.jpg`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  const source = Buffer.from(await response.arrayBuffer());
  await sharp(source)
    .resize({ width: LARGE_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(path.join(OUT, "large", `${id}.jpg`));
  await sharp(source)
    .resize(SMALL_SIZE, SMALL_SIZE, { fit: "cover", position: "attention" })
    .jpeg({ quality: 75, mozjpeg: true })
    .toFile(path.join(OUT, "small", `${id}.jpg`));
}

async function main(): Promise<void> {
  fs.mkdirSync(path.join(OUT, "large"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "small"), { recursive: true });
  for (const id of FreeExerciseDbImages_allIds()) {
    await importOne(id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
