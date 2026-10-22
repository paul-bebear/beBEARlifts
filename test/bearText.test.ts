import "mocha";
import { expect } from "chai";
import {
  BearText_finishLine,
  BearText_honeyBreakdown,
  BearText_honeyLine,
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
    tierSet: "male",
    level: BearTier_progress(0, 0, "male"),
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
    const progress = BearTier_progress(0, 12000, "male");
    expect(BearText_levelTitle(progress)).to.equal("Level 2 · Teen");
    expect(BearText_levelLine(progress)).to.equal("13,000 kg to Amateur · a school bus");
    expect(BearText_levelLine(BearTier_progress(0, 20000, "female"))).to.equal(
      "16,000 kg to Rookie · a humpback whale"
    );
  });

  it("says top level at Mars", () => {
    expect(BearText_levelLine(BearTier_progress(0, 7000000, "male"))).to.equal("Top level · a full Starship");
    expect(BearText_levelLine(BearTier_progress(0, 4200000, "female"))).to.equal("Top level · a Saturn V");
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
    const progress = BearTier_progress(0, 12000, "male");
    expect(BearText_finishLine(today, [{ record: today, countedKg: 1840 }], progress)).to.equal(
      "+1,840 kg · Amateur in 13,000 kg"
    );
  });

  it("puts the honey between the kg and the next level", () => {
    const today = record(2, now);
    const progress = BearTier_progress(0, 12000, "male");
    const workouts = [{ record: today, countedKg: 1840 }];
    expect(BearText_finishLine(today, workouts, progress, 5)).to.equal("+1,840 kg · +5 honey · Amateur in 13,000 kg");
    expect(BearText_finishLine(today, workouts, BearTier_progress(0, 7000000, "male"), 10)).to.equal(
      "+1,840 kg · +10 honey · Top level"
    );
  });

  it("says nothing about honey when the workout earned none", () => {
    const first = record(1, now - hourMs);
    const second = record(2, now);
    const progress = BearTier_progress(0, 0, "male");
    expect(BearText_finishLine(second, [{ record: first, countedKg: 900 }], progress, 0)).to.not.contain("honey");
    expect(BearText_finishLine(second, [], progress, 0)).to.not.contain("honey");
  });

  it("writes the honey line with a thousands separator", () => {
    expect(BearText_honeyLine(42)).to.equal("🍯 42 honey");
    expect(BearText_honeyLine(1240)).to.equal("🍯 1,240 honey");
    expect(BearText_honeyLine(-3)).to.equal("🍯 0 honey");
  });

  it("lists today's honey in one line", () => {
    const items = [
      { reason: "workout" as const, label: "Workout", amount: 5 },
      { reason: "weighIn" as const, label: "Weigh-in", amount: 1 },
      { reason: "protein" as const, label: "Protein", amount: 1 },
    ];
    expect(BearText_honeyBreakdown({ day: "2026-10-22", items, isCapped: false, total: 7 })).to.equal(
      "Workout +5 · Weigh-in +1 · Protein +1"
    );
    expect(BearText_honeyBreakdown({ day: "2026-10-22", items, isCapped: true, total: 10 })).to.equal(
      "Workout +5 · Weigh-in +1 · Protein +1 · Daily max 10"
    );
    expect(BearText_honeyBreakdown(undefined)).to.equal("Nothing earned yet today");
  });

  it("explains a workout that added nothing", () => {
    const first = record(1, now - hourMs);
    const second = record(2, now);
    const progress = BearTier_progress(0, 0, "male");
    expect(BearText_finishLine(second, [{ record: first, countedKg: 900 }], progress)).to.equal(
      "+0 kg · one workout a day grows your bear"
    );
    expect(BearText_finishLine(second, [], progress)).to.equal("+0 kg · train 10 minutes or more to grow your bear");
  });

  it("titles the level-up card", () => {
    expect(BearText_levelUp(3, "male")).to.deep.equal({
      title: "Level 3 · Amateur",
      subtitle: "Your bear grew! You have lifted a school bus so far.",
    });
  });

  it("words the level-up line from the set's own threshold", () => {
    expect(BearText_levelUp(4, "male").subtitle).to.equal(
      "Your bear grew! You have lifted an empty Boeing 737 so far."
    );
    expect(BearText_levelUp(4, "female").subtitle).to.equal("Your bear grew! You have lifted a humpback whale so far.");
    expect(BearText_levelUp(1, "female").subtitle).to.equal("Your bear grew!");
  });
});
