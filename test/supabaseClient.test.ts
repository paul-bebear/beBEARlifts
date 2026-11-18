import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  CloudStore,
  SupabaseClient_accessToken,
  SupabaseClient_call,
  SupabaseClient_errorText,
  SupabaseClient_onForcedSignOut,
  Supabase_notSignedIn,
  Supabase_origin,
} from "../src/utils/supabaseClient";
import { ICloudSession, ICloudState } from "../src/models/cloudBackup";

describe("Supabase error text", () => {
  it("explains a wrong or expired code and the resend limit in plain words", () => {
    expect(SupabaseClient_errorText("/auth/v1/verify", 403, { msg: "Token has expired or is invalid" })).to.equal(
      "That code is wrong or expired. Send a new code."
    );
    expect(SupabaseClient_errorText("/auth/v1/otp", 429, { msg: "For security purposes, you can only…" })).to.equal(
      "Wait a minute before asking for another code."
    );
    expect(SupabaseClient_errorText("/auth/v1/otp", 429, { msg: "Email rate limit exceeded" })).to.equal(
      "Too many sign-in emails went out this hour. Try again later."
    );
  });
  it("keeps database messages, such as the lookup limit, and hides the vendor name", () => {
    expect(
      SupabaseClient_errorText("/rest/v1/rpc/find_profile", 429, { message: "Daily profile lookup allowance reached" })
    ).to.equal("Daily profile lookup allowance reached");
    expect(SupabaseClient_errorText("/rest/v1/profiles", 500, { error: "Supabase is down" })).to.equal(
      "The server is down"
    );
    expect(SupabaseClient_errorText("/rest/v1/profiles", 502, undefined)).to.equal("The server returned 502.");
  });
  it("reads the OAuth error_description shape and ignores a message that is not text", () => {
    expect(
      SupabaseClient_errorText("/auth/v1/token", 400, {
        error: "invalid_grant",
        error_description: "Refresh Token Not Found",
      })
    ).to.equal("Refresh Token Not Found");
    expect(SupabaseClient_errorText("/rest/v1/posts", 400, { message: { code: 1 } })).to.equal(
      "The server returned 400."
    );
  });
});

describe("SupabaseClient_call", () => {
  afterEach(() => sinon.restore());

  it("says No connection when fetch rejects", async () => {
    sinon.stub(globalThis, "fetch").rejects(new TypeError("Load failed"));
    expect(await SupabaseClient_call("/rest/v1/profiles", {})).to.deep.equal({ ok: false, error: "No connection" });
  });

  it("reads the error from a body that is not JSON", async () => {
    sinon.stub(globalThis, "fetch").resolves(new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(await SupabaseClient_call("/rest/v1/profiles", {})).to.deep.equal({
      ok: false,
      error: "The server returned 502.",
    });
  });
});

describe("SupabaseClient_accessToken", () => {
  const now = 1_800_000_000_000;
  const session: ICloudSession = {
    email: "bear@example.com",
    userId: "u1",
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: now + 30 * 1000,
  };
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

  it("reports not signed in without calling the server", async () => {
    state = { version: 1 };
    expect(await SupabaseClient_accessToken()).to.deep.equal({ ok: false, error: Supabase_notSignedIn });
    sinon.assert.notCalled(fetchStub);
  });

  it("uses a token that has more than a minute left without calling the server", async () => {
    state = { version: 1, session: { ...session, expiresAt: now + 10 * 60 * 1000 } };
    expect(await SupabaseClient_accessToken()).to.deep.equal({ ok: true, value: "old-access" });
    sinon.assert.notCalled(fetchStub);
  });

  it("refreshes a token about to expire and saves the new session", async () => {
    fetchStub.resolves(
      new Response(
        JSON.stringify({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
          user: { id: "u1", email: "bear@example.com" },
        }),
        { status: 200 }
      )
    );
    expect(await SupabaseClient_accessToken()).to.deep.equal({ ok: true, value: "new-access" });
    expect(fetchStub.firstCall.args[0]).to.equal(`${Supabase_origin}/auth/v1/token?grant_type=refresh_token`);
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({ refresh_token: "old-refresh" });
    expect(state.session).to.deep.equal({
      ...session,
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: now + 3600 * 1000,
    });
  });

  it("signs out this phone and clears the account caches when the server refuses the refresh token", async () => {
    const bodies = [
      { error: "invalid_grant", error_description: "Refresh Token Not Found" },
      { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" },
    ];
    for (const body of bodies) {
      const cleared = sinon.stub().resolves();
      SupabaseClient_onForcedSignOut(cleared);
      state = { version: 1, session, ownerUserId: "u1", lastBackupAt: now - 1000 };
      fetchStub.resolves(new Response(JSON.stringify(body), { status: 400 }));
      expect(await SupabaseClient_accessToken()).to.deep.equal({ ok: false, error: Supabase_notSignedIn });
      expect(state.session).to.equal(undefined);
      expect(state.lastBackupAt).to.equal(undefined);
      expect(state.ownerUserId).to.equal("u1");
      sinon.assert.calledOnce(cleared);
    }
  });

  it("keeps the session on a 401, which the gateway can send for any user", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 }));
    expect(await SupabaseClient_accessToken()).to.deep.equal({ ok: false, error: "Invalid API key" });
    expect(state.session).to.deep.equal(session);
  });

  it("keeps a session that signed in while the refused refresh was on its way", async () => {
    const cleared = sinon.stub().resolves();
    SupabaseClient_onForcedSignOut(cleared);
    const next = { ...session, userId: "u2", refreshToken: "new-refresh" };
    fetchStub.callsFake(async () => {
      state = { version: 1, session: next };
      return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    });
    const result = await SupabaseClient_accessToken();
    expect(result.ok).to.equal(false);
    expect(state.session).to.deep.equal(next);
    sinon.assert.notCalled(cleared);
  });

  it("keeps the session when the refresh fails for a server or network reason", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ message: "Service unavailable" }), { status: 503 }));
    expect(await SupabaseClient_accessToken()).to.deep.equal({ ok: false, error: "Service unavailable" });
    expect(state.session).to.deep.equal(session);
    fetchStub.rejects(new TypeError("Load failed"));
    expect(await SupabaseClient_accessToken()).to.deep.equal({ ok: false, error: "No connection" });
    expect(state.session).to.deep.equal(session);
  });

  it("does not save an answer it cannot read", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ access_token: "new-access" }), { status: 200 }));
    expect(await SupabaseClient_accessToken()).to.deep.equal({
      ok: false,
      error: "The server sent an answer the app could not read.",
    });
    expect(state.session).to.deep.equal(session);
  });
});
