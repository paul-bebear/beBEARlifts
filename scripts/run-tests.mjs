import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const testDir = "test";
const workers = Math.max(1, Math.floor(os.cpus().length / 2));

function findTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findTests(full);
    }
    return entry.name.endsWith(".test.ts") ? [full] : [];
  });
}

function runFile(file) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["mocha", "-r", "ts-node/register", "--timeout", "0", "--reporter", "dot", file], {
      env: { ...process.env, TS_NODE_TRANSPILE_ONLY: "1" },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => resolve({ file, code, output }));
  });
}

async function main() {
  const given = process.argv.slice(2);
  const files = (given.length > 0 ? given : findTests(testDir)).sort();
  const failed = [];
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < files.length) {
      const file = files[next];
      next += 1;
      const result = await runFile(file);
      done += 1;
      if (result.code !== 0) {
        failed.push(result);
        console.log(`FAIL ${file} (${done}/${files.length})`);
      }
    }
  }
  await Promise.all(Array.from({ length: workers }, worker));

  for (const result of failed.sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(`\n===== ${result.file} =====\n${result.output.trim()}`);
  }
  console.log(`\n${files.length - failed.length} of ${files.length} test files passed.`);
  if (failed.length > 0) {
    console.log(`Failing files:\n${failed.map((r) => `  ${r.file}`).join("\n")}`);
    process.exit(1);
  }
}

main();
