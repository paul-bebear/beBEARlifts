import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { ProgramDayOrder_apply, ProgramDayOrder_move, ProgramDayOrder_rowCount } from "../src/models/programDayOrder";
import {
  PlannerProgram_evaluate,
  PlannerProgram_evaluateFull,
  PlannerProgram_evaluateText,
  PlannerProgram_generateFullText,
} from "../src/pages/planner/models/plannerProgram";
import { Program_create, Program_evaluate } from "../src/models/program";
import { ProgramPlanCards_build } from "../src/models/programPlanCards";
import { Settings_build } from "../src/models/settings";
import { IPlannerProgram, IProgram } from "../src/types";

const builtinDir = path.resolve(__dirname, "../programs/builtin");
const settings = Settings_build();

function fenceOf(file: string): string {
  const content = fs.readFileSync(path.join(builtinDir, file), "utf8");
  return content.match(/```liftoscript\n([\s\S]*?)```/)?.[1] ?? "";
}

function plannerOf(text: string): IPlannerProgram {
  return { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(text) };
}

function move(planner: IPlannerProgram, from: number, to: number): IPlannerProgram {
  const result = ProgramDayOrder_move(planner, from, to, settings);
  if (!result.success) {
    throw new Error(`move ${from} -> ${to} refused: ${result.error}`);
  }
  return result.data;
}

function errorsOf(planner: IPlannerProgram): string[] {
  const days = PlannerProgram_evaluate(planner, settings).evaluatedWeeks.flat();
  const dayErrors = days.filter((day) => !day.success).map((day) => (day.success ? "" : day.error.message));
  const full = PlannerProgram_evaluateFull(PlannerProgram_generateFullText(planner.weeks), settings).evaluatedWeeks;
  return full.success ? dayErrors : [...dayErrors, full.error.message];
}

// What the plan view draws for each day, keyed by day name, so a move can be compared to the
// original regardless of position.
function cardsByName(planner: IPlannerProgram): Record<string, string[]> {
  const program: IProgram = { ...Program_create("P"), planner };
  const evaluated = Program_evaluate(program, settings);
  const result: Record<string, string[]> = {};
  evaluated.weeks.forEach((_week, weekIndex) => {
    for (const card of ProgramPlanCards_build(evaluated, weekIndex)) {
      result[`${weekIndex}/${card.name}`] = card.lines;
    }
  });
  return result;
}

function dayNames(planner: IPlannerProgram, weekIndex: number = 0): string[] {
  return planner.weeks[weekIndex].days.map((day) => day.name);
}

