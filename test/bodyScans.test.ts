import "mocha";
import { expect } from "chai";
import {
  BodyScans_change,
  BodyScans_empty,
  BodyScans_fields,
  BodyScans_formatDelta,
  BodyScans_fromForm,
  BodyScans_parse,
  BodyScans_put,
  BodyScans_readForm,
  BodyScans_remove,
  BodyScans_toStats,
  IBodyScan,
  IBodyScanField,
} from "../src/models/bodyScans";

const field = (key: string): IBodyScanField => BodyScans_fields.find((f) => f.key === key)!;
const day = 24 * 3600 * 1000;

describe("BodyScans", () => {
  it("reads a form, skipping blank fields and accepting a comma decimal", () => {
    const result = BodyScans_readForm({ weight: "82,4", bodyFatPct: "18", muscleMass: " " });
    expect(result).to.deep.equal({ kind: "ok", values: { weight: 82.4, bodyFatPct: 18 } });
  });

  it("rejects a percentage over 100 and names the field", () => {
    expect(BodyScans_readForm({ waterPct: "120", weight: "80" })).to.deep.equal({
      kind: "invalid",
      labels: ["Body water"],
    });
  });

  it("calls an all-blank form empty", () => {
    expect(BodyScans_readForm({ weight: "" })).to.deep.equal({ kind: "empty" });
  });

  it("builds a scan from the form, or a message for the user", () => {
    expect(BodyScans_fromForm({ weight: "80" }, "kg", day)).to.deep.equal({
      kind: "ok",
      scan: { id: day, timestamp: day, unit: "kg", weight: 80 },
    });
    expect(BodyScans_fromForm({ bodyFatPct: "-2" }, "kg", day)).to.deep.equal({
      kind: "error",
      message: "Check these values: Body fat",
    });
  });

  it("keeps scans newest first and removes by id", () => {
    const a: IBodyScan = { id: 1, timestamp: day, unit: "kg", weight: 80 };
    const b: IBodyScan = { id: 2, timestamp: 2 * day, unit: "kg", weight: 81 };
    const log = BodyScans_put(BodyScans_put(BodyScans_empty(), a), b);
    expect(log.scans.map((s) => s.id)).to.deep.equal([2, 1]);
    expect(BodyScans_remove(log, 2).scans.map((s) => s.id)).to.deep.equal([1]);
  });

  it("drops broken values and scans when parsing", () => {
    const log = BodyScans_parse({
      scans: [{ id: 1, timestamp: day, unit: "kg", weight: 80, bodyFatPct: 300 }, { id: "x" }],
    });
    expect(log.scans).to.deep.equal([{ id: 1, timestamp: day, unit: "kg", weight: 80 }]);
  });

  it("marks less body fat as better and more as worse", () => {
    const older: IBodyScan = { id: 1, timestamp: day, unit: "kg", bodyFatPct: 20 };
    const newer: IBodyScan = { id: 2, timestamp: 2 * day, unit: "kg", bodyFatPct: 19.2 };
    expect(BodyScans_change(field("bodyFatPct"), newer, older)).to.deep.equal({ delta: -0.8, trend: "better" });
    expect(BodyScans_change(field("bodyFatPct"), older, newer)).to.deep.equal({ delta: 0.8, trend: "worse" });
  });

  it("converts the older scan's mass into the newer scan's unit", () => {
    const older: IBodyScan = { id: 1, timestamp: day, unit: "kg", muscleMass: 60 };
    const newer: IBodyScan = { id: 2, timestamp: 2 * day, unit: "lb", muscleMass: 133.3 };
    const change = BodyScans_change(field("muscleMass"), newer, older)!;
    expect(change).to.deep.equal({ delta: 1, trend: "better" });
    expect(BodyScans_formatDelta(field("muscleMass"), change, "lb")).to.equal("+1 lb");
  });

  it("hands weight and body fat to the app's measurements", () => {
    const scan: IBodyScan = { id: 1, timestamp: day, unit: "lb", weight: 180, waterPct: 55 };
    expect(BodyScans_toStats(scan)).to.deep.equal({ weight: { value: 180, unit: "lb" }, bodyfat: undefined });
  });

  it("gives weight no good or bad colour", () => {
    const older: IBodyScan = { id: 1, timestamp: day, unit: "kg", weight: 80 };
    const newer: IBodyScan = { id: 2, timestamp: 2 * day, unit: "kg", weight: 82 };
    expect(BodyScans_change(field("weight"), newer, older)?.trend).to.equal("neutral");
  });
});
