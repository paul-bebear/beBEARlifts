import "mocha";
import { expect } from "chai";
import {
  RulerTape_clampIndex,
  RulerTape_flickSteps,
  RulerTape_flickValue,
  RulerTape_format,
  RulerTape_hapticAllowed,
  RulerTape_indexForOffset,
  RulerTape_indexForValue,
  RulerTape_lastIndex,
  RulerTape_move,
  RulerTape_offsetForIndex,
  RulerTape_offsetForValue,
  RulerTape_panelMode,
  RulerTape_parse,
  RulerTape_snap,
  RulerTape_spec,
  RulerTape_startValue,
  RulerTape_tick,
  RulerTape_valueForIndex,
  RulerTape_valueForOffset,
  RulerTape_widths,
  RulerTape_window,
  RulerTape_windowNeedsShift,
  IRulerSpec,
} from "../src/models/rulerTape";

function spec(kind: "reps" | "weight" | "weighIn", unit: string): IRulerSpec {
  const result = RulerTape_spec(kind, unit);
  if (!result) {
    throw new Error(`no spec for ${kind} ${unit}`);
  }
  return result;
}

describe("RulerTape reps", () => {
  const reps = spec("reps", "kg");

  it("runs 0 to 100 at step 1", () => {
    expect(reps.min).to.equal(0);
    expect(reps.max).to.equal(100);
    expect(RulerTape_lastIndex(reps)).to.equal(100);
    expect(RulerTape_valueForIndex(reps, 12)).to.equal(12);
  });

  it("is the same spec for either unit", () => {
    expect(RulerTape_spec("reps", "lb")).to.equal(reps);
    expect(RulerTape_spec("reps", undefined)).to.equal(reps);
  });

  it("round-trips value, offset and index", () => {
    for (const value of [0, 1, 12, 50, 100]) {
      const offset = RulerTape_offsetForValue(reps, value);
      expect(offset).to.equal(value * reps.tickSpacing);
      expect(RulerTape_valueForOffset(reps, offset)).to.equal(value);
    }
  });

  it("clamps outside the range", () => {
    expect(RulerTape_indexForValue(reps, -4)).to.equal(0);
    expect(RulerTape_indexForValue(reps, 140)).to.equal(100);
    expect(RulerTape_clampIndex(reps, NaN)).to.equal(0);
    expect(RulerTape_offsetForIndex(reps, 500)).to.equal(100 * reps.tickSpacing);
    expect(RulerTape_indexForOffset(reps, -80)).to.equal(0);
  });

  it("marks every 5th tick tall and every 10th with a number", () => {
    const ticks = Array.from({ length: 21 }, (_, i) => RulerTape_tick(reps, i));
    expect(ticks.filter((t) => t.isTall).map((t) => t.value)).to.eql([0, 5, 10, 15, 20]);
    expect(ticks.filter((t) => t.label != null).map((t) => t.label)).to.eql(["0", "10", "20"]);
  });
});

describe("RulerTape workout weight in kg", () => {
  const kg = spec("weight", "kg");

  it("runs 0 to 300 at step 2.5", () => {
    expect(kg.min).to.equal(0);
    expect(kg.max).to.equal(300);
    expect(kg.step).to.equal(2.5);
    expect(RulerTape_lastIndex(kg)).to.equal(120);
    expect(RulerTape_valueForIndex(kg, 1)).to.equal(2.5);
    expect(RulerTape_valueForIndex(kg, 120)).to.equal(300);
  });

  it("maps each step to one tick spacing of scroll", () => {
    expect(RulerTape_offsetForValue(kg, 100)).to.equal(40 * kg.tickSpacing);
    expect(RulerTape_valueForOffset(kg, 40 * kg.tickSpacing)).to.equal(100);
  });

  it("rounds a scroll offset between two ticks to the nearer one", () => {
    expect(RulerTape_valueForOffset(kg, kg.tickSpacing * 0.4)).to.equal(0);
    expect(RulerTape_valueForOffset(kg, kg.tickSpacing * 0.6)).to.equal(2.5);
  });

  it("marks a tall tick every 10 kg and a number every 20 kg", () => {
    const ticks = Array.from({ length: 17 }, (_, i) => RulerTape_tick(kg, i));
    expect(ticks.filter((t) => t.isTall).map((t) => t.value)).to.eql([0, 10, 20, 30, 40]);
    expect(ticks.filter((t) => t.label != null).map((t) => t.label)).to.eql(["0", "20", "40"]);
  });

  it("snaps 74.3 to the nearest step without changing the stored value", () => {
    const stored = 74.3;
    expect(RulerTape_snap(kg, stored)).to.equal(75);
    const startIndex = RulerTape_indexForValue(kg, stored);
    expect(RulerTape_valueForIndex(kg, startIndex)).to.equal(75);
    const resting = RulerTape_move(kg, startIndex, RulerTape_offsetForValue(kg, stored));
    expect(resting.changed).to.equal(false);
    expect(stored).to.equal(74.3);
    const nudged = RulerTape_move(kg, startIndex, RulerTape_offsetForValue(kg, stored) + kg.tickSpacing);
    expect(nudged.changed).to.equal(true);
    expect(nudged.value).to.equal(77.5);
  });

  it("snaps 73.7 down and 73.8 up", () => {
    expect(RulerTape_snap(kg, 73.7)).to.equal(72.5);
    expect(RulerTape_snap(kg, 73.8)).to.equal(75);
  });
});

