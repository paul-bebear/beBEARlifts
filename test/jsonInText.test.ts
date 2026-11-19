import "mocha";
import { expect } from "chai";
import { JsonInText_extract } from "../src/models/jsonInText";

describe("JsonInText_extract", () => {
  it("reads JSON inside a json code fence", () => {
    const text = 'Here is your plan:\n```json\n{"builtin":"fierce-5","note":"Fits 3 days"}\n```\nGood luck!';
    expect(JsonInText_extract(text)).to.deep.equal({ builtin: "fierce-5", note: "Fits 3 days" });
  });

  it("reads JSON inside a bare code fence", () => {
    expect(JsonInText_extract('```\n{"builtin":"gzclp"}\n```')).to.deep.equal({ builtin: "gzclp" });
  });

  it("reads bare JSON with text before and after", () => {
    const text = 'Sure. {"liftoscript":"# Week 1\\n## Day 1\\nSquat / 3x5","renamed":[]} Let me know.';
    expect(JsonInText_extract(text)).to.deep.equal({ liftoscript: "# Week 1\n## Day 1\nSquat / 3x5", renamed: [] });
  });

  it("keeps braces that sit inside JSON strings", () => {
    const text = '{"liftoscript":"Squat / 3x5 / progress: lp(5lb)","note":"use {kg} later"}';
    expect(JsonInText_extract(text)).to.deep.equal({
      liftoscript: "Squat / 3x5 / progress: lp(5lb)",
      note: "use {kg} later",
    });
  });

  it("takes the first fenced block when there are two", () => {
    const text = '```json\n{"builtin":"fierce-5"}\n```\nOr:\n```json\n{"builtin":"gzclp"}\n```';
    expect(JsonInText_extract(text)).to.deep.equal({ builtin: "fierce-5" });
  });

  it("takes the first object when two bare blocks follow each other", () => {
    expect(JsonInText_extract('{"builtin":"fierce-5"}\nor\n{"builtin":"gzclp"}')).to.deep.equal({
      builtin: "fierce-5",
    });
  });

  it("skips braces in prose before the JSON", () => {
    const text = 'Use {kg} units. {"builtin":"fierce-5","note":"ok"}';
    expect(JsonInText_extract(text)).to.deep.equal({ builtin: "fierce-5", note: "ok" });
  });

  it("returns undefined for an answer cut off inside a list, never one inner item", () => {
    const text = '{"items":[{"name":"Montadito","grams":420},{"name":"Potato chips","grams":60},{"name":"Bee';
    expect(JsonInText_extract(text)).to.equal(undefined);
    expect(JsonInText_extract("```json\n" + text + "\n```")).to.equal(undefined);
  });

  it("returns undefined for broken JSON", () => {
    expect(JsonInText_extract('{"builtin":"fierce-5",')).to.equal(undefined);
    expect(JsonInText_extract('```json\n{"builtin": fierce-5}\n```')).to.equal(undefined);
  });

  it("returns undefined when there is no object", () => {
    expect(JsonInText_extract("")).to.equal(undefined);
    expect(JsonInText_extract("I cannot build a plan from these screenshots.")).to.equal(undefined);
    expect(JsonInText_extract("} backwards {")).to.equal(undefined);
  });
});
