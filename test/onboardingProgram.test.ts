import "mocha";
import { expect } from "chai";
import { OnboardingProgram_prepare } from "../src/models/onboardingProgram";
import { OnboardingCatalog_programs } from "../src/utils/onboardingCatalog";
import { Settings_build } from "../src/models/settings";

describe("OnboardingProgram", () => {
  const settings = Settings_build();
  it("clones built-ins without mutating the source and switches their units", () => {
    const programs = OnboardingCatalog_programs();
    const before = JSON.stringify(programs);
    const result = OnboardingProgram_prepare(
      { builtin: "fierce-5", note: "", renamed: [] },
      programs,
      { ...settings, units: "kg" },
      "new-id",
      123
    );
    expect(result.program).to.include({ id: "new-id", name: "Fierce 5", clonedAt: 123 });
    expect(JSON.stringify(programs)).to.equal(before);
    expect(result.program.planner?.weeks.length).to.be.greaterThan(0);
  });
  it("validates full Liftoscript before creating a planner program", () => {
    const answer = { liftoscript: "# Week 1\n## Day 1\nSquat / 3x5 / 60kg", note: "", renamed: [] };
    const result = OnboardingProgram_prepare(answer, [], settings, "new-id", 123);
    expect(result.days).to.equal(1);
    expect(result.program.planner?.weeks[0].days[0].exerciseText).to.include("Squat");
    expect(() =>
      OnboardingProgram_prepare({ ...answer, liftoscript: "# Week 1\n## Day 1\nSquat / 3x" }, [], settings, "id", 1)
    ).to.throw();
    expect(() =>
      OnboardingProgram_prepare({ ...answer, liftoscript: "# Week 1\n## Day 1\n" }, [], settings, "id", 1)
    ).to.throw();
  });
  it("refuses unreadable history before any state is saved", () => {
    const answer = { liftoscript: "# Week 1\n## Day 1\nSquat / 3x5", historyCsv: "invalid CSV", note: "", renamed: [] };
    expect(() => OnboardingProgram_prepare(answer, [], settings, "id", 1)).to.throw();
  });
});
