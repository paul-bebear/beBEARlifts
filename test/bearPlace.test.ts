import "mocha";
import { expect } from "chai";
import { BearPlace_equipmentKeys, BearPlace_resolve } from "../src/models/bearPlace";

describe("BearPlace", () => {
  it("resolves picks to places in the order gym, dumbbells, street, floor", () => {
    expect(BearPlace_resolve(["street", "gym"])).to.deep.equal(["gym", "street", "floor"]);
    expect(BearPlace_resolve(["none", "dumbbells", "gym", "street"])).to.deep.equal([
      "gym",
      "dumbbells",
      "street",
      "floor",
    ]);
  });

  it("always includes floor, also with no picks or repeated picks", () => {
    expect(BearPlace_resolve([])).to.deep.equal(["floor"]);
    expect(BearPlace_resolve(["none"])).to.deep.equal(["floor"]);
    expect(BearPlace_resolve(["dumbbells", "dumbbells"])).to.deep.equal(["dumbbells", "floor"]);
  });

  it("gives each place its equipment keys, with bodyweight from floor every time", () => {
    expect(BearPlace_equipmentKeys(["floor"])).to.deep.equal(["bodyweight"]);
    expect(BearPlace_equipmentKeys(["street", "floor"])).to.deep.equal(["bodyweight"]);
    expect(BearPlace_equipmentKeys(["dumbbells", "floor"])).to.deep.equal(["dumbbell", "bodyweight"]);
    expect(BearPlace_equipmentKeys(["gym", "floor"])).to.deep.equal([
      "barbell",
      "dumbbell",
      "cable",
      "leverageMachine",
      "smith",
      "ezbar",
      "trapbar",
      "kettlebell",
      "bodyweight",
    ]);
  });

  it("adds bodyweight even when floor is missing from the list", () => {
    expect(BearPlace_equipmentKeys(["dumbbells"])).to.deep.equal(["dumbbell", "bodyweight"]);
  });
});