describe("RulerTape workout weight in lb", () => {
  const lb = spec("weight", "lb");

  it("runs 0 to 700 at step 5", () => {
    expect(lb.min).to.equal(0);
    expect(lb.max).to.equal(700);
    expect(lb.step).to.equal(5);
    expect(RulerTape_lastIndex(lb)).to.equal(140);
  });

  it("snaps 163 lb to 165", () => {
    expect(RulerTape_snap(lb, 163)).to.equal(165);
    expect(RulerTape_snap(lb, 162)).to.equal(160);
  });

  it("marks a tall tick every 10 lb and a number every 20 lb", () => {
    const ticks = Array.from({ length: 9 }, (_, i) => RulerTape_tick(lb, i));
    expect(ticks.filter((t) => t.isTall).map((t) => t.value)).to.eql([0, 10, 20, 30, 40]);
    expect(ticks.filter((t) => t.label != null).map((t) => t.label)).to.eql(["0", "20", "40"]);
  });
});

describe("RulerTape weigh-in in kg", () => {
  const kg = spec("weighIn", "kg");

  it("runs 30 to 250 at step 0.1", () => {
    expect(kg.min).to.equal(30);
    expect(kg.max).to.equal(250);
    expect(kg.step).to.equal(0.1);
    expect(RulerTape_lastIndex(kg)).to.equal(2200);
  });

  it("returns values with no floating point drift", () => {
    expect(RulerTape_valueForIndex(kg, 1)).to.equal(30.1);
    expect(RulerTape_valueForIndex(kg, 3)).to.equal(30.3);
    expect(RulerTape_valueForIndex(kg, 441)).to.equal(74.1);
    expect(RulerTape_valueForIndex(kg, 2200)).to.equal(250);
  });

  it("finds the tick for 74.3 exactly", () => {
    expect(RulerTape_indexForValue(kg, 74.3)).to.equal(443);
    expect(RulerTape_snap(kg, 74.3)).to.equal(74.3);
    expect(RulerTape_snap(kg, 74.34)).to.equal(74.3);
    expect(RulerTape_snap(kg, 74.36)).to.equal(74.4);
  });

  it("marks a tall tick and a number on every whole kg", () => {
    const ticks = Array.from({ length: 31 }, (_, i) => RulerTape_tick(kg, i));
    expect(ticks.filter((t) => t.isTall).map((t) => t.value)).to.eql([30, 31, 32, 33]);
    expect(ticks.filter((t) => t.label != null).map((t) => t.label)).to.eql(["30", "31", "32", "33"]);
  });

  it("clamps to 30 and 250", () => {
    expect(RulerTape_snap(kg, 12)).to.equal(30);
    expect(RulerTape_snap(kg, 400)).to.equal(250);
  });
});

describe("RulerTape weigh-in in lb", () => {
  const lb = spec("weighIn", "lb");

  it("runs 60 to 550 at step 0.2", () => {
    expect(lb.min).to.equal(60);
    expect(lb.max).to.equal(550);
    expect(lb.step).to.equal(0.2);
    expect(RulerTape_lastIndex(lb)).to.equal(2450);
  });

  it("snaps 163.5 lb to 163.6", () => {
    expect(RulerTape_snap(lb, 163.5)).to.equal(163.6);
    expect(RulerTape_snap(lb, 163.3)).to.equal(163.4);
    expect(RulerTape_valueForIndex(lb, 3)).to.equal(60.6);
  });

  it("marks a tall tick and a number on every whole lb", () => {
    const ticks = Array.from({ length: 11 }, (_, i) => RulerTape_tick(lb, i));
    expect(ticks.filter((t) => t.isTall).map((t) => t.value)).to.eql([60, 61, 62]);
  });
});

describe("RulerTape units", () => {
  it("has no ruler for percent weights", () => {
    expect(RulerTape_spec("weight", "%")).to.equal(undefined);
    expect(RulerTape_spec("weighIn", "%")).to.equal(undefined);
    expect(RulerTape_spec("weight", undefined)).to.equal(undefined);
  });

  it("labels the unit on the big number", () => {
    expect(spec("weight", "kg").label).to.equal("kg");
    expect(spec("weighIn", "lb").label).to.equal("lb");
    expect(spec("reps", "kg").label).to.equal("reps");
  });
});

