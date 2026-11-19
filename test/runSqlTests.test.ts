import "mocha";
import { expect } from "chai";
import { SqlTests_connection } from "../scripts/run-sql-tests.mjs";

describe("scripts/run-sql-tests", () => {
  it("refuses URLs that libpq would send to another host", () => {
    const refused = [
      undefined,
      "",
      "postgresql://postgres:pw@localhost:54322/postgres#?host=db.x.supabase.co&dbname=postgres",
      "postgresql://a@db.x.supabase.co,@localhost/postgres",
      "postgresql://postgres:pw@localhost.evil.com:5432/postgres",
      "postgresql://postgres:pw@db.x.supabase.co:5432/postgres",
      "postgresql://postgres:pw@127.0.0.1:54322/postgres?host=db.x.supabase.co",
      "postgresql://postgres:pw@127.0.0.1:54322/host%3Ddb.x.supabase.co",
      "postgresql://a@b@localhost/postgres",
      "mysql://postgres@localhost/postgres",
    ];
    for (const url of refused) {
      expect(SqlTests_connection(url).ok, String(url)).to.equal(false);
    }
  });

  it("splits a local URL into the parts psql gets as separate arguments", () => {
    expect(SqlTests_connection("postgresql://postgres:p%40ss@127.0.0.1:54322/postgres")).to.deep.equal({
      ok: true,
      host: "127.0.0.1",
      port: "54322",
      user: "postgres",
      password: "p@ss",
      database: "postgres",
    });
    expect(SqlTests_connection("postgresql://postgres@localhost/postgres")).to.deep.include({
      ok: true,
      host: "localhost",
    });
    expect(SqlTests_connection("postgres://postgres@[::1]:54322/postgres")).to.deep.include({ ok: true, host: "::1" });
  });
});
