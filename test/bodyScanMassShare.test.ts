import "mocha";
import { expect } from "chai";
import {
  BodyScanMassShare_afterRead,
  BodyScanMassShare_bodyWeight,
  BodyScanMassShare_formatValue,
  BodyScanMassShare_fromForm,
  BodyScanMassShare_modes,
  BodyScanMassShare_nearestWeight,
  BodyScanMassShare_switch,
} from "../src/models/bodyScanMassShare";
import { BodyScans_fields, BodyScans_parse, IBodyScan, IBodyScanField } from "../src/models/bodyScans";
import { IStatsWeightValue } from "../src/types";

const field = (key: string): IBodyScanField => BodyScans_fields.find((f) => f.key === key)!;
const day = 24 * 3600 * 1000;
const weighIn = (timestamp: number, value: number, unit: "kg" | "lb"): IStatsWeightValue => ({
  vtype: "stat",
  timestamp,
  value: { value, unit },
});

describe("BodyScanMassShare", () => {
  it("stores a percent as kg of the weight typed in the same scan", () => {
    const result = BodyScanMassShare_fromForm(
      { weight: "76.4", muscleMass: "41,2", boneMass: "3.1" },
      { muscleMass: "percent", boneMass: "mass" },
      "kg",
      day,
      undefined
    );
    expect(result).to.deep.equal({
      kind: "ok",
      scan: {
        id: day,
        timestamp: day,
        unit: "kg",
        weight: 76.4,
        muscleMass: 31.48,
        boneMass: 3.1,
        percentEntered: ["muscleMass"],
      },
    });
  });

  it("falls back to the nearest weigh-in and keeps it as the basis", () => {
    const result = BodyScanMassShare_fromForm({ boneMass: "4" }, { boneMass: "percent" }, "kg", day, 80);
    expect(result).to.deep.equal({
      kind: "ok",
      scan: { id: day, timestamp: day, unit: "kg", boneMass: 3.2, percentEntered: ["boneMass"], basisWeight: 80 },
    });
  });

  it("asks for a weight when no weigh-in is near", () => {
    const result = BodyScanMassShare_fromForm({ muscleMass: "40" }, { muscleMass: "percent" }, "lb", day, undefined);
    expect(result).to.deep.equal({
      kind: "error",
      message: "Enter your weight, so muscle mass in % can be saved in lb.",
    });
  });

  it("rejects a percent over 100", () => {
    const result = BodyScanMassShare_fromForm(
      { weight: "80", muscleMass: "140" },
      { muscleMass: "percent" },
      "kg",
      day,
      0
    );
    expect(result).to.deep.equal({ kind: "error", message: "Check these values: Muscle mass" });
  });

  it("picks the closest weigh-in within 30 days, in the scan's unit", () => {
    const weights = [weighIn(10 * day, 180, "lb"), weighIn(3 * day, 82, "kg"), weighIn(60 * day, 70, "kg")];
    expect(BodyScanMassShare_nearestWeight(weights, 8 * day, "kg")).to.be.closeTo(81.65, 0.01);
    expect(BodyScanMassShare_nearestWeight(weights, 4 * day, "kg")).to.equal(82);
    expect(BodyScanMassShare_nearestWeight(weights, 100 * day, "kg")).to.equal(undefined);
    expect(BodyScanMassShare_nearestWeight(undefined, day, "kg")).to.equal(undefined);
  });

  it("prefers the weight typed in the form over the weigh-in", () => {
    expect(BodyScanMassShare_bodyWeight({ weight: "75" }, 80)).to.equal(75);
    expect(BodyScanMassShare_bodyWeight({ weight: "" }, 80)).to.equal(80);
  });

  it("converts the typed value when the user flips the switch", () => {
    expect(BodyScanMassShare_switch({ muscleMass: "32" }, "muscleMass", "percent", 80)).to.deep.equal({
      muscleMass: "40",
    });
    expect(BodyScanMassShare_switch({ muscleMass: "40" }, "muscleMass", "mass", 76.4)).to.deep.equal({
      muscleMass: "30.6",
    });
    expect(BodyScanMassShare_switch({ muscleMass: "40" }, "muscleMass", "mass", undefined)).to.deep.equal({
      muscleMass: "40",
    });
  });

  it("starts each switch in the unit used for that field last time", () => {
    const log = BodyScans_parse({
      scans: [
        { id: 2, timestamp: 2 * day, unit: "kg", weight: 80, boneMass: 3 },
        { id: 1, timestamp: day, unit: "kg", weight: 80, muscleMass: 32, percentEntered: ["muscleMass"] },
      ],
    });
    expect(BodyScanMassShare_modes(log)).to.deep.equal({ muscleMass: "percent", boneMass: "mass" });
  });

  it("puts a field back to mass when a photo fills it", () => {
    expect(BodyScanMassShare_afterRead({ muscleMass: "percent" }, { muscleMass: 31, unit: "kg" })).to.deep.equal({
      muscleMass: "mass",
    });
    expect(BodyScanMassShare_afterRead({ muscleMass: "percent" }, { weight: 80 })).to.deep.equal({
      muscleMass: "percent",
    });
  });

  it("shows the entered unit first and the other beside it", () => {
    const scan: IBodyScan = {
      id: 1,
      timestamp: day,
      unit: "kg",
      weight: 76.4,
      muscleMass: 31.48,
      boneMass: 3.1,
      percentEntered: ["muscleMass"],
    };
    expect(BodyScanMassShare_formatValue(field("muscleMass"), scan)).to.equal("41.2% · 31.5 kg");
    expect(BodyScanMassShare_formatValue(field("boneMass"), scan)).to.equal("3.1 kg · 4.1%");
    expect(BodyScanMassShare_formatValue(field("weight"), scan)).to.equal("76.4 kg");
    expect(
      BodyScanMassShare_formatValue(field("muscleMass"), { id: 2, timestamp: day, unit: "kg", muscleMass: 30 })
    ).to.equal("30 kg");
  });

  it("reads old scans without the new fields", () => {
    const log = BodyScans_parse({
      scans: [{ id: 1, timestamp: day, unit: "kg", muscleMass: 30, percentEntered: "x" }],
    });
    expect(log.scans).to.deep.equal([{ id: 1, timestamp: day, unit: "kg", muscleMass: 30 }]);
  });
});
