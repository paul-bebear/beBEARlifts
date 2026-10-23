import "mocha";
import { expect } from "chai";
import {
  NativeIdTokenSignIn_appleResponse,
  NativeIdTokenSignIn_googleConfiguration,
  NativeIdTokenSignIn_googleResponse,
  NativeIdTokenSignIn_result,
  NativeIdTokenSignIn_sdkError,
  NativeIdTokenSignIn_tokenPath,
} from "../src/models/nativeIdTokenSignIn";

const failure = { kind: "error", error: "Sign-in did not finish. Try again." };
const googleIosClientId = "123456789-example.apps.googleusercontent.com";
const googleUrlScheme = "com.googleusercontent.apps.123456789-example";

describe("Native ID token sign-in", () => {
  it("sends the Apple identity token with the raw nonce returned by the SDK", () => {
    expect(
      NativeIdTokenSignIn_appleResponse({
        identityToken: "apple-identity",
        nonce: "raw-nonce",
        authorizationCode: "unused-code",
        user: "unused-apple-user",
      })
    ).to.deep.equal({
      kind: "exchange",
      body: { provider: "apple", id_token: "apple-identity", nonce: "raw-nonce" },
    });
    expect(NativeIdTokenSignIn_tokenPath).to.equal("/auth/v1/token?grant_type=id_token");
  });

  it("rejects an Apple response without both its identity token and nonce", () => {
    for (const raw of [
      undefined,
      null,
      "identity-token",
      {},
      { identityToken: "token" },
      { nonce: "raw" },
      { identityToken: "", nonce: "raw" },
      { identityToken: "token", nonce: " " },
      { identityToken: 1, nonce: "raw" },
    ]) {
      expect(NativeIdTokenSignIn_appleResponse(raw)).to.deep.equal(failure);
    }
  });

  it("sends Google's ID token without a nonce or provider access token", () => {
    expect(
      NativeIdTokenSignIn_googleResponse({
        type: "success",
        data: { idToken: "google-identity", accessToken: "unused-access", user: { id: "google-user" } },
      })
    ).to.deep.equal({ kind: "exchange", body: { provider: "google", id_token: "google-identity" } });
  });

  it("treats Google's cancellation response as a quiet cancellation", () => {
    expect(NativeIdTokenSignIn_googleResponse({ type: "cancelled", data: null })).to.deep.equal({ kind: "cancel" });
  });

  it("rejects Google success responses without an ID token", () => {
    for (const raw of [
      undefined,
      null,
      false,
      {},
      { type: "success" },
      { type: "success", data: null },
      { type: "success", data: { idToken: null } },
      { type: "success", data: { idToken: "" } },
      { type: "success", data: { idToken: " " } },
      { type: "success", data: { idToken: 5 } },
      { data: { idToken: "token" } },
    ]) {
      expect(NativeIdTokenSignIn_googleResponse(raw)).to.deep.equal(failure);
    }
  });

  it("recognizes the SDK's cancellation code without exposing its error message", () => {
    expect(NativeIdTokenSignIn_sdkError({ code: "1001" }, "1001")).to.deep.equal({ kind: "cancel" });
    expect(NativeIdTokenSignIn_sdkError({ code: "-5" }, "-5")).to.deep.equal({ kind: "cancel" });
    for (const error of [
      undefined,
      null,
      "1001",
      { code: "1000", message: "private SDK detail" },
      new Error("token"),
    ]) {
      expect(NativeIdTokenSignIn_sdkError(error, "1001")).to.deep.equal(failure);
    }
  });

  it("configures Google only when the matching callback scheme is registered", () => {
    expect(
      NativeIdTokenSignIn_googleConfiguration({ googleIosClientId, urlSchemes: ["bebear", googleUrlScheme] })
    ).to.deep.equal({ iosClientId: googleIosClientId });
    for (const raw of [
      undefined,
      null,
      {},
      { googleIosClientId, urlSchemes: [] },
      { googleIosClientId, urlSchemes: ["bebear", "com.googleusercontent.apps.123456789-other"] },
      { googleIosClientId, urlSchemes: googleUrlScheme },
      { googleIosClientId: "", urlSchemes: [googleUrlScheme] },
      { googleIosClientId: "$(GOOGLE_IOS_CLIENT_ID)", urlSchemes: ["$(GOOGLE_REVERSED_CLIENT_ID)"] },
      { googleIosClientId: "123456789-example.apps.googleusercontent.com.invalid", urlSchemes: [googleUrlScheme] },
      { googleIosClientId: "example.apps.googleusercontent.com", urlSchemes: [googleUrlScheme] },
    ]) {
      expect(NativeIdTokenSignIn_googleConfiguration(raw)).to.equal(undefined);
    }
  });

  it("keeps connection errors plain and hides raw exchange errors", () => {
    expect(NativeIdTokenSignIn_result({ ok: true, value: { accessToken: "session-access" } })).to.deep.equal({
      ok: true,
      value: undefined,
    });
    expect(NativeIdTokenSignIn_result({ ok: false, error: "No connection" })).to.deep.equal({
      ok: false,
      error: "No connection",
    });
    expect(NativeIdTokenSignIn_result({ ok: false, error: "Unacceptable audience: private-token" })).to.deep.equal({
      ok: false,
      error: failure.error,
    });
  });
});
