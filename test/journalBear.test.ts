import "mocha";
import { expect } from "chai";
import { IBearSources } from "../src/models/bear";
import { BearStoreData_empty } from "../src/models/bearStoreData";
import { FoodLog_empty } from "../src/models/foodLog";
import { JournalBear_asOf, JournalBear_sources, JournalBear_state } from "../src/models/journalBear";
import { Settings_build } from "../src/models/settings";
import { IHistoryRecord } from "../src/types";
import { Weight_build } from "../src/models/weight";

const hourMs = 3600000;
const today = "2026-10-20";
const now = new Date(2026, 9, 20, 15).getTime();
const monday = new Date(2026, 9, 12, 18).getTime();
const mondayEnd = new Date(2026, 9, 13).getTime() - 1;

function workout(endTime: number, kg: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id: endTime,
    date: new Date(endTime).toISOString(),
    startTime: endTime - hourMs,
    endTime,
    programId: "p",
    programName: "Program",
    day: 1,
    dayName: "Day",
    entries: [
      {
        vtype: "history_entry",
        id: "e",
        index: 0,
        exercise: { id: "benchPress", equipment: "barbell" },
        warmupSets: [],
        sets: [
          {
            vtype: "set",
            id: "s",
            index: 0,
            completedWeight: Weight_build(kg, "kg"),
            completedReps: 10,
            isCompleted: true,
          },
        ],
      },
    ],
  };
}

function sources(history: IHistoryRecord[], celebratedLevel: number = 1): IBearSources {
  return {
    history,
    foodLog: FoodLog_empty(),
    stats: { weight: {}, length: {}, percentage: {} },
    settings: Settings_build(),
    bear: { ...BearStoreData_empty(), celebratedLevel },
  };
}

describe("JournalBear", () => {
  it("shows today and later days as the bear is now", () => {
    expect(JournalBear_asOf(today, today, now)).to.equal(now);
    expect(JournalBear_asOf("2026-10-25", today, now)).to.equal(now);
  });

  it("ends an earlier day at its last millisecond, in local time", () => {
    expect(JournalBear_asOf("2026-10-12", today, now)).to.equal(mondayEnd);
    expect(new Date(JournalBear_asOf("2026-12-31", "2027-01-02", now)).getDate()).to.equal(31);
    expect(new Date(JournalBear_asOf("2026-12-31", "2027-01-02", now)).getHours()).to.equal(23);
  });

  it("keeps the sources for today and lowers the level floor for an earlier day", () => {
    const data = sources([], 5);
    expect(JournalBear_sources({ day: today, today, now, sources: data })).to.equal(data);
    const past = JournalBear_sources({ day: "2026-10-12", today, now, sources: data });
    expect(past.bear?.celebratedLevel).to.equal(1);
    expect(data.bear?.celebratedLevel).to.equal(5);
    const unset = sources([]);
    unset.bear = undefined;
    expect(JournalBear_sources({ day: "2026-10-12", today, now, sources: unset })).to.equal(unset);
  });

  it("shows the level the bear had at the end of that day", () => {
    const data = sources([workout(monday, 100), workout(now - hourMs, 3000)], 2);
    const then = JournalBear_state({ day: "2026-10-12", today, now, sources: data });
    const current = JournalBear_state({ day: today, today, now, sources: data });
    expect(then.level.tier.level).to.equal(1);
    expect(current.level.tier.level).to.equal(2);
    expect(then.countedKg).to.be.lessThan(current.countedKg);
  });

  it("shows the mood the bear had at the end of that day", () => {
    const data = sources([workout(new Date(2026, 9, 12, 22).getTime(), 100)]);
    expect(JournalBear_state({ day: "2026-10-12", today, now, sources: data }).mood).to.equal("pumped");
    expect(JournalBear_state({ day: today, today, now, sources: data }).mood).to.equal("hungry");
  });

  it("ignores a workout that ended after the shown day", () => {
    const data = sources([workout(now - hourMs, 100)]);
    const then = JournalBear_state({ day: "2026-10-12", today, now, sources: data });
    expect([then.countedKg, then.lastCountedWorkoutAt]).to.deep.equal([0, undefined]);
  });
});
