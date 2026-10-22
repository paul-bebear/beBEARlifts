import "mocha";
import { expect } from "chai";
import {
  BearTier_all,
  BearTier_byLevel,
  BearTier_for,
  BearTier_progress,
  BearTier_setFor,
  IBearTierSet,
} from "../src/models/bearTier";

const maleThresholds = [0, 5000, 25000, 60000, 120000, 220000, 380000, 600000, 900000, 1400000, 3500000, 7000000];
const femaleThresholds = [0, 3000, 15000, 36000, 72000, 132000, 228000, 360000, 540000, 840000, 2100000, 4200000];
const thresholds: Record<IBearTierSet, number[]> = { male: maleThresholds, female: femaleThresholds };
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
const gyms = [
  "bedroom",
  "bedroom",
  "bedroom",
  "garage",
  "garage",
  "garage",
  "pro",
  "pro",
  "pro",
  "spaceship",
  "moon",
  "mars",
];
const sets: IBearTierSet[] = ["male", "female"];

describe("BearTier", () => {
  sets.forEach((set) => {
    describe(`${set} set`, () => {
      it("lists the twelve levels with their thresholds", () => {
        expect(BearTier_all(set).map((tier) => tier.name)).to.deep.equal(names);
        expect(BearTier_all(set).map((tier) => tier.minKg)).to.deep.equal(thresholds[set]);
        expect(BearTier_all(set).map((tier) => tier.level)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        expect(BearTier_all(set).map((tier) => tier.gym)).to.deep.equal(gyms);
      });

      thresholds[set].forEach((kg, index) => {
        it(`reaches level ${index + 1} at ${kg} kg`, () => {
          expect(BearTier_for(kg, set).level).to.equal(index + 1);
          expect(BearTier_for(kg - 1, set).level).to.equal(Math.max(1, index));
        });
      });
    });
  });

  it("keeps names, sizes and gyms the same in both sets, so only minKg depends on the set", () => {
    const strip = (set: IBearTierSet): unknown[] =>
      BearTier_all(set).map(({ minKg, ...level }) => {
        expect(minKg).to.be.at.least(0);
        return level;
      });
    expect(strip("female")).to.deep.equal(strip("male"));
  });

  it("makes the women's numbers 0.6 of the men's, rounded to the nearest 1,000", () => {
    BearTier_all("male").forEach((tier, i) => {
      expect(BearTier_all("female")[i].minKg).to.equal(Math.round((tier.minKg * 0.6) / 1000) * 1000);
    });
  });

  it("finds a level by number without a set, and rejects unknown numbers", () => {
    expect(BearTier_byLevel(3)?.name).to.equal("Amateur");
    expect(BearTier_byLevel(12)?.gym).to.equal("mars");
    expect(BearTier_byLevel(0)).to.equal(undefined);
    expect(BearTier_byLevel(13)).to.equal(undefined);
  });

  describe("BearTier_setFor", () => {
    it("takes the food profile sex first", () => {
      expect(BearTier_setFor("female", "male")).to.equal("female");
      expect(BearTier_setFor("male", "female")).to.equal("male");
    });

    it("falls back to the bear line when the profile has no sex", () => {
      expect(BearTier_setFor(undefined, "female")).to.equal("female");
      expect(BearTier_setFor(undefined, "male")).to.equal("male");
    });

    it("falls back to the men's set when neither exists", () => {
      expect(BearTier_setFor(undefined, undefined)).to.equal("male");
    });
  });

  it("measures progress and marks only an increase across a level", () => {
    const progress = BearTier_progress(4000, 15000, "male");
    expect([
      progress.tier.level,
      progress.next?.level,
      progress.kgToNext,
      progress.fraction,
      progress.isTierUp,
    ]).to.deep.equal([2, 3, 10000, 0.5, true]);
    expect(BearTier_progress(15000, 16000, "male").isTierUp).to.equal(false);
  });

  it("measures the same kg against each set's own thresholds", () => {
    const male = BearTier_progress(0, 18000, "male");
    const female = BearTier_progress(0, 18000, "female");
    expect([male.tier.name, male.next?.name, male.kgToNext]).to.deep.equal(["Teen", "Amateur", 7000]);
    expect([female.tier.name, female.next?.name, female.kgToNext]).to.deep.equal(["Amateur", "Rookie", 18000]);
  });

  it("has no next level at Mars", () => {
    const progress = BearTier_progress(6999999, 7000000, "male");
    expect([progress.next, progress.kgToNext, progress.fraction, progress.isTierUp]).to.deep.equal([
      undefined,
      0,
      1,
      true,
    ]);
    expect(BearTier_progress(0, 4200000, "female").next).to.equal(undefined);
  });

  it("keeps reached levels and progress when the new total is smaller", () => {
    expect(BearTier_progress(60000, 0, "male")).to.deep.equal(BearTier_progress(60000, 60000, "male"));
    expect(BearTier_progress(7000000, 0, "male").tier.level).to.equal(12);
    expect(BearTier_progress(0, -100, "male").fraction).to.equal(0);
  });
});
