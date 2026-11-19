import "mocha";
import { expect } from "chai";
import { RandomBytes_get } from "../src/utils/randomBytes";
import { MealPost_isId, MealPost_newId } from "../src/models/mealPost";

describe("RandomBytes_get", () => {
  it("uses crypto.getRandomValues when the engine has it", () => {
    const source = { crypto: { getRandomValues: (a: Uint8Array): Uint8Array => a.fill(7) } };
    expect(Array.from(RandomBytes_get(4, source))).to.deep.equal([7, 7, 7, 7]);
  });

  it("returns the asked length from the engine crypto", () => {
    expect(RandomBytes_get(64)).to.have.length(64);
    expect(RandomBytes_get(24)).to.have.length(24);
  });

  it("returns different bytes on two calls", () => {
    expect(Array.from(RandomBytes_get(32))).to.not.deep.equal(Array.from(RandomBytes_get(32)));
  });

  it("falls back to Math.random when crypto is missing, as on Hermes", () => {
    expect(Array.from(RandomBytes_get(3, {}, () => 0.5))).to.deep.equal([128, 128, 128]);
  });

  it("returns the asked length and different bytes on the fallback", () => {
    const a = RandomBytes_get(64, {});
    const b = RandomBytes_get(64, {});
    expect(a).to.have.length(64);
    expect(Array.from(a)).to.not.deep.equal(Array.from(b));
  });

  it("makes a valid meal post id without crypto", () => {
    expect(MealPost_isId(MealPost_newId(RandomBytes_get(16, {})))).to.equal(true);
  });
});
