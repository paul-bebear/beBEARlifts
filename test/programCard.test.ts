import "mocha";
import { expect } from "chai";
import { ProgramCard_build, ProgramCard_hasErrors } from "../src/models/programCard";
import { Program_createEmptyProgram } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { KitchenSinkProgram_build } from "../test-render/harness/kitchenSinkProgram";
import type { IProgram } from "../src/types";

const settings = Settings_build();

function brokenProgram(): IProgram {
  const program = KitchenSinkProgram_build();
  const planner = program.planner!;
  const week = { ...planner.weeks[0], days: [{ ...planner.weeks[0].days[0], exerciseText: "Squat / ((( nonsense" }] };
  return { ...program, planner: { ...planner, weeks: [week, ...planner.weeks.slice(1)] } };
}

describe("ProgramCard", () => {
  it("asks for a program when none is selected", () => {
    const card = ProgramCard_build(undefined, settings);
    expect(card.title).to.equal("No program yet");
    expect(card.hasErrors).to.equal(false);
  });

  it("treats the ad-hoc placeholder program as no program", () => {
    expect(ProgramCard_build(Program_createEmptyProgram(), settings).title).to.equal("No program yet");
  });

  it("shows the program name and no error dot for a valid program", () => {
    const program = KitchenSinkProgram_build();
    const card = ProgramCard_build(program, settings);
    expect(card.title).to.equal(program.name);
    expect(card.hasErrors).to.equal(false);
    expect(ProgramCard_hasErrors(program, settings)).to.equal(false);
  });

  it("flags a program whose planner text does not evaluate", () => {
    const program = brokenProgram();
    const card = ProgramCard_build(program, settings);
    expect(card.hasErrors).to.equal(true);
    expect(card.subtitle).to.contain("errors");
    expect(ProgramCard_hasErrors(program, settings)).to.equal(true);
  });

  it("has no errors when there is no program", () => {
    expect(ProgramCard_hasErrors(undefined, settings)).to.equal(false);
  });
});
