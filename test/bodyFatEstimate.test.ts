import "mocha";
import { expect } from "chai";
import {
  BodyFat_band,
  BodyFat_clamp,
  BodyFat_figure,
  BodyFat_figurePath,
  BodyFat_navy,
  BodyFat_range,
} from "../src/models/bodyFatEstimate";

describe("BodyFatEstimate", () => {
  it("uses a higher slider range for women", () => {
    expect(BodyFat_range("male").min).to.equal(5);
    expect(BodyFat_range("female").min).to.equal(10);
    expect(BodyFat_clamp("female", 4)).to.equal(10);
    expect(BodyFat_clamp("male", 22.6)).to.equal(23);
  });

  it("names the band, shifted 8 points for women", () => {
    expect(BodyFat_band("male", 12).label).to.equal("Lean");
    expect(BodyFat_band("female", 20).label).to.equal("Lean");
    expect(BodyFat_band(undefined, 45).label).to.equal("High");
  });

  it("widens the waist as body fat rises", () => {
    const lean = BodyFat_figure("male", 5);
    const high = BodyFat_figure("male", 40);
    expect(lean.waist).to.equal(14);
    expect(high.waist).to.equal(29);
    expect(BodyFat_figure("male", 22.5).waist).to.equal(21.5);
    expect(BodyFat_figure("male", 99)).to.deep.equal(high);
  });

  it("draws a closed outline centred on x = 50", () => {
    const path = BodyFat_figurePath(BodyFat_figure("female", 25));
    expect(path.startsWith("M 44 38")).to.equal(true);
    expect(path.endsWith("Z")).to.equal(true);
  });

  it("computes the US Navy estimate", () => {
    expect(BodyFat_navy({ sex: "male", heightCm: 180, waistCm: 85, neckCm: 38 })).to.equal(16.1);
    expect(BodyFat_navy({ sex: "female", heightCm: 165, waistCm: 75, neckCm: 33, hipCm: 100 })).to.be.within(28, 32);
  });

  it("rejects impossible measurements", () => {
    expect(BodyFat_navy({ sex: "male", heightCm: 180, waistCm: 38, neckCm: 40 })).to.equal(undefined);
    expect(BodyFat_navy({ sex: "female", heightCm: 165, waistCm: 75, neckCm: 33 })).to.equal(undefined);
    expect(BodyFat_navy({ sex: "male", heightCm: 0, waistCm: 85, neckCm: 38 })).to.equal(undefined);
  });
});
