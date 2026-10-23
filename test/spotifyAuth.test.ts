import "mocha";
import { expect } from "chai";
import { createHash } from "crypto";
import { Sha256_digest } from "../src/models/sha256";
import {
  SpotifyAuth_codeChallenge,
  SpotifyAuth_nativeRedirectUri,
  SpotifyAuth_readAuthSession,
} from "../src/models/spotifyAuth";

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

describe("Sha256_digest", () => {
  it("matches the FIPS 180-2 vectors", () => {
    expect(hex(Sha256_digest(new Uint8Array()))).to.equal(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    expect(hex(Sha256_digest(new TextEncoder().encode("abc")))).to.equal(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("matches Node crypto for every length across the 55, 56 and 64 byte padding edges", () => {
    for (let length = 0; length < 300; length += 1) {
      const message = new Uint8Array(Array.from({ length }, (_, i) => (i * 31 + length) % 256));
      expect(hex(Sha256_digest(message)), `length ${length}`).to.equal(
        createHash("sha256").update(message).digest("hex")
      );
    }
  });
});

describe("SpotifyAuth native login", () => {
  it("makes the RFC 7636 S256 challenge without crypto.subtle", () => {
    expect(SpotifyAuth_codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).to.equal(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });

  it("reads the code from the custom-scheme callback", () => {
    const url = `${SpotifyAuth_nativeRedirectUri}?code=abc123&state=s1`;
    expect(SpotifyAuth_readAuthSession({ type: "success", url }, "s1")).to.deep.equal({ kind: "code", code: "abc123" });
  });

  it("rejects a callback whose state does not match", () => {
    const url = `${SpotifyAuth_nativeRedirectUri}?code=abc123&state=other`;
    expect(SpotifyAuth_readAuthSession({ type: "success", url }, "s1").kind).to.equal("error");
  });

  it("says the login was cancelled when the user denies access on Spotify", () => {
    const url = `${SpotifyAuth_nativeRedirectUri}?error=access_denied&state=s1`;
    expect(SpotifyAuth_readAuthSession({ type: "success", url }, "s1")).to.deep.equal({
      kind: "error",
      message: "Spotify login was cancelled.",
    });
  });

  it("shows nothing when the user closes the login sheet", () => {
    expect(SpotifyAuth_readAuthSession({ type: "cancel" }, "s1")).to.deep.equal({ kind: "none" });
    expect(SpotifyAuth_readAuthSession({ type: "dismiss" }, "s1")).to.deep.equal({ kind: "none" });
  });

  it("reports a callback that carries neither a code nor an error", () => {
    expect(SpotifyAuth_readAuthSession({ type: "success", url: SpotifyAuth_nativeRedirectUri }, "s1")).to.deep.equal({
      kind: "error",
      message: "Spotify login came back without a code. Try again.",
    });
  });
});
