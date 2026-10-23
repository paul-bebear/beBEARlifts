import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { readFileSync } from "fs";
import { createRequire } from "module";
import { resolve } from "path";
import { runInNewContext } from "vm";
import ts from "typescript";
import { ICloudState } from "../src/models/cloudBackup";
import { CloudStore, Supabase_origin } from "../src/utils/supabaseClient";

const filename = resolve("src/utils/supabaseOAuth.native.ts");
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const requireNative = createRequire(filename);
const googleIosClientId = "123456789-example.apps.googleusercontent.com";
const googleUrlScheme = "com.googleusercontent.apps.123456789-example";

describe("Supabase native OAuth adapter", () => {
  let state: ICloudState;
  let apple: { performRequest: sinon.SinonStub; isSupported: boolean };
  let google: { configure: sinon.SinonSpy; signIn: sinon.SinonStub };
  let config: sinon.SinonStub;
  let fetchStub: sinon.SinonStub;
  let platform: { OS: string };
  let oauth: typeof import("../src/utils/supabaseOAuth");

  beforeEach(() => {
    state = { version: 1, signInError: "Old error" };
    sinon.stub(CloudStore, "update").callsFake(async (update) => {
      state = update(state);
    });
    apple = { performRequest: sinon.stub(), isSupported: true };
    google = { configure: sinon.spy(), signIn: sinon.stub() };
    config = sinon.stub().returns({ googleIosClientId, urlSchemes: ["bebear", googleUrlScheme] });
    platform = { OS: "ios" };
    fetchStub = sinon.stub(globalThis, "fetch").callsFake(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "cloud-access",
            refresh_token: "cloud-refresh",
            expires_in: 3600,
            user: { id: "u1", email: "bear@example.com" },
          })
        )
    );
    const exports = {};
    runInNewContext(compiled, {
      exports,
      require: (name: string): unknown => {
        switch (name) {
          case "react-native":
            return { Platform: platform };
          case "@invertase/react-native-apple-authentication":
            return { ...apple, Operation: { LOGIN: 1 }, Scope: { EMAIL: 0 }, Error: { CANCELED: "1001" } };
          case "@react-native-google-signin/google-signin":
            return { GoogleSignin: google, statusCodes: { SIGN_IN_CANCELLED: "-5" } };
          case "../specs/NativeBebearSignInConfig":
            return { getConstants: config };
          default:
            return requireNative(name);
        }
      },
    });
    oauth = exports as typeof oauth;
  });

  afterEach(() => sinon.restore());

  it("exchanges Apple credentials and saves only the cloud session", async () => {
    apple.performRequest.resolves({ identityToken: "apple-identity", nonce: "raw-nonce" });
    expect(await oauth.SupabaseOAuth_start("apple")).to.deep.equal({ ok: true, value: undefined });
    expect(apple.performRequest.firstCall.args[0]).to.deep.equal({
      requestedOperation: 1,
      requestedScopes: [0],
      nonceEnabled: true,
    });
    expect(fetchStub.firstCall.args[0]).to.equal(`${Supabase_origin}/auth/v1/token?grant_type=id_token`);
    const request = fetchStub.firstCall.args[1] as RequestInit;
    expect(request.method).to.equal("POST");
    expect(request.headers).to.have.property("apikey");
    expect(JSON.parse(request.body as string)).to.deep.equal({
      provider: "apple",
      id_token: "apple-identity",
      nonce: "raw-nonce",
    });
    expect(state.session).to.include({ email: "bear@example.com", userId: "u1", accessToken: "cloud-access" });
    expect(JSON.stringify(state)).not.to.match(/apple-identity|raw-nonce/);
    expect(state.signInError).to.equal(undefined);
  });

  it("configures Google with the bundle client ID and exchanges its token", async () => {
    google.signIn.resolves({ type: "success", data: { idToken: "google-identity" } });
    expect(await oauth.SupabaseOAuth_start("google")).to.deep.equal({ ok: true, value: undefined });
    expect(google.configure.firstCall.args[0]).to.deep.equal({ iosClientId: googleIosClientId });
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({
      provider: "google",
      id_token: "google-identity",
    });
    expect(state.session?.refreshToken).to.equal("cloud-refresh");
  });

  it("keeps Apple and Google cancellation silent without contacting Supabase", async () => {
    apple.performRequest.rejects({ code: "1001" });
    google.signIn.resolves({ type: "cancelled", data: null });
    for (const provider of ["apple", "google"] as const) {
      expect(await oauth.SupabaseOAuth_start(provider)).to.deep.equal({ ok: true, value: undefined });
      expect(state.signInError).to.equal(undefined);
    }
    sinon.assert.notCalled(fetchStub);
    expect(state.session).to.equal(undefined);
  });

  it("rejects missing Google settings before calling the native SDK", async () => {
    for (const settings of [{}, { googleIosClientId, urlSchemes: ["bebear"] }]) {
      config.returns(settings);
      expect(await oauth.SupabaseOAuth_start("google")).to.deep.equal({
        ok: false,
        error: "Google sign-in is not set up yet.",
      });
    }
    sinon.assert.notCalled(google.configure);
    sinon.assert.notCalled(google.signIn);
    sinon.assert.notCalled(fetchStub);
  });

  it("reports SDK failures without storing or displaying their details", async () => {
    apple.performRequest.rejects(new Error("private identity token"));
    expect(await oauth.SupabaseOAuth_start("apple")).to.deep.equal({
      ok: false,
      error: "Sign-in did not finish. Try again.",
    });
    sinon.assert.notCalled(fetchStub);
    expect(state.session).to.equal(undefined);
  });

  it("keeps a server refusal and unreadable response out of the session store", async () => {
    google.signIn.resolves({ type: "success", data: { idToken: "google-identity" } });
    for (const response of [
      new Response(JSON.stringify({ error: "private token detail" }), { status: 400 }),
      new Response("not-json"),
    ]) {
      fetchStub.resolves(response);
      expect(await oauth.SupabaseOAuth_start("google")).to.deep.equal({
        ok: false,
        error: "Sign-in did not finish. Try again.",
      });
      expect(state.session).to.equal(undefined);
    }
  });

  it("reports a lost connection and leaves email sign-in available", async () => {
    google.signIn.resolves({ type: "success", data: { idToken: "google-identity" } });
    fetchStub.rejects(new TypeError("Load failed"));
    expect(await oauth.SupabaseOAuth_start("google")).to.deep.equal({ ok: false, error: "No connection" });
    expect(state.session).to.equal(undefined);
  });

  it("leaves browser returns alone and rejects unsupported platforms", async () => {
    expect(oauth.SupabaseOAuth_takeReturn()).to.deep.equal({ kind: "none" });
    await oauth.SupabaseOAuth_finishReturn({ kind: "code", code: "web-code" });
    platform.OS = "android";
    expect(await oauth.SupabaseOAuth_start("google")).to.deep.equal({
      ok: false,
      error: "Google sign-in is not set up yet.",
    });
    sinon.assert.notCalled(google.signIn);
    sinon.assert.notCalled(fetchStub);
  });
});
