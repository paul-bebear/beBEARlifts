import "mocha";
import { expect } from "chai";
import {
  BearText_finishLine,
  BearText_levelLine,
  BearText_levelTitle,
  BearText_levelUp,
  BearText_status,
} from "../src/models/bearText";
import { BearTier_progress } from "../src/models/bearTier";
import { IBearState } from "../src/models/bear";
import { IHistoryRecord } from "../src/types";

const hourMs = 3600000;
const dayMs = 24 * hourMs;
const now = new Date(2026, 9, 22, 12).getTime();

function state(overrides: Partial<IBearState>): IBearState {
  return {
    line: "male",
    level: BearTier_progress(0, 0),
    countedKg: 0,
    fullness: 50,
    energy: 100,
    mood: "normal",
    workouts: [],
    ...overrides,
  };
}

function record(id: number, endTime: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id,
    date: new Date(endTime).toISOString(),
    startTime: endTime - hourMs,
    endTime,
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day",
    entries: [],
  };
}

describe("BearText", () => {
  it("names the next level, the kg left and its comparison", () => {
    const progress = BearTier_progress(0, 3800);
    expect(BearText_levelTitle(progress)).to.equal("Level 2 · Teen");
    expect(BearText_levelLine(progress)).to.equal("6,200 kg to Amateur · a T. rex");
  });

  it("says top level at Mars", () => {
    expect(BearText_levelLine(BearTier_progress(0, 6000000))).to.equal("Top level · a full Starship");
  });

  it("names the weekday the bear last trained", () => {
    const tuesday = new Date(2026, 9, 20, 18).getTime();
    expect(BearText_status(state({ mood: "tired", lastCountedWorkoutAt: tuesday }), now)).to.equal(
      "Your bear hasn't moved since Tuesday"
    );
    expect(BearText_status(state({ mood: "tired", lastCountedWorkoutAt: now - 20 * dayMs }), now)).to.equal(
      "Your bear hasn't moved since 2 Oct"
    );
    expect(BearText_status(state({ mood: "tired", lastCountedWorkoutAt: now - 22 * hourMs }), now)).to.equal(
      "Your bear hasn't moved since yesterday"
    );
    expect(BearText_status(state({ mood: "tired" }), now)).to.equal("Your bear is waiting for its first workout");
  });

  it("has a line for every mood", () => {
    expect(BearText_status(state({ mood: "normal" }), now)).to.equal("Fed and rested");
    expect(BearText_status(state({ mood: "hungry" }), now)).to.equal("Your bear is hungry. Log a meal");
    expect(BearText_status(state({ mood: "pumped" }), now)).to.equal("Pumped after training");
  });

  it("shows the kg added and the next level on the finish screen", () => {
    const today = record(2, now);
    const progress = BearTier_progress(0, 3800);
    expect(BearText_finishLine(today, [{ record: today, countedKg: 1840 }], progress)).to.equal(
      "+1,840 kg · Amateur in 6,200 kg"
    );
  });

  it("explains a workout that added nothing", () => {
    const first = record(1, now - hourMs);
    const second = record(2, now);
    const progress = BearTier_progress(0, 0);
    expect(BearText_finishLine(second, [{ record: first, countedKg: 900 }], progress)).to.equal(
      "+0 kg · one workout a day grows your bear"
    );
    expect(BearText_finishLine(second, [], progress)).to.equal("+0 kg · train 10 minutes or more to grow your bear");
  });

  it("titles the level-up card", () => {
    expect(BearText_levelUp(3)).to.deep.equal({
      title: "Level 3 · Amateur",
      subtitle: "Your bear grew! You have lifted a T. rex so far.",
    });
  });
});
