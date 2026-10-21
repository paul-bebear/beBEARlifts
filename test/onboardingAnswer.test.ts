import "mocha";
import { expect } from "chai";
import { OnboardingAnswer_parse } from "../src/models/onboardingAnswer";

describe("OnboardingAnswer", () => {
  it("accepts a known built-in or a text plan with history and renamed exercises", () => {
    expect(OnboardingAnswer_parse('{"builtin":"fierce-5","note":"Fits your goal"}', ["fierce-5"]).builtin).to.equal(
      "fierce-5"
    );
    const answer = OnboardingAnswer_parse(
      { liftoscript: "# Week 1\n## Day 1\nSquat / 3x5", historyCsv: "csv", renamed: [["Barbell squat", "Squat"]] },
      []
    );
    expect(answer.renamed).to.deep.equal([["Barbell squat", "Squat"]]);
  });
  it("rejects malformed JSON, prose, unknown IDs, and ambiguous answers", () => {
    for (const value of [
      "not JSON",
      "```json\n{}\n```",
      undefined,
      [],
      null,
      {},
      { builtin: "unknown" },
      { builtin: "fierce-5", liftoscript: "Squat / 3x5" },
      { liftoscript: "" },
    ]) {
      expect(() => OnboardingAnswer_parse(value, ["fierce-5"])).to.throw();
    }
  });
  it("rejects wrong types and oversized untrusted fields", () => {
    for (const patch of [
      { historyCsv: {} },
      { historyCsv: "x".repeat(400_001) },
      { renamed: "bad" },
      { renamed: [["name", 3]] },
      { renamed: [["a"]] },
      { renamed: new Array(101).fill(["a", "b"]) },
      { note: {} },
      { note: "x".repeat(4001) },
      { liftoscript: "x".repeat(100_001) },
    ]) {
      expect(() => OnboardingAnswer_parse({ liftoscript: "valid", ...patch }, [])).to.throw();
    }
  });
});