describe("RulerTape start value", () => {
  const kg = spec("weight", "kg");

  it("prefers the logged value, then the target, then the spec default", () => {
    expect(RulerTape_startValue(kg, 80, 60)).to.equal(80);
    expect(RulerTape_startValue(kg, undefined, 60)).to.equal(60);
    expect(RulerTape_startValue(kg, undefined, undefined)).to.equal(kg.startValue);
    expect(RulerTape_startValue(kg, 0, 60)).to.equal(0);
  });
});

describe("RulerTape parse", () => {
  it("reads the typed text as a number", () => {
    expect(RulerTape_parse("74.3")).to.equal(74.3);
    expect(RulerTape_parse("0")).to.equal(0);
  });

  it("returns nothing for empty or broken text", () => {
    expect(RulerTape_parse("")).to.equal(undefined);
    expect(RulerTape_parse("-")).to.equal(undefined);
    expect(RulerTape_parse("12.")).to.equal(12);
  });
});

describe("RulerTape format", () => {
  it("shows the stored value as it is", () => {
    expect(RulerTape_format(74.3)).to.equal("74.3");
    expect(RulerTape_format(75)).to.equal("75");
    expect(RulerTape_format(2.5)).to.equal("2.5");
  });
});

describe("RulerTape window", () => {
  const kg = spec("weighIn", "kg");

  it("covers the viewport plus a buffer and stays inside the range", () => {
    const win = RulerTape_window(kg, 1000, 390);
    expect(win.first).to.be.lessThan(1000 - 17);
    expect(win.last).to.be.greaterThan(1000 + 17);
    expect(RulerTape_window(kg, 0, 390).first).to.equal(0);
    expect(RulerTape_window(kg, 2200, 390).last).to.equal(2200);
  });

  it("asks for a shift only when the center nears the window edge", () => {
    const win = RulerTape_window(kg, 1000, 390);
    expect(RulerTape_windowNeedsShift(kg, win, 1000, 390)).to.equal(false);
    expect(RulerTape_windowNeedsShift(kg, win, win.last - 5, 390)).to.equal(true);
    expect(RulerTape_windowNeedsShift(kg, win, win.first + 5, 390)).to.equal(true);
  });

  it("never asks for a shift at the ends of the range", () => {
    const start = RulerTape_window(kg, 3, 390);
    expect(RulerTape_windowNeedsShift(kg, start, 3, 390)).to.equal(false);
    const end = RulerTape_window(kg, 2198, 390);
    expect(RulerTape_windowNeedsShift(kg, end, 2198, 390)).to.equal(false);
  });

  it("keeps the content width constant as the window moves", () => {
    const total = (center: number): number => {
      const win = RulerTape_window(kg, center, 390);
      const widths = RulerTape_widths(kg, win, 390);
      return widths.leftSpacer + (win.last - win.first + 1) * kg.tickSpacing + widths.rightSpacer;
    };
    expect(total(1000)).to.equal(total(300));
    expect(total(0)).to.equal(total(2200));
    expect(total(0)).to.equal(2201 * kg.tickSpacing + 2 * (390 / 2 - kg.tickSpacing / 2));
  });
});

describe("RulerTape haptics", () => {
  it("allows a tick only after the minimum gap", () => {
    expect(RulerTape_hapticAllowed(1000, 1005)).to.equal(false);
    expect(RulerTape_hapticAllowed(1000, 1020)).to.equal(true);
  });
});

describe("RulerTape flick reach", () => {
  const kg = spec("weight", "kg");
  const reps = spec("reps", "kg");

  it("moves farther for a faster flick", () => {
    expect(RulerTape_flickValue(kg, 2000)).to.be.greaterThan(RulerTape_flickValue(kg, 1000));
  });

  it("covers more than 40 kg for a gentle 1000 pt/s flick", () => {
    expect(RulerTape_flickValue(kg, 1000)).to.be.greaterThan(40);
  });

  it("covers 20 kg to 140 kg for a firm 2500 pt/s flick", () => {
    expect(RulerTape_flickValue(kg, 2500)).to.be.greaterThan(120);
  });

  it("counts reps in steps of one", () => {
    expect(RulerTape_flickValue(reps, 1000)).to.equal(RulerTape_flickSteps(reps, 1000));
  });

  it("ignores direction", () => {
    expect(RulerTape_flickSteps(kg, -1500)).to.equal(RulerTape_flickSteps(kg, 1500));
  });
});

describe("RulerTape panel mode", () => {
  it("shows the ruler when the field has one and the pad was not asked for", () => {
    expect(RulerTape_panelMode(true, false)).to.equal("ruler");
  });

  it("shows the pad after a tap on the number", () => {
    expect(RulerTape_panelMode(true, true)).to.equal("pad");
  });

  it("shows the pad for a field with no ruler", () => {
    expect(RulerTape_panelMode(false, false)).to.equal("pad");
    expect(RulerTape_panelMode(false, true)).to.equal("pad");
  });
});
