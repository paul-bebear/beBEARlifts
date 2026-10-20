import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { PlannerMode_commitFullText } from "../src/pages/planner/models/plannerMode";
import { Settings_build } from "../src/models/settings";
import { equipmentName, Exercise_findByName } from "../src/models/exercise";

const root = path.resolve(__dirname, "..");
const prompt = fs.readFileSync(path.join(root, "llms/program_builder_prompt.md"), "utf8");
const exerciseLines = new Set(fs.readFileSync(path.join(root, "llms/exercises.md"), "utf8").split("\n"));
const settings = Settings_build();

function liftoscriptBlocks(text: string): string[] {
  return Array.from(text.matchAll(/```liftoscript\n([\s\S]*?)```/g), (m) => m[1]);
}

function listedExercises(text: string): string[] {
  const lines = text.split("\n").filter((l) => /^- (Squat|Hinge|Push|Pull|Calves and core): /.test(l));
  return lines.flatMap((l) => l.replace(/^- [^:]+: /, "").split("; "));
}

function errorOf(programText: string): string | undefined {
  const { weeks, error } = PlannerMode_commitFullText(programText, settings);
  if (weeks == null || error != null) {
    return `${error?.message ?? "no weeks parsed"} (line ${error?.line})`;
  }
  return undefined;
}

function isBuiltinVariant(nameAndEquipment: string): boolean {
  if (exerciseLines.has(nameAndEquipment)) {
    return true;
  }
  const [name, equipment] = nameAndEquipment.split(", ");
  const exercise = exerciseLines.has(name) ? Exercise_findByName(name, {}) : undefined;
  return exercise != null && equipmentName(exercise.defaultEquipment) === equipment;
}

describe("Program builder prompt", () => {
  it("has one example program and it parses without errors", () => {
    const blocks = liftoscriptBlocks(prompt);
    expect(blocks).to.have.length(1);
    expect(errorOf(blocks[0])).to.equal(undefined);
  });

  it("names the equipment on every exercise of the example", () => {
    const exercises = liftoscriptBlocks(prompt)[0]
      .split("\n")
      .filter((l) => l.includes(" / "))
      .map((l) => l.split(" / ")[0]);
    expect(exercises.filter((e) => !e.includes(", "))).to.deep.equal([]);
  });

  it("lists only exercise and equipment pairs the app has", () => {
    const entries = listedExercises(prompt);
    expect(entries.length).to.be.greaterThan(50);
    expect(entries.filter((e) => !isBuiltinVariant(e))).to.deep.equal([]);
    expect(entries.filter((e) => errorOf(`# Week 1\n## Day 1\n${e} / 1x5 / 0lb\n`) != null)).to.deep.equal([]);
  });

  it("names every built-in program", () => {
    const dir = path.join(root, "programs/builtin");
    const names = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => String(matter(fs.readFileSync(path.join(dir, f), "utf8")).data.name));
    expect(names.filter((name) => !prompt.includes(`- ${name} (`))).to.deep.equal([]);
  });
});
