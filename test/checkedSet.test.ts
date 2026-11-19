import "mocha";
import { expect } from "chai";
import { CheckedSet_toggle } from "../src/models/checkedSet";

describe("CheckedSet", () => {
  it("adds an id that is not there", () => {
    expect([...CheckedSet_toggle(new Set(["a"]), "b")]).to.deep.equal(["a", "b"]);
  });

  it("removes an id that is there", () => {
    expect([...CheckedSet_toggle(new Set(["a", "b"]), "a")]).to.deep.equal(["b"]);
  });

  it("returns a new set and leaves the input alone", () => {
    const input = new Set(["a"]);
    const next = CheckedSet_toggle(input, "b");
    expect(next).to.not.equal(input);
    expect([...input]).to.deep.equal(["a"]);
  });
});
