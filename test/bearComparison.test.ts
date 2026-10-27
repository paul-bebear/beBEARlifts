import "mocha";
import { expect } from "chai";
import { BearComparison_all, BearComparison_for } from "../src/models/bearComparison";
import { BearTier_all, IBearTierSet } from "../src/models/bearTier";

const maleLines = [
  undefined,
  "a car",
  "a school bus",
  "a humpback whale",
  "a Space Shuttle orbiter",
  "a blue whale",
  "the ISS",
  "a Delta IV Heavy",
  "a P&H 2800XPC mining shovel",
  "a Saturn V",
  "a full Starship",
  "a full Starship",
];
const femaleLines = [
  undefined,
  undefined,
  "an elephant",
  "a school bus",
  "an empty Boeing 737",
  "a Space Shuttle orbiter",
  "the Statue of Liberty",
  "the ISS",
  "a Delta IV Heavy",
  "a Falcon Heavy",
  "a Saturn V",
  "a Saturn V",
];

describe("BearComparison", () => {
  it("lists the objects from light to heavy, so the pick can scan in order", () => {
    const masses = BearComparison_all().map((object) => object.kg);
    expect(masses).to.deep.equal([...masses].sort((a, b) => a - b));
    expect(new Set(masses).size).to.equal(masses.length);
  });

  it("picks the largest object that is not heavier than the number", () => {
    expect(BearComparison_for(1500)).to.equal("a car");
    expect(BearComparison_for(5999)).to.equal("a rhino");
    expect(BearComparison_for(6000)).to.equal("an elephant");
    expect(BearComparison_for(8000)).to.equal("a T. rex");
    expect(BearComparison_for(419999)).to.equal("a fully loaded Boeing 747");
    expect(BearComparison_for(420000)).to.equal("the ISS");
    expect(BearComparison_for(5000000)).to.equal("a full Starship");
    expect(BearComparison_for(99000000)).to.equal("a full Starship");
  });

  it("gives no line below the lightest object or for a bad number", () => {
    expect(BearComparison_for(1499)).to.equal(undefined);
    expect(BearComparison_for(0)).to.equal(undefined);
    expect(BearComparison_for(-5)).to.equal(undefined);
    expect(BearComparison_for(NaN)).to.equal(undefined);
  });

  it("never names an object heavier than the level it describes", () => {
    const sets: IBearTierSet[] = ["male", "female"];
    for (const set of sets) {
      for (const tier of BearTier_all(set)) {
        const name = BearComparison_for(tier.minKg);
        const object = BearComparison_all().find((o) => o.name === name);
        expect(object == null || object.kg <= tier.minKg, `${set} ${tier.name}`).to.equal(true);
      }
    }
  });

  it("reads true for each level in both sets", () => {
    expect(BearTier_all("male").map((tier) => BearComparison_for(tier.minKg))).to.deep.equal(maleLines);
    expect(BearTier_all("female").map((tier) => BearComparison_for(tier.minKg))).to.deep.equal(femaleLines);
  });

  it("gives the first ten levels a different comparison within each set, where one exists", () => {
    for (const set of ["male", "female"] as const) {
      const comparisons = BearTier_all(set)
        .slice(0, 10)
        .map((tier) => BearComparison_for(tier.minKg))
        .filter((name) => name != null);
      expect(new Set(comparisons).size, set).to.equal(comparisons.length);
    }
  });

  it("uses the mining shovel only once its working weight is reached", () => {
    expect(BearComparison_for(1078999)).to.equal("a Delta IV Heavy");
    expect(BearComparison_for(1079000)).to.equal("a P&H 2800XPC mining shovel");
    expect(BearComparison_for(1419999)).to.equal("a P&H 2800XPC mining shovel");
    expect(BearComparison_for(1420000)).to.equal("a Falcon Heavy");
  });

  it("stays within a factor of 3.5 of the level, so the line is not wildly short", () => {
    const sets: IBearTierSet[] = ["male", "female"];
    for (const set of sets) {
      for (const tier of BearTier_all(set).filter((t) => t.minKg > 0)) {
        const name = BearComparison_for(tier.minKg);
        const object = BearComparison_all().find((o) => o.name === name);
        if (object != null) {
          expect(tier.minKg / object.kg, `${set} ${tier.name}`).to.be.lessThan(3.5);
        }
      }
    }
  });
});
