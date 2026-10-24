import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  AccountDelete_objectPaths,
  AccountDelete_signInMessage,
  AccountDelete_userId,
  POST,
} from "../api/account/delete.mjs";
import { Supabase_origin } from "../api/_auth.mjs";

function post(headers: Record<string, string> = { authorization: "Bearer user-jwt" }): Request {
  return new Request("https://lifts.paulbebear.com/api/account/delete", { method: "POST", headers });
}

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("api/account/delete", () => {
  let fetchStub: sinon.SinonStub;
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => {
    sinon.restore();
    if (savedKey == null) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
    }
  });

  it("reads the user id only from a 200 answer", () => {
    expect(AccountDelete_userId(200, { id: "u1" })).to.equal("u1");
    expect(AccountDelete_userId(200, { id: "" })).to.equal(undefined);
    expect(AccountDelete_userId(401, { id: "u1" })).to.equal(undefined);
    expect(AccountDelete_userId(200, undefined)).to.equal(undefined);
  });

  it("turns a storage listing into full paths and skips folders", () => {
    const listing = [
      { id: "a", name: "latest.json" },
      { id: null, name: "nested" },
      { id: "b", name: "day-3.json" },
    ];
    expect(AccountDelete_objectPaths("u1", listing)).to.deep.equal(["u1/latest.json", "u1/day-3.json"]);
    expect(AccountDelete_objectPaths("u1", { error: "x" })).to.equal(undefined);
  });

  it("refuses without the service key or a bearer token", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await POST(post())).status).to.equal(500);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    const missing = await POST(post({}));
    expect(missing.status).to.equal(401);
    expect(await missing.json()).to.deep.equal({ error: AccountDelete_signInMessage });
    expect(fetchStub.called).to.equal(false);
  });

  it("answers 401 when Supabase rejects the token and deletes nothing", async () => {
    fetchStub.resolves(reply({ msg: "invalid JWT" }, 401));
    const response = await POST(post());
    expect(response.status).to.equal(401);
    expect(fetchStub.callCount).to.equal(1);
    expect(fetchStub.firstCall.args[0]).to.equal(`${Supabase_origin}/auth/v1/user`);
    expect(fetchStub.firstCall.args[1].headers.Authorization).to.equal("Bearer user-jwt");
  });

  it("deletes the user's backups and meal photos, then the auth user, with the service key", async () => {
    fetchStub.onCall(0).resolves(reply({ id: "u1" }));
    fetchStub.onCall(1).resolves(
      reply([
        { id: "a", name: "latest.json" },
        { id: "b", name: "day-0.json" },
      ])
    );
    fetchStub.onCall(2).resolves(reply([{ name: "u1/latest.json" }, { name: "u1/day-0.json" }]));
    fetchStub.onCall(3).resolves(reply([{ id: "c", name: "p1.jpg" }]));
    fetchStub.onCall(4).resolves(reply([{ name: "u1/p1.jpg" }]));
    fetchStub.onCall(5).resolves(reply({}));
    const response = await POST(post());
    expect(response.status).to.equal(200);
    expect(await response.json()).to.deep.equal({ deleted: true });

    const [list, remove, listMeals, removeMeals, deleteUser] = [1, 2, 3, 4, 5].map((i) => fetchStub.getCall(i));
    expect(list.args[0]).to.equal(`${Supabase_origin}/storage/v1/object/list/backups`);
    expect(JSON.parse(list.args[1].body).prefix).to.equal("u1");
    expect(list.args[1].headers.apikey).to.equal("sb_secret_test");
    expect(remove.args[0]).to.equal(`${Supabase_origin}/storage/v1/object/backups`);
    expect(remove.args[1].method).to.equal("DELETE");
    expect(JSON.parse(remove.args[1].body)).to.deep.equal({ prefixes: ["u1/latest.json", "u1/day-0.json"] });
    expect(listMeals.args[0]).to.equal(`${Supabase_origin}/storage/v1/object/list/meal-photos`);
    expect(removeMeals.args[0]).to.equal(`${Supabase_origin}/storage/v1/object/meal-photos`);
    expect(JSON.parse(removeMeals.args[1].body)).to.deep.equal({ prefixes: ["u1/p1.jpg"] });
    expect(deleteUser.args[0]).to.equal(`${Supabase_origin}/auth/v1/admin/users/u1`);
    expect(deleteUser.args[1].method).to.equal("DELETE");
    expect(deleteUser.args[1].headers.Authorization).to.equal("Bearer sb_secret_test");
  });

  it("skips the storage delete when the user has no stored files", async () => {
    fetchStub.onCall(0).resolves(reply({ id: "u1" }));
    fetchStub.onCall(1).resolves(reply([]));
    fetchStub.onCall(2).resolves(reply([]));
    fetchStub.onCall(3).resolves(new Response(null, { status: 204 }));
    expect((await POST(post())).status).to.equal(200);
    expect(fetchStub.callCount).to.equal(4);
    expect(fetchStub.lastCall.args[0]).to.equal(`${Supabase_origin}/auth/v1/admin/users/u1`);
  });

  it("keeps the account when the meal photos cannot be deleted", async () => {
    fetchStub.onCall(0).resolves(reply({ id: "u1" }));
    fetchStub.onCall(1).resolves(reply([]));
    fetchStub.onCall(2).resolves(reply([{ id: "c", name: "p1.jpg" }]));
    fetchStub.onCall(3).resolves(reply({ message: "boom" }, 500));
    const response = await POST(post());
    expect(response.status).to.equal(502);
    expect((await response.json()).error).to.include("meal photos");
    expect(fetchStub.callCount).to.equal(4);
  });

  it("keeps the account when the backups cannot be deleted", async () => {
    fetchStub.onCall(0).resolves(reply({ id: "u1" }));
    fetchStub.onCall(1).resolves(reply([{ id: "a", name: "latest.json" }]));
    fetchStub.onCall(2).resolves(reply({ message: "boom" }, 500));
    const response = await POST(post());
    expect(response.status).to.equal(502);
    expect((await response.json()).error).to.include("cloud backups");
    expect(fetchStub.callCount).to.equal(3);
  });

  it("reports a failed auth delete and a Supabase timeout", async () => {
    fetchStub.onCall(0).resolves(reply({ id: "u1" }));
    fetchStub.onCall(1).resolves(reply([]));
    fetchStub.onCall(2).resolves(reply([]));
    fetchStub.onCall(3).resolves(reply({ msg: "Database error deleting user" }, 500));
    expect((await POST(post())).status).to.equal(502);
    fetchStub.reset();
    fetchStub.rejects(new Error("aborted"));
    expect((await POST(post())).status).to.equal(504);
  });
});
