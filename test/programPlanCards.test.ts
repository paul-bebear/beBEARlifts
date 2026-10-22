import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { Program_create, Program_evaluate } from "../src/models/program";
import {
  ProgramPlanCards_build,
  ProgramPlanCards_currentWeekIndex,
  ProgramPlanCards_weekRows,
} from "../src/models/programPlanCards";
import {
  WeekSchedule_dayCount,
  WeekSchedule_default,
  WeekSchedule_today,
  WeekSchedule_upNextDay,
} from "../src/models/weekSchedule";
import { Settings_build } from "../src/models/settings";
import { IProgram } from "../src/types";

function evaluate(text: string, nextDay: number = 1): ReturnType<typeof Program_evaluate> {
  const program: IProgram = {
    ...Program_create("P"),
    nextDay,
    planner: { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(text) },
  };
  return Program_evaluate(program, Settings_build());
}

describe("ProgramPlanCards", () => {
  it("lists bebear-3day as three days of short lines, templates left out", () => {
    const content = fs.readFileSync(path.resolve(__dirname, "../programs/builtin/bebear-3day.md"), "utf8");
    const fence = content.match(/```liftoscript\n([\s\S]*?)```/)?.[1] ?? "";
    const cards = ProgramPlanCards_build(evaluate(fence), 0);
    expect(cards.map((c) => c.name)).to.deep.equal(["Full Body A", "Full Body B", "Full Body C"]);
    expect(cards[0].lines).to.deep.equal([
      "Squat 3×8",
      "Bench Press 3×8",
      "Bent Over Row 3×8",
      "Romanian Deadlift, Barbell 3×8",
      "Lateral Raise, Cable 2×12",
      "Cycling 1×10 min",
    ]);
    expect(cards[2].lines).to.include("Assisted Squat 2×45s");
    expect(cards.map((c) => c.isNext)).to.deep.equal([true, false, false]);
  });

  it("groups different sets and marks AMRAP sets", () => {
    const cards = ProgramPlanCards_build(evaluate("# Week 1\n## Day 1\nSquat / 1x5+, 3x8 100lb, 1x8\n"), 0);
    expect(cards[0].lines).to.deep.equal(["Squat 1×5+, 4×8"]);
  });

  it("drops the label but keeps the equipment", () => {
    const cards = ProgramPlanCards_build(evaluate("# Week 1\n## Day 1\nt1: Bench Press, Dumbbell / 3x8-12\n"), 0);
    expect(cards[0].lines).to.deep.equal(["Bench Press, Dumbbell 3×8-12"]);
  });

  it("opens on the week of the next workout", () => {
    const text = "# Week 1\n## A\nSquat / 3x5\n## B\nSquat / 3x5\n# Week 2\n## A\nSquat / 3x6\n## B\nSquat / 3x6\n";
    const program = evaluate(text, 3);
    expect(ProgramPlanCards_currentWeekIndex(program)).to.equal(1);
    expect(ProgramPlanCards_build(program, 1).map((c) => c.isNext)).to.deep.equal([true, false]);
    expect(ProgramPlanCards_build(program, 1)[0].lines).to.deep.equal(["Squat 3×6"]);
  });

  it("lays bebear-ulppl out by weekday and tags today's Push as Next on Thursday", () => {
    const content = fs.readFileSync(path.resolve(__dirname, "../programs/builtin/bebear-ulppl.md"), "utf8");
    const fence = content.match(/```liftoscript\n([\s\S]*?)```/)?.[1] ?? "";
    const program = evaluate(fence, 1);
    const slots = WeekSchedule_default(WeekSchedule_dayCount(program));
    const thursday = new Date(2026, 9, 22, 12).getTime();
    const today = WeekSchedule_today(program, slots, thursday);
    const cards = ProgramPlanCards_build(program, 0, WeekSchedule_upNextDay(program, today, false));
    const week = ProgramPlanCards_weekRows(cards, slots, today.weekday);
    expect(week.rows.map((r) => `${r.weekdayName} ${r.card?.name ?? "Rest"}`)).to.deep.equal([
      "Monday Upper",
      "Tuesday Lower 1",
      "Wednesday Rest",
      "Thursday Push",
      "Friday Pull",
      "Saturday Lower 2",
      "Sunday Rest",
    ]);
    expect(week.rows.filter((r) => r.isToday).map((r) => r.weekdayName)).to.deep.equal(["Thursday"]);
    expect(week.rows.filter((r) => r.card?.isNext).map((r) => r.card?.name)).to.deep.equal(["Push"]);
    expect(week.unplaced).to.deep.equal([]);
  });

  it("lists days no weekday holds after Sunday", () => {
    const text = Array.from({ length: 8 }, (_, i) => `## D${i + 1}\nSquat / 3x5\n`).join("");
    const cards = ProgramPlanCards_build(evaluate(`# Week 1\n${text}`), 0);
    const week = ProgramPlanCards_weekRows(cards, WeekSchedule_default(8), 0);
    expect(week.rows.map((r) => r.card?.name)).to.deep.equal(["D1", "D2", "D3", "D4", "D5", "D6", "D7"]);
    expect(week.unplaced.map((c) => c.name)).to.deep.equal(["D8"]);
  });
});
