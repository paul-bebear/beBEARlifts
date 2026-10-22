import "mocha";
import { expect } from "chai";
import { BearCelebration_seed, BearCelebration_setLine, BearCelebration_step } from "../src/models/bearCelebration";
import { BearStoreData_empty } from "../src/models/bearStoreData";

describe("BearCelebration", () => {
  it("seeds an existing user at the level reached, with no celebration", () => {
    const step = BearCelebration_step(BearStoreData_empty(), 60000);
    expect(step.levelUp).to.equal(undefined);
    expect(step.store).to.deep.equal({ celebratedLevel: 5, seenBadges: [], seeded: true });
  });

  it("seeds a new user at level 1, so the first level-up still shows", () => {
    const seeded = BearCelebration_step(BearStoreData_empty(), 0).store;
    expect(seeded.celebratedLevel).to.equal(1);
    const step = BearCelebration_step(seeded, 2500);
    expect(step.levelUp).to.deep.equal({ from: 1, to: 2 });
    expect(step.store.celebratedLevel).to.equal(2);
  });

  it("never lowers a celebrated level when seeding", () => {
    const store = { ...BearStoreData_empty(), celebratedLevel: 7 };
    expect(BearCelebration_seed(store, 0).celebratedLevel).to.equal(7);
  });

  it("shows one card when an import crosses several levels", () => {
    const store = { ...BearStoreData_empty(), seeded: true as const };
    expect(BearCelebration_step(store, 30000).levelUp).to.deep.equal({ from: 1, to: 4 });
  });

  it("returns the same store when nothing changed, so nothing is written", () => {
    const store = { ...BearStoreData_empty(), celebratedLevel: 3, seeded: true as const };
    expect(BearCelebration_step(store, 12000).store).to.equal(store);
    expect(BearCelebration_seed(store, 999999)).to.equal(store);
    expect(BearCelebration_setLine({ ...store, line: "female" }, "female").line).to.equal("female");
  });

  it("sets the line the user picks", () => {
    expect(BearCelebration_setLine(BearStoreData_empty(), "female")).to.deep.equal({
      ...BearStoreData_empty(),
      line: "female",
    });
  });
});
