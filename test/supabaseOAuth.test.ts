import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ICloudState } from "../src/models/cloudBackup";
import { CloudStore, Supabase_origin } from "../src/utils/supabaseClient";
import { SupabaseOAuth_finishReturn, SupabaseOAuth_start, SupabaseOAuth_takeReturn } from "../src/utils/supabaseOAuth";

const origin = "https://lifts.example.com";
const goodReturn = { kind: "code", code: "abc" } as const;
const session = { access_token: "a", refresh_token: "r", expires_in: 3600, user: { id: "u1", email: "b@example.com" } };

describe("Supabase web OAuth adapter", () => {
  let state: ICloudState;
  let fetchStub: sinon.SinonStub;
  let assign: sinon.SinonSpy;
  let replaceState: sinon.SinonSpy;
  const location = { origin, assign: undefined as unknown as sinon.SinonSpy, href: "" };
  const globals = globalThis as unknown as { window?: unknown };
  const savedWindow = globals.window;
  const pending = (age = 0): ICloudState => ({
    version: 1,
    pending: { provider: "google", verifier: "v1", startedAt: Date.now() - age },
  });

  beforeEach(() => {
    state = { version: 1, signInError: "Old error" };
    sinon.stub(CloudStore, "load").callsFake(async () => state);
    sinon.stub(CloudStore, "update").callsFake(async (update) => {
      state = update(state);
    });
    fetchStub = sinon.stub(globalThis, "fetch");
    assign = sinon.spy();
    replaceState = sinon.spy();
    location.assign = assign;
    globals.window = { location, history: { state: { page: 1 }, replaceState } };
  });

  afterEach(() => {
    globals.window = savedWindow;
    sinon.restore();
  });

  it("start saves the pending verifier, clears the old error and leaves for the provider", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ external: { google: true } })));
    expect(await SupabaseOAuth_start("google")).to.deep.equal({ ok: true, value: undefined });
    expect(state.pending?.provider).to.equal("google");
    expect(state.signInError).to.equal(undefined);
    const url = new URL(assign.firstCall.args[0]);
    expect(url.origin + url.pathname).to.equal(`${Supabase_origin}/auth/v1/authorize`);
    expect(url.searchParams.get("redirect_to")).to.equal(`${origin}/app/?auth=supabase`);
    expect(url.searchParams.get("code_challenge")).to.not.include(state.pending!.verifier);
  });

  it("start does not leave when the provider is off or the server is unreachable", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ external: { google: false } })));
    expect(await SupabaseOAuth_start("google")).to.deep.equal({
      ok: false,
      error: "Google sign-in is not set up yet.",
    });
    fetchStub.rejects(new Error("offline"));
    expect(await SupabaseOAuth_start("apple")).to.deep.equal({ ok: false, error: "No connection" });
    expect(state.pending).to.equal(undefined);
    expect(assign.callCount).to.equal(0);
  });

  it("takeReturn reads a Supabase return, cleans the address bar and ignores a Spotify return", () => {
    location.href = `${origin}/app/?code=spotify`;
    expect(SupabaseOAuth_takeReturn()).to.deep.equal({ kind: "none" });
    expect(replaceState.callCount).to.equal(0);
    location.href = `${origin}/app/?auth=supabase&code=abc`;
    expect(SupabaseOAuth_takeReturn()).to.deep.equal(goodReturn);
    expect(replaceState.firstCall.args).to.deep.equal([{ page: 1 }, "", "/app/"]);
  });

  it("finishReturn exchanges a good return, signs in and clears pending", async () => {
    state = pending();
    fetchStub.resolves(new Response(JSON.stringify(session)));
    await SupabaseOAuth_finishReturn(goodReturn);
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({ auth_code: "abc", code_verifier: "v1" });
    expect([state.pending, state.signInError, state.session?.userId]).to.deep.equal([undefined, undefined, "u1"]);
  });

  it("finishReturn saves an error and skips the exchange for an expired or missing pending sign-in", async () => {
    state = pending(11 * 60 * 1000);
    await SupabaseOAuth_finishReturn(goodReturn);
    expect(state.signInError).to.equal("Sign-in took longer than 10 minutes. Try again.");
    expect(state.pending).to.equal(undefined);
    await SupabaseOAuth_finishReturn(goodReturn);
    expect(state.signInError).to.equal("This sign-in started in another window. Try again here.");
    expect(fetchStub.callCount).to.equal(0);
  });

  it("finishReturn clears pending before a failed exchange and saves a fixed error", async () => {
    state = pending();
    fetchStub.callsFake(async () => {
      expect(state.pending).to.equal(undefined);
      return new Response("{}", { status: 400 });
    });
    await SupabaseOAuth_finishReturn(goodReturn);
    expect(state.signInError).to.equal("Sign-in did not finish. Try again.");
    state = pending();
    fetchStub.rejects(new Error("offline"));
    await SupabaseOAuth_finishReturn(goodReturn);
    expect(state.signInError).to.equal("No connection");
  });
});
