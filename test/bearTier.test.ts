import "mocha";
import { expect } from "chai";
import { BearTier_all, BearTier_for, BearTier_progress } from "../src/models/bearTier";

const thresholds = [0, 2000, 10000, 25000, 50000, 100000, 175000, 300000, 420000, 549000, 2970000, 5000000];
const names = [
  "Cub",
  "Teen",
  "Amateur",
  "Rookie",
  "Regular",
  "Strong",
  "Athlete",
  "Power",
  "Titan",
  "Astronaut",
  "Lunar",
  "Mars",
];

describe("BearTier", () => {
  it("lists the twelve levels and their comparison lines", () => {
    expect(BearTier_all().map((tier) => tier.name)).to.deep.equal(names);
    expect(BearTier_all().map((tier) => tier.minKg)).to.deep.equal(thresholds);
    expect(BearTier_all().map((tier) => tier.comparison)).to.deep.equal([
      undefined,
      "more than a car",
      "a T. rex",
      "2 school buses",
      "an empty Boeing 737",
      "a Space Shuttle",
      "a blue whale",
      "2 blue whales",
      "the ISS",
      "a Falcon 9",
      "a Saturn V",
      "a full Starship",
    ]);
  });

  thresholds.forEach((kg, index) => {
    it(`reaches level ${index + 1} at ${kg} kg`, () => {
      expect(BearTier_for(kg).level).to.equal(index + 1);
      expect(BearTier_for(kg - 1).level).to.equal(Math.max(1, index));
    });
  });

  it("measures progress and marks only an increase across a level", () => {
    const progress = BearTier_progress(1900, 6000);
    expect([
      progress.tier.level,
      progress.next?.level,
      progress.kgToNext,
      progress.fraction,
      progress.isTierUp,
    ]).to.deep.equal([2, 3, 4000, 0.5, true]);
    expect(BearTier_progress(6000, 7000).isTierUp).to.equal(false);
  });

  it("has no next level at Mars", () => {
    const progress = BearTier_progress(4999999, 5000000);
    expect([progress.next, progress.kgToNext, progress.fraction, progress.isTierUp]).to.deep.equal([
      undefined,
      0,
      1,
      true,
    ]);
  });

  it("keeps reached levels and progress when the new total is smaller", () => {
    expect(BearTier_progress(60000, 0)).to.deep.equal(BearTier_progress(60000, 60000));
    expect(BearTier_progress(6000000, 0).tier.level).to.equal(12);
    expect(BearTier_progress(0, -100).fraction).to.equal(0);
  });
});
