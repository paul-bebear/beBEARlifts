import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { BearPlan_text, IBearGoal, IBearPlanParams } from "../src/models/bearPlan";
import { BearPlace_equipmentKeys, BearPlace_resolve, IBearPlacePick } from "../src/models/bearPlace";
import { BearPlanSlots_table } from "../src/models/bearPlanSlots";
import { PlannerMode_commitFullText } from "../src/pages/planner/models/plannerMode";
import { PlannerProgram_evaluateFull } from "../src/pages/planner/models/plannerProgram";
import { IPlannerProgramExercise } from "../src/pages/planner/models/types";
import { Exercise_findByNameAndEquipment, Exercise_toKey } from "../src/models/exercise";
import { Settings_build } from "../src/models/settings";

const settings = Settings_build();
const allDays: IBearPlanParams["days"][] = [3, 4, 5];
const goals: IBearGoal[] = ["size", "strength", "both"];
const singlePicks: IBearPlacePick[] = ["gym", "dumbbells", "street", "none"];
const goldenDir = path.resolve(__dirname, "fixtures/bearPlan");

function poolName(pick: IBearPlacePick): string {
  return pick === "none" ? "floor" : pick;
}

function subsets(picks: IBearPlacePick[]): IBearPlacePick[][] {
  if (picks.length === 0) {
    return [[]];
  }
  const rest = subsets(picks.slice(1));
  return [...rest, ...rest.map((s) => [picks[0], ...s])];
}

function multiPicks(): IBearPlacePick[][] {
  return subsets(singlePicks).filter((picks) => picks.length > 1);
}

function describeParams(params: IBearPlanParams): string {
  const flags = [params.agile ? "agile" : "", params.youth ? "youth" : ""].filter(Boolean).join(" ");
  return `${params.days} days, ${params.goal}, ${params.places.join("+")}${flags ? `, ${flags}` : ""}`;
}

function allParams(): IBearPlanParams[] {
  const result: IBearPlanParams[] = [];
  for (const days of allDays) {
    for (const goal of goals) {
      for (const pick of singlePicks) {
        for (const agile of [false, true]) {
          for (const youth of [false, true]) {
            result.push({ days, goal, places: BearPlace_resolve([pick]), agile, youth });
          }
        }
      }
    }
    for (const picks of multiPicks()) {
      result.push({ days, goal: "size", places: BearPlace_resolve(picks), agile: false, youth: false });
    }
  }
  return result;
}

function evaluatedDays(text: string): { name: string; exercises: IPlannerProgramExercise[] }[] {
  const evaluated = PlannerProgram_evaluateFull(text, settings).evaluatedWeeks;
  if (!evaluated.success) {
    throw evaluated.error;
  }
  expect(evaluated.data).to.have.length(1);
  return evaluated.data[0].days.map((day) => ({ name: day.name, exercises: day.exercises.filter((e) => !e.notused) }));
}

