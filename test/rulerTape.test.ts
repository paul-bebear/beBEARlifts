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
  RulerTape_padRequested,
  RulerTape_panelMode,
  RulerTape_parse,
  RulerTape_snap,
  RulerTape_spec,
  RulerTape_startValue,
  RulerTape_tick,
  RulerTape_valueForIndex,
  RulerTape_valueForOffset,
  RulerTape_weightSpec,
  RulerTape_widths,
  RulerTape_window,
  RulerTape_windowNeedsShift,
  IRulerSpec,
} from "../src/models/rulerTape";
import { IEquipment, IEquipmentData, IExerciseType, ISettings, IUnit } from "../src/types";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";

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

describe("RulerTape pad request", () => {
  it("keeps the pad for the input it was asked on", () => {
    expect(RulerTape_padRequested("reps", "reps")).to.equal(true);
  });

  it("shows the ruler when focus moves to another input", () => {
    expect(RulerTape_padRequested("reps", "weight")).to.equal(false);
  });

  it("shows the ruler when no pad was asked for or nothing is focused", () => {
    expect(RulerTape_padRequested(null, "weight")).to.equal(false);
    expect(RulerTape_padRequested("reps", null)).to.equal(false);
    expect(RulerTape_padRequested("reps", undefined)).to.equal(false);
  });
});

function gymSettings(units: IUnit, equipment: IEquipment, data: Partial<IEquipmentData>): ISettings {
  const base = Settings_build();
  const current = base.gyms[0].equipment[equipment];
  if (!current) {
    throw new Error(`no default ${equipment}`);
  }
  return {
    ...base,
    units,
    gyms: [{ ...base.gyms[0], equipment: { ...base.gyms[0].equipment, [equipment]: { ...current, ...data } } }],
  };
}

function weightRuler(
  settings: ISettings,
  equipment: IEquipment,
  unit: IUnit,
  current?: number
): IRulerSpec & { stops: number[] } {
  const exerciseType: IExerciseType = { id: "benchPress", equipment };
  const result = RulerTape_weightSpec(settings, exerciseType, unit, current);
  if (!result || !result.stops) {
    throw new Error(`no equipment ruler for ${equipment} ${unit}`);
  }
  return { ...result, stops: result.stops };
}

function plates(unit: IUnit, values: number[]): IEquipmentData["plates"] {
  return values.map((value) => ({ weight: Weight_build(value, unit), num: 40 }));
}

describe("RulerTape workout weight for fixed equipment in kg", () => {
  const settings = gymSettings("kg", "dumbbell", {
    isFixed: true,
    fixed: [2, 4, 6, 8, 10, 12, 15, 17.5, 20].map((value) => Weight_build(value, "kg")),
  });
  const ruler = weightRuler(settings, "dumbbell", "kg");

  it("has one tick for each dumbbell and nothing between them", () => {
    expect(ruler.stops).to.eql([2, 4, 6, 8, 10, 12, 15, 17.5, 20]);
    expect(RulerTape_lastIndex(ruler)).to.equal(8);
  });

  it("spaces the ticks evenly although the weights are not", () => {
    const offsets = ruler.stops.map((_, index) => RulerTape_offsetForIndex(ruler, index));
    expect(offsets).to.eql(ruler.stops.map((_, index) => index * ruler.tickSpacing));
    expect(RulerTape_valueForOffset(ruler, 6 * ruler.tickSpacing)).to.equal(15);
    expect(RulerTape_valueForOffset(ruler, 7 * ruler.tickSpacing)).to.equal(17.5);
  });

  it("ends at the heaviest dumbbell however far the ceiling reaches", () => {
    const far = weightRuler(settings, "dumbbell", "kg", 500);
    expect(far.stops[far.stops.length - 1]).to.equal(20);
  });

  it("marks every 5th tick tall and prints its number", () => {
    const ticks = ruler.stops.map((_, index) => RulerTape_tick(ruler, index));
    expect(ticks.filter((t) => t.isTall).map((t) => t.value)).to.eql([2, 12]);
    expect(ticks.filter((t) => t.label != null).map((t) => t.label)).to.eql(["2", "12"]);
  });

  it("rests a typed 11 on the nearest dumbbell and keeps the stored value", () => {
    const stored = 11;
    const startIndex = RulerTape_indexForValue(ruler, stored);
    expect(RulerTape_valueForIndex(ruler, startIndex)).to.equal(12);
    expect(RulerTape_indexForValue(ruler, 10.9)).to.equal(4);
    const resting = RulerTape_move(ruler, startIndex, RulerTape_offsetForValue(ruler, stored));
    expect(resting.changed).to.equal(false);
    expect(stored).to.equal(11);
    const nudged = RulerTape_move(ruler, startIndex, RulerTape_offsetForValue(ruler, stored) + ruler.tickSpacing);
    expect(nudged.changed).to.equal(true);
    expect(nudged.value).to.equal(15);
  });

  it("clamps a typed weight past either end", () => {
    expect(RulerTape_snap(ruler, 0)).to.equal(2);
    expect(RulerTape_snap(ruler, 90)).to.equal(20);
  });
});

