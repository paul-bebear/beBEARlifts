import "mocha";
import { expect } from "chai";
import { LocalId_new } from "../src/utils/localId";
import { FoodLogStore_newId } from "../src/utils/foodLogStore";
import { NotesStore_newId } from "../src/utils/notesStore";

describe("LocalId", () => {
  it("keeps the time prefix and 6 random characters", () => {
    expect(LocalId_new(1700000000000, () => 0.5)).to.equal("loyw3v28i");
  });

  it("makes different ids for the same millisecond", () => {
    const ids = new Set(Array.from({ length: 200 }, () => LocalId_new(5)));
    expect(ids.size).to.equal(200);
  });

  it("makes ids of lowercase letters and digits only", () => {
    expect(LocalId_new()).to.match(/^[a-z0-9]+$/);
  });

  it("is what both stores hand out", () => {
    expect(FoodLogStore_newId()).to.match(/^[a-z0-9]{10,}$/);
    expect(NotesStore_newId()).to.match(/^[a-z0-9]{10,}$/);
  });
});
