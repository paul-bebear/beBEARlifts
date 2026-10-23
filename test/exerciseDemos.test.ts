import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  ExerciseDemos_allKeys,
  ExerciseDemos_cell,
  ExerciseDemos_find,
  ExerciseDemos_key,
  ExerciseDemos_posterFrame,
  ExerciseDemos_rows,
} from "../src/models/exerciseDemos";
import { ExerciseDemoMedia_byKey } from "../src/models/exerciseDemoMedia";
import { ExerciseDemoTips_byKey } from "../src/models/exerciseDemoTips";
import { Exercise_findByNameAndEquipment } from "../src/models/exercise";
import { IAllCustomExercises } from "../src/types";

const root = path.join(__dirname, "..");

function programLiftNames(): string[] {
  const text = fs.readFileSync(path.join(root, "programs", "builtin", "bebear-ulppl.md"), "utf8");
  const script = text.split("```liftoscript")[1].split("```")[0];
  const names = script
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#") && !line.startsWith("//") && line.includes(" / "))
    .filter((line) => !line.includes("used: none"))
    .map((line) => line.split(" / ")[0]);
  return Array.from(new Set(names));
}

describe("ExerciseDemos coverage of the beBEAR 5-day plan", () => {
  it("finds 26 unique lifts in the program text", () => {
    expect(programLiftNames()).to.have.length(26);
  });

  it("opens a demo for every lift in the program", () => {
    for (const name of programLiftNames()) {
      const exercise = Exercise_findByNameAndEquipment(name, {});
      expect(exercise, name).to.not.equal(undefined);
      const lookup = ExerciseDemos_find({ id: exercise!.id, equipment: exercise!.equipment }, {});
      expect(lookup.kind, name).to.equal("demo");
    }
  });
});

describe("ExerciseDemos_key", () => {
  it("uses the catalog default equipment when the type has none", () => {
    expect(ExerciseDemos_key({ id: "squat" }, {})).to.equal("squat_barbell");
    expect(ExerciseDemos_key({ id: "pullUp" }, {})).to.equal("pullup_bodyweight");
  });

  it("keeps an explicit equipment", () => {
    expect(ExerciseDemos_key({ id: "chestFly", equipment: "cable" }, {})).to.equal("chestfly_cable");
  });
});

describe("ExerciseDemos_find", () => {
  it("reports a missing demo instead of showing another equipment's clip", () => {
    const lookup = ExerciseDemos_find({ id: "squat", equipment: "dumbbell" }, {});
    expect(lookup.kind).to.equal("missing");
    expect(lookup.key).to.equal("squat_dumbbell");
  });

  it("reports custom exercises as missing", () => {
    const custom: IAllCustomExercises = {
      myLift: {
        vtype: "custom_exercise",
        id: "myLift",
        name: "My Lift",
        isDeleted: false,
        meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
      },
    };
    expect(ExerciseDemos_find({ id: "myLift" }, custom).kind).to.equal("missing");
  });

  it("returns the demo url under images/exercises/demo", () => {
    const lookup = ExerciseDemos_find({ id: "benchPress" }, {});
    expect(lookup.kind === "demo" && lookup.url).to.equal("/images/exercises/demo/benchpress_barbell.webp");
  });
});

describe("Exercise demo data", () => {
  it("has three cues and at least two mistakes for every demo, and no tips without a demo", () => {
    expect(Object.keys(ExerciseDemoTips_byKey).sort()).to.deep.equal(ExerciseDemos_allKeys().sort());
    for (const key of ExerciseDemos_allKeys()) {
      expect(ExerciseDemoTips_byKey[key].cues, key).to.have.length(3);
      expect(ExerciseDemoTips_byKey[key].mistakes.length, key).to.be.at.least(2);
    }
  });

  it("ships the sprite file with the byte count the cache file name uses", () => {
    for (const key of ExerciseDemos_allKeys()) {
      const file = path.join(root, "images", "exercises", "demo", `${key}.webp`);
      expect(fs.statSync(file).size, key).to.equal(ExerciseDemoMedia_byKey[key].bytes);
    }
  });

  it("records the source, checksum and review of every imported demo", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "scripts", "exerciseDemos", "manifest.json"), "utf8"));
    for (const key of ExerciseDemos_allKeys()) {
      const entry = manifest.imported[key];
      expect(entry.sha256, key).to.match(/^[0-9a-f]{64}$/);
      expect(entry.review, key).to.be.a("string").and.not.equal("");
      expect(entry.frames, key).to.equal(ExerciseDemoMedia_byKey[key].frames);
    }
  });

  it("has one duration per frame", () => {
    for (const key of ExerciseDemos_allKeys()) {
      const media = ExerciseDemoMedia_byKey[key];
      expect(media.frameMs, key).to.have.length(media.frames);
    }
  });
});

describe("ExerciseDemos sprite geometry", () => {
  const media = {
    frames: 12,
    columns: 4,
    frameMs: [100, 100, 1000, 100, 100, 100, 1000, 100, 100, 100, 100, 100],
    bytes: 1,
  };

  it("places frames left to right, then top to bottom", () => {
    expect(ExerciseDemos_cell(media, 0)).to.deep.equal({ column: 0, row: 0 });
    expect(ExerciseDemos_cell(media, 5)).to.deep.equal({ column: 1, row: 1 });
    expect(ExerciseDemos_cell(media, 11)).to.deep.equal({ column: 3, row: 2 });
    expect(ExerciseDemos_rows(media)).to.equal(3);
  });

  it("uses the first longest frame as the still", () => {
    expect(ExerciseDemos_posterFrame(media)).to.equal(2);
  });
});
