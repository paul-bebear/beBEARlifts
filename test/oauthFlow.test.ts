import "mocha";
import { expect } from "chai";
import {
  OAuthFlow_authorizeUrl,
  OAuthFlow_exchangeErrorText,
  OAuthFlow_nextStep,
  OAuthFlow_notSetUpText,
  OAuthFlow_parsePending,
  OAuthFlow_providerEnabled,
  OAuthFlow_readReturn,
  OAuthFlow_redirectTo,
  OAuthFlow_tokenBody,
  IOAuthPending,
} from "../src/models/oauthFlow";

const now = Date.UTC(2026, 9, 22, 12);
const pending: IOAuthPending = { provider: "google", verifier: "v".repeat(64), startedAt: now - 60 * 1000 };
const app = "https://lifts.paulbebear.com";

describe("OAuthFlow", () => {
  it("builds the authorize URL with the marked return and an S256 challenge", () => {
    const url = new URL(
      OAuthFlow_authorizeUrl({
        supabaseOrigin: "https://qvqwvuuwfueccrmzwyct.supabase.co",
        provider: "apple",
        redirectTo: OAuthFlow_redirectTo(app),
        codeChallenge: "abc-_",
      })
    );
    expect(url.origin + url.pathname).to.equal("https://qvqwvuuwfueccrmzwyct.supabase.co/auth/v1/authorize");
    expect(url.searchParams.get("provider")).to.equal("apple");
    expect(url.searchParams.get("redirect_to")).to.equal("https://lifts.paulbebear.com/app/?auth=supabase");
    expect(url.searchParams.get("code_challenge")).to.equal("abc-_");
    expect(url.searchParams.get("code_challenge_method")).to.equal("s256");
  });

  it("reads only a provider that Supabase reports as on", () => {
    const settings = { external: { apple: false, google: true } };
    expect(OAuthFlow_providerEnabled(settings, "google")).to.equal(true);
    expect(OAuthFlow_providerEnabled(settings, "apple")).to.equal(false);
    expect(OAuthFlow_providerEnabled({}, "google")).to.equal(false);
    expect(OAuthFlow_providerEnabled(undefined, "google")).to.equal(false);
    expect(OAuthFlow_notSetUpText("apple")).to.equal("Apple sign-in is not set up yet.");
  });

  it("keeps a complete pending state and drops a broken one", () => {
    expect(OAuthFlow_parsePending(pending)).to.deep.equal(pending);
    expect(OAuthFlow_parsePending({ ...pending, provider: "github" })).to.equal(undefined);
    expect(OAuthFlow_parsePending({ ...pending, verifier: "" })).to.equal(undefined);
    expect(OAuthFlow_parsePending({ provider: "apple", verifier: "v" })).to.equal(undefined);
    expect(OAuthFlow_parsePending(undefined)).to.equal(undefined);
  });

  it("leaves the Spotify return and a plain launch alone", () => {
    expect(OAuthFlow_readReturn(`${app}/app/?code=spotify&state=s`)).to.deep.equal({ kind: "none" });
    expect(OAuthFlow_readReturn(`${app}/app/`)).to.deep.equal({ kind: "none" });
  });

  it("reads the code from a marked return", () => {
    expect(OAuthFlow_readReturn(`${app}/app/?auth=supabase&code=c1`)).to.deep.equal({ kind: "code", code: "c1" });
  });

  it("turns a provider error into a plain message", () => {
    expect(OAuthFlow_readReturn(`${app}/app/?auth=supabase&error=access_denied`)).to.deep.equal({
      kind: "error",
      message: "Sign-in was cancelled.",
    });
    expect(
      OAuthFlow_readReturn(`${app}/app/?auth=supabase&error=server_error&error_description=Email+not+confirmed`)
    ).to.deep.equal({ kind: "error", message: "Sign-in failed: Email not confirmed" });
    expect(OAuthFlow_readReturn(`${app}/app/?auth=supabase#error=server_error`)).to.deep.equal({
      kind: "error",
      message: "Sign-in failed: server_error",
    });
    expect(OAuthFlow_readReturn(`${app}/app/?auth=supabase`).kind).to.equal("error");
  });

  it("exchanges the code with the stored verifier for 10 minutes", () => {
    const code = { kind: "code" as const, code: "c1" };
    expect(OAuthFlow_nextStep(code, pending, now)).to.deep.equal({
      kind: "exchange",
      code: "c1",
      verifier: pending.verifier,
    });
    expect(OAuthFlow_nextStep(code, { ...pending, startedAt: now - 10 * 60 * 1000 }, now).kind).to.equal("exchange");
    expect(OAuthFlow_nextStep(code, { ...pending, startedAt: now - 11 * 60 * 1000 }, now)).to.deep.equal({
      kind: "error",
      message: "Sign-in took longer than 10 minutes. Try again.",
    });
  });

  it("explains a return that has no pending state on this device", () => {
    expect(OAuthFlow_nextStep({ kind: "code", code: "c1" }, undefined, now)).to.deep.equal({
      kind: "error",
      message: "This sign-in started in another window. Try again here.",
    });
  });

  it("passes a return error through unchanged", () => {
    const error = { kind: "error" as const, message: "Sign-in was cancelled." };
    expect(OAuthFlow_nextStep(error, pending, now)).to.deep.equal(error);
  });

  it("sends the PKCE body Supabase expects and hides raw exchange errors", () => {
    expect(OAuthFlow_tokenBody("c1", "v1")).to.deep.equal({ auth_code: "c1", code_verifier: "v1" });
    expect(OAuthFlow_exchangeErrorText("No connection")).to.equal("No connection");
    expect(OAuthFlow_exchangeErrorText("invalid flow state, no valid flow state found")).to.equal(
      "Sign-in did not finish. Try again."
    );
  });
});
