import "mocha";
import { expect } from "chai";
import { ExerciseDemoCache_evictions, ExerciseDemoCache_fileName } from "../src/models/exerciseDemoCache";

const limits = { maxFiles: 3, maxBytes: 300 };

describe("ExerciseDemoCache_evictions", () => {
  it("keeps everything under both limits", () => {
    const files = [
      { name: "a", bytes: 100, usedAt: 1 },
      { name: "b", bytes: 100, usedAt: 2 },
    ];
    expect(ExerciseDemoCache_evictions(files, "b", limits)).to.deep.equal([]);
  });

  it("deletes the least recently used files past the file limit", () => {
    const files = [
      { name: "old", bytes: 10, usedAt: 1 },
      { name: "older", bytes: 10, usedAt: 0 },
      { name: "new", bytes: 10, usedAt: 5 },
      { name: "mid", bytes: 10, usedAt: 3 },
    ];
    expect(ExerciseDemoCache_evictions(files, "new", limits)).to.deep.equal(["older"]);
  });

  it("deletes every older file once one does not fit the byte limit", () => {
    const files = [
      { name: "new", bytes: 200, usedAt: 9 },
      { name: "big", bytes: 150, usedAt: 8 },
      { name: "tiny", bytes: 10, usedAt: 7 },
    ];
    expect(ExerciseDemoCache_evictions(files, "new", limits)).to.deep.equal(["big", "tiny"]);
  });

  it("never deletes the demo on screen, even when it is the oldest", () => {
    const files = [
      { name: "shown", bytes: 250, usedAt: 0 },
      { name: "recent", bytes: 100, usedAt: 9 },
    ];
    expect(ExerciseDemoCache_evictions(files, "shown", limits)).to.deep.equal(["recent"]);
  });

  it("puts the byte count in the file name so a re-import replaces the cached copy", () => {
    expect(ExerciseDemoCache_fileName("squat_barbell", 107072)).to.equal("squat_barbell-107072.webp");
  });
});
