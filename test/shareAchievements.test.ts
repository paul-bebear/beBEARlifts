import "mocha";
import { expect } from "chai";
import { ShareAchievements_build } from "../src/models/shareAchievements";
import { FoodLog_empty } from "../src/models/foodLog";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord } from "../src/types";

function workout(id: number, endTime: number, kg: number): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(endTime).toISOString(),
    programId: "adhoc",
    programName: "Ad-Hoc",
    day: 1,
    dayName: "Ad-Hoc",
    id,
    startTime: endTime - 1000,
    endTime,
    entries: [
      {
        vtype: "history_entry",
        id: `${id}`,
        index: 0,
        exercise: { id: "squat", equipment: "barbell" },
        warmupSets: [],
        sets: [
          {
            vtype: "set",
            id: "s",
            index: 0,
            completedReps: 1,
            completedWeight: Weight_build(kg, "kg"),
            isCompleted: true,
          },
        ],
      },
    ],
  } as IHistoryRecord;
}

describe("ShareAchievements", () => {
  it("totals weight in time order, so each workout knows its before and after", () => {
    const history = [workout(3, 3000, 30), workout(1, 1000, 10), workout(2, 2000, 20)];
    const result = ShareAchievements_build({
      history,
      prs: {},
      doneDays: new Set(),
      foodLog: FoodLog_empty(),
      settings: { ...Settings_build(), units: "kg" },
      tierSet: "male",
      celebratedLevel: 1,
    });
    expect(result.lifetimeKg.get(1)).to.deep.equal({ beforeKg: 0, afterKg: 10 });
    expect(result.lifetimeKg.get(2)).to.deep.equal({ beforeKg: 10, afterKg: 30 });
    expect(result.lifetimeKg.get(3)).to.deep.equal({ beforeKg: 30, afterKg: 60 });
  });
});
