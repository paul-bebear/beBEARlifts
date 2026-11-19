import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const testDir = "supabase/tests";
const localHosts = { localhost: "localhost", "127.0.0.1": "127.0.0.1", "[::1]": "::1" };
const localExample = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
// psql reads a -d value that holds "=" or starts with "postgresql://" as a whole connection string, host included.
const plainName = /^[A-Za-z0-9_-]{1,63}$/;
const redirectingEnv = ["PGHOST", "PGHOSTADDR", "PGPORT", "PGSERVICE", "PGSERVICEFILE", "PGDATABASE", "PGUSER"];

// The live project has no branches, so a test run against it would write to real accounts.
// Node's URL parser and libpq split "#", "," and a second "@" differently, so those URLs are refused,
// and psql gets the parts as separate arguments, never the URL.
export function SqlTests_connection(value) {
  if (!value) {
    return { ok: false, error: `Set SQL_TEST_DB_URL to a local database, for example ${localExample}` };
  }
  if (/[#,?]/.test(value) || value.split("@").length > 2) {
    return { ok: false, error: "SQL_TEST_DB_URL must have no #, comma, query string or second @." };
  }
  let url, user, password, database;
  try {
    url = new URL(value);
    [user, password, database] = [url.username, url.password, url.pathname.slice(1)].map(decodeURIComponent);
  } catch {
    return { ok: false, error: "SQL_TEST_DB_URL is not a URL." };
  }
  const host = Object.hasOwn(localHosts, url.hostname) ? localHosts[url.hostname] : undefined;
  if (!["postgres:", "postgresql:"].includes(url.protocol) || host == null) {
    return { ok: false, error: `Use postgresql:// with localhost, 127.0.0.1 or [::1], not ${url.hostname}` };
  }
  user ||= "postgres";
  database ||= "postgres";
  if (!plainName.test(user) || !plainName.test(database)) {
    return { ok: false, error: "The user and database names may hold only letters, digits, _ and -." };
  }
  return { ok: true, host, port: url.port || "5432", user, password, database };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  const connection = SqlTests_connection(process.env.SQL_TEST_DB_URL);
  if (!connection.ok) {
    fail(connection.error);
  }
  const given = process.argv.slice(2);
  const found = readdirSync(testDir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => path.join(testDir, name));
  const files = (given.length > 0 ? given : found).sort();
  const psql = process.env.PSQL || "psql";
  const env = { ...process.env, PGPASSWORD: connection.password };
  for (const key of redirectingEnv) {
    delete env[key];
  }
  const target = ["-h", connection.host, "-p", connection.port, "-U", connection.user, "-d", connection.database];
  const failed = [];
  for (const file of files) {
    const run = spawnSync(psql, ["-X", "-q", "-v", "ON_ERROR_STOP=1", ...target, "-f", file], {
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

if (process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
