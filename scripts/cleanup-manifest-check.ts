import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const FORK_POINT = "a7a402c2";
const DIFF_PATHS = ["src", "api", "supabase", "scripts", "ios/Liftosaur", "ios/LiftosaurWatch"];
const CODE_EXTENSION = /\.(ts|tsx|mjs|js|sql|swift|m|mm)$/;
const MANIFEST_PATH = path.join(process.cwd(), "docs", "cleanup", "manifest.txt");
const SLICE_NAME = /^[a-z][a-z0-9-]*$/;

function forkFiles(): string[] {
  const out = execFileSync("git", ["diff", "--name-status", FORK_POINT, "HEAD", "--", ...DIFF_PATHS], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return out
    .split("\n")
    .map((line) => line.split("\t"))
    .filter(([status, file]) => status && status !== "D" && CODE_EXTENSION.test(file))
    .map(([, file]) => file);
}

function manifestEntries(): { slice: string; file: string; line: number }[] {
  return fs
    .readFileSync(MANIFEST_PATH, "utf8")
    .split("\n")
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter(({ text }) => text !== "")
    .map(({ text, line }) => {
      const [slice, file, ...rest] = text.split(/\s+/);
      if (!file || rest.length > 0 || !SLICE_NAME.test(slice)) {
        throw new Error(`manifest.txt line ${line} is not "<slice> <path>": ${text}`);
      }
      return { slice, file, line };
    });
}

function main(): void {
  const expected = new Set(forkFiles());
  const entries = manifestEntries();
  const seen = new Map<string, number>();
  const errors: string[] = [];

  for (const { file, line } of entries) {
    const first = seen.get(file);
    if (first != null) {
      errors.push(`listed twice: ${file} (lines ${first} and ${line})`);
    } else {
      seen.set(file, line);
    }
    if (!expected.has(file)) {
      errors.push(`not in the fork diff: ${file} (line ${line})`);
    }
  }
  for (const file of expected) {
    if (!seen.has(file)) {
      errors.push(`missing from the manifest: ${file}`);
    }
  }

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    console.error(`\n${errors.length} problem(s) in docs/cleanup/manifest.txt`);
    process.exit(1);
  }
  const slices = new Set(entries.map((e) => e.slice));
  console.log(`manifest ok: ${entries.length} files in ${slices.size} slices, diff ${FORK_POINT}..HEAD`);
}

main();