describe("RulerTape workout weight for fixed equipment in lb", () => {
  const settings = gymSettings("lb", "dumbbell", {
    isFixed: true,
    fixed: [10, 15, 20, 25, 30, 35, 40].map((value) => Weight_build(value, "lb")),
  });
  const ruler = weightRuler(settings, "dumbbell", "lb");

  it("has one tick for each dumbbell", () => {
    expect(ruler.stops).to.eql([10, 15, 20, 25, 30, 35, 40]);
    expect(ruler.label).to.equal("lb");
  });

  it("snaps 22 lb to 20 and 23 lb to 25", () => {
    expect(RulerTape_snap(ruler, 22)).to.equal(20);
    expect(RulerTape_snap(ruler, 23)).to.equal(25);
  });
});

describe("RulerTape workout weight for a barbell in kg", () => {
  const fivePair = gymSettings("kg", "barbell", { plates: plates("kg", [20, 10, 5, 2.5]) });
  const withQuarterPlates = gymSettings("kg", "barbell", { plates: plates("kg", [20, 10, 5, 2.5, 1.25]) });

  it("starts at the bare bar and steps by the smallest plate pair of 5 kg", () => {
    const ruler = weightRuler(fivePair, "barbell", "kg");
    expect(ruler.stops.slice(0, 6)).to.eql([20, 25, 30, 35, 40, 45]);
    expect(ruler.stops).to.not.include(0);
  });

  it("steps by 2.5 kg with 1.25 kg plates", () => {
    const ruler = weightRuler(withQuarterPlates, "barbell", "kg");
    expect(ruler.stops.slice(0, 6)).to.eql([20, 22.5, 25, 27.5, 30, 32.5]);
  });

  it("rests a typed 23 on 25 and a typed 22 on 20", () => {
    const ruler = weightRuler(fivePair, "barbell", "kg");
    expect(RulerTape_snap(ruler, 23)).to.equal(25);
    expect(RulerTape_snap(ruler, 22)).to.equal(20);
    expect(RulerTape_snap(ruler, 0)).to.equal(20);
  });

  it("stops at 300 kg", () => {
    const ruler = weightRuler(fivePair, "barbell", "kg");
    expect(ruler.stops[ruler.stops.length - 1]).to.equal(300);
  });

  it("reaches twice a heavy current value", () => {
    const ruler = weightRuler(fivePair, "barbell", "kg", 400);
    expect(ruler.stops[ruler.stops.length - 1]).to.equal(900);
    expect(RulerTape_snap(ruler, 400)).to.equal(400);
  });

  it("builds the list once for the same settings and exercise", () => {
    const first = weightRuler(fivePair, "barbell", "kg", 80);
    const second = weightRuler(fivePair, "barbell", "kg", 120);
    expect(second.stops).to.equal(first.stops);
    const other = weightRuler(withQuarterPlates, "barbell", "kg", 80);
    expect(other.stops).to.not.equal(first.stops);
  });

  it("marks every 5th tick tall and prints its number", () => {
    const ruler = weightRuler(fivePair, "barbell", "kg");
    const ticks = ruler.stops.slice(0, 11).map((_, index) => RulerTape_tick(ruler, index));
    expect(ticks.filter((t) => t.isTall).map((t) => t.value)).to.eql([20, 45, 70]);
    expect(ticks.filter((t) => t.label != null).map((t) => t.label)).to.eql(["20", "45", "70"]);
  });
});

describe("RulerTape workout weight for a barbell in lb", () => {
  it("starts at the 45 lb bar and steps by the smallest plate pair", () => {
    const ruler = weightRuler(Settings_build(), "barbell", "lb");
    expect(ruler.stops.slice(0, 5)).to.eql([45, 47.5, 50, 52.5, 55]);
    expect(ruler.stops[ruler.stops.length - 1]).to.be.at.most(700);
  });

  it("steps by 10 lb with 5 lb plates as the smallest", () => {
    const settings = gymSettings("lb", "barbell", { plates: plates("lb", [45, 25, 10, 5]) });
    const ruler = weightRuler(settings, "barbell", "lb");
    expect(ruler.stops.slice(0, 5)).to.eql([45, 55, 65, 75, 85]);
    expect(RulerTape_snap(ruler, 59)).to.equal(55);
    expect(RulerTape_snap(ruler, 61)).to.equal(65);
  });
});

describe("RulerTape workout weight for equipment with a fixed step", () => {
  const settings = gymSettings("kg", "dumbbell", { isFixed: false });

  it("steps by one kg from zero", () => {
    const ruler = weightRuler({ ...settings, units: "kg" }, "dumbbell", "kg");
    expect(ruler.stops.slice(0, 5)).to.eql([0, 1, 2, 3, 4]);
  });
});

describe("RulerTape workout weight fallbacks", () => {
  it("keeps the flat ruler when no exercise is known", () => {
    const flat = RulerTape_weightSpec(Settings_build(), undefined, "kg", 80);
    expect(flat).to.equal(RulerTape_spec("weight", "kg"));
  });

  it("has no ruler for a percent weight", () => {
    expect(RulerTape_weightSpec(Settings_build(), { id: "benchPress", equipment: "barbell" }, "%", 80)).to.equal(
      undefined
    );
  });

  it("keeps the flat ruler when the equipment has no weights in the unit", () => {
    const settings = gymSettings("lb", "dumbbell", { isFixed: true, fixed: [Weight_build(10, "kg")] });
    const result = RulerTape_weightSpec(settings, { id: "benchPress", equipment: "dumbbell" }, "lb", 40);
    expect(result).to.equal(RulerTape_spec("weight", "lb"));
  });
});
