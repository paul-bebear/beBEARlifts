import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const testDir = "supabase/tests";
const localHosts = ["localhost", "127.0.0.1"];
const localExample = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function fail(message) {
  console.error(message);
  process.exit(1);
}

// The live project has no branches, so a test run against it would write to real accounts.
// Query parameters are refused because psql reads host, hostaddr and service from them.
function localUrlError(value) {
  if (!value) {
    return `Set SQL_TEST_DB_URL to a local database, for example ${localExample}`;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return "SQL_TEST_DB_URL is not a URL.";
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    return "SQL_TEST_DB_URL must start with postgresql://";
  }
  if (!localHosts.includes(url.hostname)) {
    return `SQL_TEST_DB_URL points at ${url.hostname}. Only localhost and 127.0.0.1 are allowed.`;
  }
  if (url.search !== "") {
    return "SQL_TEST_DB_URL must have no query parameters.";
  }
  return undefined;
}

function main() {
  const dbUrl = process.env.SQL_TEST_DB_URL;
  const urlError = localUrlError(dbUrl);
  if (urlError != null) {
    fail(urlError);
  }
  const given = process.argv.slice(2);
  const found = readdirSync(testDir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => path.join(testDir, name));
  const files = (given.length > 0 ? given : found).sort();
  const psql = process.env.PSQL || "psql";
  const env = { ...process.env };
  for (const key of ["PGHOST", "PGHOSTADDR", "PGSERVICE", "PGSERVICEFILE"]) {
    delete env[key];
  }
  const failed = [];
  for (const file of files) {
    const run = spawnSync(psql, ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", dbUrl, "-f", file], {
      env,
      encoding: "utf8",
    });
    if (run.error != null) {
      fail(
        `Could not start ${psql}: ${run.error.message}. Install it with brew install libpq, or set PSQL to its path.`
      );
    }
    if (run.status === 0) {
      console.log(`ok   ${file}`);
    } else {
      failed.push(file);
      console.log(`FAIL ${file}\n${(run.stderr || run.stdout).trim()}`);
    }
  }
  console.log(`\n${files.length - failed.length} of ${files.length} SQL test files passed.`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
