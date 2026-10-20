import "mocha";
import { expect } from "chai";
import {
  IWarmupExercise,
  WarmupPlan_build,
  WarmupPlan_doneCount,
  WarmupPlan_empty,
  WarmupPlan_exercises,
  WarmupPlan_find,
  WarmupPlan_parseAi,
  WarmupPlan_parseLog,
  WarmupPlan_put,
  WarmupPlan_rules,
  WarmupPlan_toggle,
} from "../src/models/warmupPlan";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";

const legDay: IWarmupExercise[] = [{ name: "Squat", muscles: ["Quadriceps", "Gluteus Maximus"], sets: "3 sets of 5" }];
const pushDay: IWarmupExercise[] = [
  { name: "Bench Press", muscles: ["Pectoralis Major Sternal Head"], sets: "3 sets" },
];

describe("WarmupPlan", () => {
  it("describes the day's exercises with muscles and the first set", () => {
    const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat, Barbell / 3x5 / 100kg\n`);
    const progress = Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
    const [squat] = WarmupPlan_exercises(progress, Settings_build());
    expect(squat.name).to.equal("Squat");
    expect(squat.muscles).to.include("Quadriceps");
    expect(squat.sets).to.equal("3 sets of 5 at 220 lb");
  });

  it("picks leg moves for a leg day and ends with the first lift's ramp-up sets", () => {
    const names = WarmupPlan_rules(legDay).map((i) => i.name);
    expect(names).to.include("Bodyweight squats");
    expect(names).to.not.include("Push-ups");
    expect(names[names.length - 1]).to.equal("Ramp-up sets");
  });

  it("picks push moves for a push day", () => {
    const names = WarmupPlan_rules(pushDay).map((i) => i.name);
    expect(names).to.include("Push-ups");
    expect(names).to.not.include("Leg swings");
  });

  it("reads the AI's JSON even with text around it, and drops broken items", () => {
    const raw = `Here you go:\n{"items":[{"name":"Bike","detail":"Easy pace","seconds":180},{"name":"Squats"},{"name":"Goblet squat","detail":"2x8 light","seconds":9999}]}`;
    expect(WarmupPlan_parseAi(raw)).to.deep.equal([
      { name: "Bike", detail: "Easy pace", seconds: 180 },
      { name: "Goblet squat", detail: "2x8 light" },
    ]);
  });

  it("rejects an answer that is not a usable list", () => {
    expect(WarmupPlan_parseAi("Sorry, I can't")).to.equal(undefined);
    expect(WarmupPlan_parseAi(`{"items":[{"name":"Bike","detail":"Easy"}]}`)).to.equal(undefined);
  });

  it("tracks done items and keeps one plan per workout", () => {
    const plan = WarmupPlan_build(7, "rules", WarmupPlan_rules(legDay), 1);
    const ticked = WarmupPlan_toggle(plan, 1);
    expect(WarmupPlan_doneCount(ticked)).to.equal(1);
    const log = WarmupPlan_put(WarmupPlan_put(WarmupPlan_empty(), plan), ticked);
    expect(log.plans).to.have.length(1);
    expect(WarmupPlan_find(log, 7)?.done[1]).to.equal(true);
  });

  it("restores a stored log", () => {
    const log = WarmupPlan_put(
      WarmupPlan_empty(),
      WarmupPlan_toggle(WarmupPlan_build(7, "ai", WarmupPlan_rules(legDay), 1), 0)
    );
    expect(WarmupPlan_parseLog(JSON.parse(JSON.stringify(log)))).to.deep.equal(log);
  });
});
