import "mocha";
import { expect } from "chai";
import { RunEquivalents_pick } from "../src/models/runEquivalents";

describe("RunEquivalents", () => {
  it("chooses repeatable comparisons with readable counts", () => {
    expect(RunEquivalents_pick(5000, 3)).to.deep.equal(RunEquivalents_pick(5000, 3));
    const choices = Array.from({ length: 30 }, (_, seed) => RunEquivalents_pick(5000, seed)!);
    expect(new Set(choices.map((c) => c.text)).size).to.be.greaterThan(10);
    for (const choice of choices) {
      expect(choice.count).to.be.within(2, 999);
      expect(choice.text).to.include(choice.noun);
    }
    expect(RunEquivalents_pick(5000, -1)).not.to.equal(undefined);
  });

  it("omits comparisons for zero or invalid distances", () => {
    expect(RunEquivalents_pick(0, 1)).to.equal(undefined);
    expect(RunEquivalents_pick(-1, 1)).to.equal(undefined);
    expect(RunEquivalents_pick(NaN, 1)).to.equal(undefined);
  });
});
