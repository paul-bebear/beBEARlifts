import "mocha";
import { expect } from "chai";
import { RunEquivalents_pick } from "../src/models/runEquivalents";

describe("RunEquivalents", () => {
  it("chooses repeatable comparisons with readable counts", () => {
    expect(RunEquivalents_pick(5000, 3)).to.deep.equal(RunEquivalents_pick(5000, 3));
    const choices = Array.from({ length: 30 }, (_, seed) => RunEquivalents_pick(5000, seed)!);
    expect(new Set(choices.map((c) => c.text)).size).to.be.greaterThan(10);
    for (const choice of choices) {
      const isSwarm = choice.noun === "honeybees" || choice.noun === "gummy bears";
      expect(isSwarm || (choice.count >= 2 && choice.count <= 9999)).to.equal(true);
      expect(choice.text).to.include(choice.noun);
    }
    expect(choices.some((c) => c.noun === "grizzly bears" && c.number === "2,381")).to.equal(true);
    expect(RunEquivalents_pick(5000, -1)).not.to.equal(undefined);
  });

  it("omits comparisons for zero or invalid distances", () => {
    expect(RunEquivalents_pick(0, 1)).to.equal(undefined);
    expect(RunEquivalents_pick(-1, 1)).to.equal(undefined);
    expect(RunEquivalents_pick(NaN, 1)).to.equal(undefined);
  });
});

describe("RunEquivalents text", () => {
  it("builds the same wording for fixed seeds", () => {
    expect(RunEquivalents_pick(5000, 0)).to.deep.equal(RunEquivalents_pick(5000, 0));
    const texts = [0, 1, 2, 3].map((seed) => RunEquivalents_pick(5000, seed)!.text);
    expect(texts).to.deep.equal([
      "That's 333,333 honeybees nose to tail",
      "You ran 250,000 gummy bears",
      "Same as 7,143 wild salmon lined up nose to tail",
      "You covered 3,846 sun bears",
    ]);
  });
});
