import "mocha";
import { expect } from "chai";
import { createHash } from "crypto";
import {
  Pkce_alphabet,
  Pkce_base64Url,
  Pkce_challenge,
  Pkce_pair,
  Pkce_randomString,
  Pkce_verifierLength,
} from "../src/models/pkce";

function queue(chunks: number[][]): (count: number) => Uint8Array {
  const calls = chunks.slice();
  return (count) => new Uint8Array((calls.shift() ?? []).slice(0, count));
}

describe("Pkce", () => {
  it("keeps the RFC 7636 alphabet of 66 characters", () => {
    expect(Pkce_alphabet).to.have.length(66);
    expect(Pkce_alphabet).to.match(/^[A-Za-z0-9\-._~]+$/);
  });

  it("skips bytes 198 and up, so each of the 66 characters is equally likely", () => {
    const result = Pkce_randomString(
      3,
      queue([
        [0, 198, 255],
        [65, 197],
      ])
    );
    expect(result).to.equal("A~~");
  });

  it("maps every accepted byte value to each character exactly 3 times", () => {
    const counts = new Map<string, number>();
    const bytes = Array.from({ length: 256 }, (_, i) => i);
    const result = Pkce_randomString(198, queue([bytes]));
    for (const ch of result) {
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    expect(counts.size).to.equal(66);
    expect(Array.from(counts.values()).every((n) => n === 3)).to.equal(true);
  });

  it("asks for more bytes until the string is long enough", () => {
    const asked: number[] = [];
    const source = queue([
      [250, 250, 1],
      [2, 3],
    ]);
    const result = Pkce_randomString(3, (count) => {
      asked.push(count);
      return source(count);
    });
    expect(result).to.equal("BCD");
    expect(asked).to.deep.equal([3, 2]);
  });

  it("makes a 64-character verifier from the default random source", () => {
    const { verifier } = Pkce_pair();
    expect(verifier).to.have.length(Pkce_verifierLength);
    expect(verifier).to.match(/^[A-Za-z0-9\-._~]{64}$/);
  });

  it("makes the RFC 7636 S256 challenge", () => {
    expect(Pkce_challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).to.equal(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });

  it("pairs the verifier with the challenge Node crypto computes", () => {
    const { verifier, challenge } = Pkce_pair();
    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(challenge).to.equal(expected);
  });

  it("encodes base64url with no padding and no + or /", () => {
    expect(Pkce_base64Url(new Uint8Array([0xfb, 0xff]))).to.equal("-_8");
  });
});
