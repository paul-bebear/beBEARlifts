import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  CloudBackupClient_download,
  CloudBackupClient_sendCode,
  CloudBackupClient_signOut,
  CloudBackupClient_upload,
  CloudBackupClient_verify,
  CloudBackup_origin,
  CloudStore,
} from "../src/utils/cloudBackupClient";
import { ICloudState } from "../src/models/cloudBackup";

const now = Date.UTC(2026, 9, 20, 18);
const session = {
  email: "paul@example.com",
  userId: "u1",
  accessToken: "a",
  refreshToken: "r",
  expiresAt: now + 3600000,
};

describe("CloudBackupClient", () => {
  let state: ICloudState;
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    state = { version: 1, session };
    sinon.stub(Date, "now").returns(now);
    sinon.stub(CloudStore, "load").callsFake(async () => state);
    sinon.stub(CloudStore, "update").callsFake(async (update) => {
      state = update(state);
    });
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  it("sends email codes and keeps the server's error text", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ msg: "Email rate limit exceeded" }), { status: 429 }));
    expect(await CloudBackupClient_sendCode(" paul@example.com ")).to.deep.equal({
      ok: false,
      error: "Email rate limit exceeded",
    });
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({
      email: "paul@example.com",
      create_user: true,
    });
    expect(fetchStub.firstCall.args[0]).to.equal(`${CloudBackup_origin}/auth/v1/otp`);
  });

  it("verifies email codes and clears another account's backup time", async () => {
    state = { ...state, lastBackupAt: now - 1000 };
    fetchStub.resolves(
      new Response(
        JSON.stringify({
          access_token: "new-a",
          refresh_token: "new-r",
          expires_in: 3600,
          user: { id: "u2", email: "other@example.com" },
        })
      )
    );
    const result = await CloudBackupClient_verify("other@example.com", " 123456 ");
    expect(result.ok).to.equal(true);
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({
      type: "email",
      email: "other@example.com",
      token: "123456",
    });
    expect(state.session?.userId).to.equal("u2");
    expect(state.lastBackupAt).to.equal(undefined);
  });

  it("uploads latest and weekday files with auth and marks success after both", async () => {
    fetchStub.callsFake(async () => {
      expect(state.lastBackupAt).to.equal(undefined);
      return new Response("{}");
    });
    expect(await CloudBackupClient_upload("backup")).to.deep.equal({ ok: true, value: now });
    expect(fetchStub.firstCall.args[0]).to.equal(`${CloudBackup_origin}/storage/v1/object/backups/u1/latest.json`);
    expect(fetchStub.secondCall.args[0]).to.match(/\/u1\/day-\d.json$/);
    const request = fetchStub.firstCall.args[1] as RequestInit;
    expect(request.body).to.equal("backup");
    expect(request.headers).to.include({
      Authorization: "Bearer a",
      "x-upsert": "true",
      "Content-Type": "application/json",
    });
    expect(state.lastBackupAt).to.equal(now);
  });

  it("leaves the last backup time unchanged when either upload fails", async () => {
    state.lastBackupAt = now - 1000;
    fetchStub.onFirstCall().resolves(new Response("{}"));
    fetchStub.onSecondCall().resolves(new Response(JSON.stringify({ message: "Quota exceeded" }), { status: 413 }));
    expect(await CloudBackupClient_upload("backup")).to.deep.equal({ ok: false, error: "Quota exceeded" });
    expect(state.lastBackupAt).to.equal(now - 1000);
    fetchStub.reset();
    fetchStub.resolves(new Response(JSON.stringify({ message: "Permission denied" }), { status: 403 }));
    expect(await CloudBackupClient_upload("backup")).to.deep.equal({ ok: false, error: "Permission denied" });
    expect(fetchStub.callCount).to.equal(1);
    expect(state.lastBackupAt).to.equal(now - 1000);
  });

  it("refreshes expired tokens before downloading and keeps the backup time", async () => {
    state = { ...state, session: { ...session, expiresAt: now }, lastBackupAt: now - 1000 };
    fetchStub.onFirstCall().resolves(
      new Response(
        JSON.stringify({
          access_token: "refreshed",
          refresh_token: "next-r",
          expires_in: 3600,
          user: { id: "u1", email: session.email },
        })
      )
    );
    fetchStub.onSecondCall().resolves(new Response("backup"));
    expect(await CloudBackupClient_download()).to.deep.equal({ ok: true, value: "backup" });
    expect(fetchStub.firstCall.args[0]).to.include("grant_type=refresh_token");
    expect(fetchStub.secondCall.args[1].headers.Authorization).to.equal("Bearer refreshed");
    expect(state.session?.refreshToken).to.equal("next-r");
    expect(state.lastBackupAt).to.equal(now - 1000);
  });

  it("treats only the missing-object error as an absent backup", async () => {
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify({ message: "Object not found" }), { status: 400 }));
    fetchStub
      .onSecondCall()
      .resolves(new Response(JSON.stringify({ message: "Error 400: bad request" }), { status: 400 }));
    expect(await CloudBackupClient_download()).to.deep.equal({ ok: true, value: undefined });
    expect(await CloudBackupClient_download()).to.deep.equal({ ok: false, error: "Error 400: bad request" });
  });

  it("handles offline requests and refuses uploads after sign-out", async () => {
    fetchStub.rejects(new TypeError("Failed to fetch"));
    expect(await CloudBackupClient_download()).to.deep.equal({ ok: false, error: "No connection" });
    await CloudBackupClient_signOut();
    fetchStub.resetHistory();
    expect(await CloudBackupClient_upload("backup")).to.deep.equal({ ok: false, error: "Not signed in" });
    expect(fetchStub.called).to.equal(false);
    expect(state).to.deep.equal({ version: 1 });
  });
});