describe("ProgramDayOrder", () => {
  describe("beBEAR plans", () => {
    for (const file of ["bebear-3day.md", "bebear-4day.md", "bebear-ulppl.md"]) {
      it(`${file}: every move keeps each day the same and still parses`, () => {
        const planner = plannerOf(fenceOf(file));
        expect(errorsOf(planner)).to.deep.equal([]);
        const before = cardsByName(planner);
        const rows = ProgramDayOrder_rowCount(planner);
        for (let from = 0; from < rows; from += 1) {
          for (let to = 0; to < rows; to += 1) {
            const moved = move(planner, from, to);
            expect(errorsOf(moved), `${file} ${from} -> ${to}`).to.deep.equal([]);
            expect(cardsByName(moved), `${file} ${from} -> ${to}`).to.deep.equal(before);
            const names = dayNames(planner);
            const expected = names.filter((_, i) => i !== from);
            expected.splice(to, 0, names[from]);
            expect(dayNames(moved)).to.deep.equal(expected);
          }
        }
      });
    }

    it("bebear-3day: the templates defined in day A still work when day A moves last", () => {
      const moved = move(plannerOf(fenceOf("bebear-3day.md")), 0, 2);
      expect(dayNames(moved)).to.deep.equal(["Full Body B", "Full Body C", "Full Body A"]);
      expect(moved.weeks[0].days[2].exerciseText).to.contain("build / used: none");
      expect(cardsByName(moved)["0/Full Body B"]).to.include("Deadlift 3×8");
    });
  });

  describe("positional references", () => {
    const TWO_WEEKS = `# Week 1
## Day A
// Pause at the bottom
Squat / 3x5 100lb
main / used: none / 3x8 50lb

## Day B
Bench Press / ...main[1]
Deadlift / 1x5 200lb

## Day C
Front Squat / ...Squat[1:1]
Bent Over Row / ...Deadlift[2]

# Week 2
## Day A
Squat / 3x5 105lb
main / used: none / 3x8 55lb

## Day B
Bench Press / ...main[1]
Deadlift / 1x5 210lb

## Day C
Front Squat / ...Squat[1:1]
Bent Over Row / ...Deadlift[2]
`;

    it("rewrites [day] and [week:day] reuses to the new positions", () => {
      const planner = plannerOf(TWO_WEEKS);
      const moved = move(planner, 0, 2);
      expect(dayNames(moved, 0)).to.deep.equal(["Day B", "Day C", "Day A"]);
      expect(dayNames(moved, 1)).to.deep.equal(["Day B", "Day C", "Day A"]);
      expect(moved.weeks[0].days[0].exerciseText).to.contain("Bench Press / ...main[3]");
      expect(moved.weeks[0].days[1].exerciseText).to.contain("Front Squat / ...Squat[1:3]");
      expect(moved.weeks[0].days[1].exerciseText).to.contain("Bent Over Row / ...Deadlift[1]");
      expect(errorsOf(planner)).to.deep.equal([]);
      expect(moved.weeks[1].days[1].exerciseText).to.contain("Front Squat / ...Squat[1:3]");
      expect(errorsOf(moved)).to.deep.equal([]);
      expect(cardsByName(moved)).to.deep.equal(cardsByName(planner));
    });

    // PlannerEvaluator_findReusedDescriptions reads the day in `// ...Squat[1:3]` as the third day
    // that holds Squat, not as day 3. The renumbered comment then finds nothing, and the
    // before/after comparison refuses the move instead of dropping the description.
    it("refuses when a renumbered description reuse would stop finding its description", () => {
      const text = TWO_WEEKS.replace("## Day C\nFront Squat", "## Day C\n// ...Squat[1:1]\nFront Squat");
      const result = ProgramDayOrder_move(plannerOf(text), 0, 2, settings);
      expect(result.success).to.equal(false);
      expect(!result.success && result.error).to.contain("Day C");
    });

    it("is the same planner when a day lands where it is", () => {
      const planner = plannerOf(TWO_WEEKS);
      const result = ProgramDayOrder_move(planner, 1, 1, settings);
      expect(result.success && result.data).to.equal(planner);
    });

    it("refuses a position that does not exist", () => {
      expect(ProgramDayOrder_move(plannerOf(TWO_WEEKS), 0, 3, settings).success).to.equal(false);
      expect(ProgramDayOrder_move(plannerOf(TWO_WEEKS), -1, 0, settings).success).to.equal(false);
    });

    it("refuses when a plain `// ...Squat` would pick up a different day's description", () => {
      const text = `# Week 1
## Day 1
// Heavy
Squat / 3x5 100lb

## Day 2
// Light
Squat / 3x5 80lb

## Day 3
// ...Squat
Front Squat / 3x5 60lb
`;
      const result = ProgramDayOrder_move(plannerOf(text), 1, 0, settings);
      expect(result.success).to.equal(false);
      expect(!result.success && result.error).to.contain("Day 3");
    });
  });

  describe("madcow (upstream, positional reuse)", () => {
    it("refuses moves, because its progression reads dayInWeek", () => {
      const result = ProgramDayOrder_move(plannerOf(fenceOf("madcow.md")), 2, 0, settings);
      expect(result.success).to.equal(false);
      expect(!result.success && result.error).to.contain("day numbers");
    });

    it("renumbers every ...main[n] once the day-number scripts are gone", () => {
      const text = fenceOf("madcow.md")
        .replace(/ \/ progress: custom\(increment: 5lb\)[\s\S]*?~\}\nSquat/, "\nSquat")
        .replace(/progress: custom\(increment: 2\.5lb\) \{ \.\.\.main \}/g, "progress: lp(2.5lb)");
      const planner = plannerOf(text);
      expect(errorsOf(planner)).to.deep.equal([]);
      const moved = move(planner, 2, 0);
      expect(dayNames(moved)).to.deep.equal(["Workout C", "Workout A", "Workout B"]);
      expect(moved.weeks[0].days[0].exerciseText).to.contain("Squat / ...main[1]");
      expect(moved.weeks[0].days[1].exerciseText).to.contain("Squat / ...main[2]");
      expect(moved.weeks[0].days[2].exerciseText).to.contain("Squat / ...main[3]");
      expect(errorsOf(moved)).to.deep.equal([]);
      expect(cardsByName(moved)).to.deep.equal(cardsByName(planner));
    });
  });

  describe("scripts that read the day", () => {
    it("allows a move that leaves the dayInWeek exercise in place", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb / progress: custom() {~
  if (dayInWeek == 1) { weights += 5lb }
~}

## Day 2
Bench Press / 3x5 50lb

## Day 3
Deadlift / 1x5 150lb
`;
      expect(ProgramDayOrder_move(plannerOf(text), 2, 1, settings).success).to.equal(true);
      expect(ProgramDayOrder_move(plannerOf(text), 0, 1, settings).success).to.equal(false);
    });

    it("refuses any move when a script addresses a day slot", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb / progress: custom() {~
  weights[2:*:*] = 110lb
~}

## Day 2
Bench Press / 3x5 50lb

## Day 3
Deadlift / 1x5 150lb
`;
      expect(ProgramDayOrder_move(plannerOf(text), 2, 1, settings).success).to.equal(false);
    });

    it("ignores a state variable that happens to be called day", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb / progress: custom(day: 0) {~
  state.day += 1
~}

## Day 2
Bench Press / 3x5 50lb
`;
      expect(ProgramDayOrder_move(plannerOf(text), 0, 1, settings).success).to.equal(true);
    });
  });

  describe("every builtin program", () => {
    const files = fs.readdirSync(builtinDir).filter((file) => file.endsWith(".md"));
    const moved = new Set<string>();
    const refused = new Map<string, string>();
    for (const file of files) {
      it(`${file}: moving the last day first and the first day last still parses with no errors`, () => {
        const planner = plannerOf(fenceOf(file));
        expect(errorsOf(planner), file).to.deep.equal([]);
        const rows = ProgramDayOrder_rowCount(planner);
        if (rows < 2) {
          return;
        }
        const before = cardsByName(planner);
        for (const [from, to] of [
          [rows - 1, 0],
          [0, rows - 1],
        ]) {
          const result = ProgramDayOrder_move(planner, from, to, settings);
          if (!result.success) {
            expect(result.error, file).to.contain("day numbers");
            refused.set(file, result.error);
            continue;
          }
          expect(errorsOf(result.data), `${file} ${from} -> ${to}`).to.deep.equal([]);
          expect(cardsByName(result.data), `${file} ${from} -> ${to}`).to.deep.equal(before);
          moved.add(file);
        }
      });
    }

    after(() => {
      console.log(`      moved: ${moved.size} of ${files.length}; refused for day numbers: ${refused.size}`);
      for (const [file, error] of refused) {
        console.log(`        ${file}: ${error}`);
      }
    });
  });

  describe("apply", () => {
    const text = `# Week 1
## Day A
Squat / 3x5 100lb

## Day B
Bench Press / 3x5 50lb
`;

    it("saves the move when the editor holds no unsaved edits", () => {
      const program: IProgram = { ...Program_create("P"), planner: plannerOf(text) };
      const result = ProgramDayOrder_apply(program, program, 1, 0, settings);
      expect(result.success).to.equal(true);
      if (result.success) {
        expect(result.data.saved?.planner?.weeks[0].days.map((d) => d.name)).to.deep.equal(["Day B", "Day A"]);
        expect(result.data.draft.planner?.weeks[0].days.map((d) => d.name)).to.deep.equal(["Day B", "Day A"]);
      }
    });

    it("keeps the move in the draft when the editor holds unsaved edits", () => {
      const saved: IProgram = { ...Program_create("P"), planner: plannerOf(text) };
      const draft: IProgram = { ...saved, planner: plannerOf(text.replace("50lb", "55lb")) };
      const result = ProgramDayOrder_apply(saved, draft, 1, 0, settings);
      expect(result.success).to.equal(true);
      if (result.success) {
        expect(result.data.saved).to.equal(undefined);
        expect(result.data.draft.planner?.weeks[0].days[0].exerciseText).to.contain("55lb");
      }
    });
  });
});