describe("BearPlan", () => {
  it("covers 144 single-pool sets plus 11 multi-pick sets per day count", () => {
    expect(multiPicks()).to.have.length(11);
    expect(allParams()).to.have.length(144 + 33);
  });

  for (const params of allParams()) {
    describe(describeParams(params), () => {
      const text = BearPlan_text(params);

      it("commits without an error", () => {
        const committed = PlannerMode_commitFullText(text, settings);
        expect(committed.error?.message).to.equal(undefined);
        expect(committed.weeks).to.have.length(1);
        expect(committed.weeks?.[0].days).to.have.length(params.days);
      });

      it("has 6 to 10 exercises a day, 11 with agility, and no repeats within a day", () => {
        for (const day of evaluatedDays(text)) {
          const max = params.agile ? 11 : 10;
          expect(day.exercises.length, day.name).to.be.within(6, max);
          const keys = day.exercises.map((e) => (e.exerciseType ? Exercise_toKey(e.exerciseType) : e.name));
          expect(new Set(keys).size, `${day.name}: ${keys.join(", ")}`).to.equal(keys.length);
        }
      });

      it("uses only equipment the places provide", () => {
        const keys = BearPlace_equipmentKeys(params.places);
        for (const day of evaluatedDays(text)) {
          for (const exercise of day.exercises) {
            const equipment = exercise.exerciseType?.equipment;
            expect(equipment, exercise.fullName).not.to.equal(undefined);
            expect(keys, exercise.fullName).to.include(equipment);
          }
        }
      });

      if (params.youth) {
        it("has no AMRAP set and no set under 5 reps apart from timed sets", () => {
          expect(text).not.to.match(/\d+x\d+(-\d+)?\+/);
          for (const day of evaluatedDays(text)) {
            for (const exercise of day.exercises) {
              for (const set of exercise.evaluatedSetVariations.flatMap((v) => v.sets)) {
                expect(set.isAmrap, exercise.fullName).to.equal(false);
                if (set.setTimer == null) {
                  expect(set.minrep ?? set.maxrep ?? 0, exercise.fullName).to.be.at.least(5);
                }
              }
            }
          }
        });
      }
    });
  }

  it("resolves every slot pick to a built-in exercise with the listed equipment", () => {
    for (const [slot, row] of Object.entries(BearPlanSlots_table)) {
      for (const pick of Object.values(row.picks)) {
        const exercise = Exercise_findByNameAndEquipment(pick.name, {});
        expect(exercise, `${slot}: ${pick.name}`).not.to.equal(undefined);
        expect(exercise?.equipment, `${slot}: ${pick.name}`).to.equal(pick.equipment);
      }
    }
  });

  it("labels a lift that runs heavy on one day and as volume on another", () => {
    const text = BearPlan_text({ days: 5, goal: "both", places: ["gym", "floor"], agile: false, youth: false });
    expect(text).to.include("\nBench Press / ...main / 95lb");
    expect(text).to.include("\nvolume: Bench Press / ...build / 95lb");
  });

  it("keeps the run on day A and swaps the stretch block on day C for jumps when agile", () => {
    const text = BearPlan_text({ days: 3, goal: "size", places: ["gym", "floor"], agile: true, youth: false });
    const [, dayA, , dayC] = text.split(/^## /m);
    expect(dayA).to.include("Cycling / ...run");
    expect(dayA).to.include("Jump Squat, Bodyweight / ...jump");
    expect(dayC).to.include("Jump Rope / ...jump");
    expect(dayC).not.to.include("...mobility");
  });

  it("matches the 36 golden files for the single-pool base variants", () => {
    let count = 0;
    for (const days of allDays) {
      for (const goal of goals) {
        for (const pick of singlePicks) {
          const text = BearPlan_text({ days, goal, places: BearPlace_resolve([pick]), agile: false, youth: false });
          const file = path.join(goldenDir, `${days}-${goal}-${poolName(pick)}.txt`);
          if (process.env.BEAR_PLAN_GOLDEN === "write") {
            fs.mkdirSync(goldenDir, { recursive: true });
            fs.writeFileSync(file, text);
          }
          expect(text, file).to.equal(fs.readFileSync(file, "utf8"));
          count += 1;
        }
      }
    }
    expect(count).to.equal(36);
  });

  it("matches the liftoscript fence of the three catalog programs", () => {
    const catalog: [string, IBearPlanParams["days"]][] = [
      ["bebear-3day.md", 3],
      ["bebear-4day.md", 4],
      ["bebear-ulppl.md", 5],
    ];
    for (const [file, days] of catalog) {
      const content = fs.readFileSync(path.resolve(__dirname, "../programs/builtin", file), "utf8");
      const fence = content.match(/```liftoscript\n([\s\S]*?)```/)?.[1];
      const text = BearPlan_text({ days, goal: "size", places: ["gym", "floor"], agile: false, youth: false });
      expect(fence, `${file} is stale, run npm run build:bear-plans`).to.equal(text);
    }
  });
});
