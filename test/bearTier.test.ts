import "mocha";
import { expect } from "chai";
import { BearTier_all, BearTier_for, BearTier_progress } from "../src/models/bearTier";

describe("BearTier", () => {
  it("goes from Cub to Kodiak at the planned thresholds", () => {
    expect(BearTier_all().map((t) => t.name)).to.deep.equal([
      "Cub",
      "Sun bear",
      "Black bear",
      "Grizzly",
      "Polar",
      "Kodiak",
    ]);
    expect([0, 24999, 25000, 499999, 500000, 5e6].map((kg) => BearTier_for(kg).name)).to.deep.equal([
      "Cub",
      "Cub",
      "Sun bear",
      "Black bear",
      "Grizzly",
      "Kodiak",
    ]);
  });

  it("measures the way to the next tier and flags a tier-up", () => {
    const p = BearTier_progress(400000, 1000000);
    expect([p.tier.name, p.next?.name, p.kgToNext, p.fraction, p.isTierUp]).to.deep.equal([
      "Grizzly",
      "Polar",
      500000,
      0.5,
      true,
    ]);
    expect(BearTier_progress(510000, 520000).isTierUp).to.equal(false);
  });

  it("is full at the top tier", () => {
    const p = BearTier_progress(6e6, 7e6);
    expect([p.next, p.kgToNext, p.fraction]).to.deep.equal([undefined, 0, 1]);
  });
});
