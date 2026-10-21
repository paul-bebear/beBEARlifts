import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  ExerciseImageUtils_exists,
  ExerciseImageUtils_initials,
  ExerciseImageUtils_migrateCustomUrl,
  ExerciseImageUtils_url,
} from "../src/models/exerciseImage";
import {
  FreeExerciseDbImages_allIds,
  FreeExerciseDbImages_byKey,
  FreeExerciseDbImages_idOf,
} from "../src/models/freeExerciseDbImages";
import { allExercisesList } from "../src/models/exercise";
import { ISettings } from "../src/types";

const imagesDir = path.join(__dirname, "..", "images", "exercises");

describe("FreeExerciseDbImages", () => {
  it("maps keys made of a built-in exercise id and its equipment", () => {
    const ids = new Set(Object.keys(allExercisesList).map((id) => id.toLowerCase()));
    for (const key of Object.keys(FreeExerciseDbImages_byKey)) {
      expect(key).to.match(/^[a-z0-9]+_[a-z0-9]+$/);
      expect(ids.has(key.split("_")[0]), key).to.equal(true);
    }
  });

  it("has a small and a large file in images/exercises for every mapped photo", () => {
    for (const id of FreeExerciseDbImages_allIds()) {
      expect(fs.existsSync(path.join(imagesDir, "small", `${id}.jpg`)), `small/${id}.jpg`).to.equal(true);
      expect(fs.existsSync(path.join(imagesDir, "large", `${id}.jpg`)), `large/${id}.jpg`).to.equal(true);
    }
  });

  it("ships no photo the map does not use", () => {
    const used = new Set(FreeExerciseDbImages_allIds().map((id) => `${id}.jpg`));
    for (const size of ["small", "large"]) {
      expect(fs.readdirSync(path.join(imagesDir, size)).filter((f) => !used.has(f))).to.eql([]);
    }
  });

  it("ignores keys inherited from Object.prototype", () => {
    expect(FreeExerciseDbImages_idOf("constructor")).to.equal(undefined);
  });
});

describe("ExerciseImageUtils", () => {
  it("serves a mapped exercise from the fork's own images folder", () => {
    expect(ExerciseImageUtils_url({ id: "squat", equipment: "barbell" }, "small")).to.equal(
      "/images/exercises/small/Barbell_Squat.jpg"
    );
    expect(ExerciseImageUtils_url({ id: "squat", equipment: "barbell" }, "large")).to.equal(
      "/images/exercises/large/Barbell_Squat.jpg"
    );
  });

  it("has no image for an equipment without a matching photo", () => {
    expect(ExerciseImageUtils_exists({ id: "benchPress", equipment: "kettlebell" }, "small")).to.equal(false);
    expect(ExerciseImageUtils_url({ id: "benchPress", equipment: "kettlebell" }, "small")).to.equal(undefined);
  });

  it("treats a missing equipment as bodyweight", () => {
    expect(ExerciseImageUtils_exists({ id: "pullUp" }, "small")).to.equal(true);
  });

  it("rewrites a custom exercise image saved from Liftosaur's library to the matching photo", () => {
    const old = "/externalimages/exercises/single/small/benchpress_barbell_single_small.png";
    expect(ExerciseImageUtils_migrateCustomUrl(old, "small")).to.equal(
      "/images/exercises/small/Barbell_Bench_Press_-_Medium_Grip.jpg"
    );
    const oldLarge = "https://www.liftosaur.com/externalimages/exercises/full/large/benchpress_barbell_full_large.png";
    expect(ExerciseImageUtils_migrateCustomUrl(oldLarge, "large")).to.equal(
      "/images/exercises/large/Barbell_Bench_Press_-_Medium_Grip.jpg"
    );
  });

  it("drops a custom image that points at a Liftosaur host and has no replacement", () => {
    const unmapped = "/externalimages/exercises/single/small/archhang_bodyweight_single_small.png";
    expect(ExerciseImageUtils_migrateCustomUrl(unmapped, "small")).to.equal(undefined);
    expect(ExerciseImageUtils_migrateCustomUrl("https://www.liftosaur.com/uploads/x.png", "small")).to.equal(undefined);
    expect(
      ExerciseImageUtils_migrateCustomUrl("https://liftosaurimages2.s3-us-west-2.amazonaws.com/u/x.png", "small")
    ).to.equal(undefined);
  });

  it("keeps a custom image hosted anywhere else", () => {
    expect(ExerciseImageUtils_migrateCustomUrl("https://example.com/my.png", "small")).to.equal(
      "https://example.com/my.png"
    );
    expect(ExerciseImageUtils_migrateCustomUrl("https://notliftosaur.company/x.png", "small")).to.equal(
      "https://notliftosaur.company/x.png"
    );
  });

  it("uses the migrated custom image for a custom exercise", () => {
    const settings = {
      exercises: {
        mine: { smallImageUrl: "/externalimages/exercises/single/small/squat_barbell_single_small.png" },
      },
    } as unknown as ISettings;
    expect(ExerciseImageUtils_url({ id: "mine" as never }, "large", settings)).to.equal(
      "/images/exercises/large/Barbell_Squat.jpg"
    );
  });

  it("builds a placeholder from the first two words of the name", () => {
    expect(ExerciseImageUtils_initials("Bench Press")).to.equal("BP");
    expect(ExerciseImageUtils_initials("Standing Row Rear Delt, Horizontal, With Rope")).to.equal("SR");
    expect(ExerciseImageUtils_initials("plank")).to.equal("P");
    expect(ExerciseImageUtils_initials("")).to.equal("");
  });
});
