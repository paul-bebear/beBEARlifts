import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { IBearState } from "../src/models/bear";
import { BearTier_progress } from "../src/models/bearTier";
import { IExerciseType, IHistoryEntry, IHistoryRecord, ISet } from "../src/types";
import {
  WorkoutPost_build,
  WorkoutPost_feedLine,
  WorkoutPost_levelText,
  WorkoutPost_parse,
} from "../src/models/workoutPost";

const bench: IExerciseType = { id: "benchPress", equipment: "barbell" };
const t0 = Date.UTC(2026, 9, 8);

function set(weight: number, reps: number): ISet {
  return {
    vtype: "set",
    index: 0,
    reps,
    weight: { value: weight, unit: "kg" },
    completedWeight: { value: weight, unit: "kg" },
    completedReps: reps,
    isCompleted: true,
  } as ISet;
}

function record(id: number, sets: ISet[]): IHistoryRecord {
  const entry: IHistoryEntry = {
    vtype: "history_entry",
    index: 0,
    id: "benchPress",
    exercise: bench,
    sets,
    warmupSets: [],
  };
  return {
    vtype: "history_record",
    date: new Date(id).toISOString(),
    programId: "p",
    programName: "Strong",
    day: 1,
    dayName: "Push day",
    entries: [entry],
    startTime: id,
    endTime: id + 48 * 60000,
    id,
  };
}

const workout = record(t0, [set(100, 5), set(100, 5), set(100, 5)]);

function bear(countedKg: number): IBearState {
  return {
    line: "female",
    fur: "polar",
    tierSet: "female",
    level: BearTier_progress(0, 70000, "female"),
    countedKg: 70000,
    fullness: 60,
    energy: 90,
    mood: "pumped",
    workouts: [{ record: workout, countedKg }],
  };
}

describe("WorkoutPost version 3", () => {
  const settings = { ...Settings_build(), units: "kg" as const };

  it("adds the bear and up to three kept song titles", () => {
    const summary = WorkoutPost_build(
      workout,
      settings,
      {},
      {
        keptSongs: 4,
        songs: ["One", "Two", "Three", "Four"],
        bear: bear(1499.6),
      }
    );
    expect(summary.version).to.equal(4);
    expect(summary.bear).to.deep.equal({ level: 5, mood: "pumped", countedKg: 1500, line: "female", fur: "polar" });
    expect(summary.songs).to.deep.equal(["One", "Two", "Three"]);
    expect(WorkoutPost_parse(JSON.parse(JSON.stringify(summary)))).to.deep.equal(summary);
  });

  it("carries the cub number in version 4 and reads version 3 posts without one", () => {
    const summary = WorkoutPost_build(workout, settings, {}, { bear: bear(10), cub: 412 });
    expect(summary.cub).to.equal(412);
    expect(WorkoutPost_parse(JSON.parse(JSON.stringify(summary)))?.cub).to.equal(412);
    expect(WorkoutPost_parse({ ...summary, cub: 0 })?.cub).to.equal(0);
    expect(WorkoutPost_build(workout, settings, {}, undefined).cub).to.equal(undefined);
    const v3 = WorkoutPost_parse({ ...summary, version: 3 })!;
    expect(v3.version).to.equal(3);
    expect(v3.cub).to.equal(undefined);
    expect(v3.bear?.fur).to.equal("polar");
    expect(WorkoutPost_parse({ ...summary, cub: -1 })?.cub).to.equal(undefined);
    expect(WorkoutPost_parse({ ...summary, cub: "412" })?.cub).to.equal(undefined);
    expect(WorkoutPost_parse({ ...summary, cub: 4.5 })?.cub).to.equal(undefined);
  });

  it("reads a post from a newer app version as version 4, so the bear and number stay", () => {
    const summary = WorkoutPost_build(workout, settings, {}, { bear: bear(10), cub: 7 });
    const v5 = WorkoutPost_parse({ ...summary, version: 5 })!;
    expect(v5.version).to.equal(4);
    expect(v5.bear?.level).to.equal(5);
    expect(v5.cub).to.equal(7);
  });

  it("counts zero kg for a workout the bear did not count", () => {
    const other = { ...bear(0), workouts: [] };
    expect(WorkoutPost_build(workout, settings, {}, { bear: other }).bear?.countedKg).to.equal(0);
  });

  it("reads version 1 posts without a bear or songs", () => {
    const v1 = {
      ...WorkoutPost_build(workout, settings, {}, undefined),
      version: 1,
      bear: undefined,
      songs: undefined,
    };
    const parsed = WorkoutPost_parse(JSON.parse(JSON.stringify(v1)))!;
    expect(parsed.version).to.equal(1);
    expect(parsed.bear).to.equal(undefined);
    expect(parsed.songs).to.deep.equal([]);
    const forged = WorkoutPost_parse({ ...v1, bear: { level: 4, mood: "pumped", countedKg: 1 }, songs: ["x"] })!;
    expect(forged.bear).to.equal(undefined);
    expect(forged.songs).to.deep.equal([]);
  });

  it("drops a bear with an unknown level or mood, and song titles that are not text", () => {
    const base = { ...WorkoutPost_build(workout, settings, {}, { bear: bear(10) }) };
    expect(WorkoutPost_parse({ ...base, bear: { level: 99, mood: "pumped", countedKg: 1 } })?.bear).to.equal(undefined);
    expect(WorkoutPost_parse({ ...base, bear: { level: 2, mood: "angry", countedKg: 1 } })?.bear).to.equal(undefined);
    expect(
      WorkoutPost_parse({ ...base, bear: { level: 2, mood: "tired", countedKg: -5, line: "x" } })?.bear
    ).to.deep.equal({ level: 2, mood: "tired", countedKg: 0, fur: "brown" });
    expect(WorkoutPost_parse({ ...base, songs: [1, "", "Song", "x".repeat(300)] })?.songs).to.deep.equal([
      "Song",
      "x".repeat(80),
    ]);
    expect(
      WorkoutPost_parse({ ...base, bear: { level: 2, mood: "tired", countedKg: 1, equipped: ["hat"] } })?.bear
    ).to.deep.equal({ level: 2, mood: "tired", countedKg: 1, fur: "brown" });
  });

  it("keeps the fur of a version 3 bear and reads an unknown fur as brown", () => {
    const base = WorkoutPost_build(workout, settings, {}, { bear: { ...bear(10), fur: "black" } });
    expect(base.bear?.fur).to.equal("black");
    expect(WorkoutPost_parse(JSON.parse(JSON.stringify(base)))?.bear?.fur).to.equal("black");
    expect(WorkoutPost_parse({ ...base, bear: { ...base.bear, fur: "green" } })?.bear?.fur).to.equal("brown");
    expect(WorkoutPost_parse({ ...base, bear: { ...base.bear, fur: undefined } })?.bear?.fur).to.equal("brown");
  });

  it("reads a version 2 post as a brown bear, even when the fur field is forged", () => {
    const v2 = { ...WorkoutPost_build(workout, settings, {}, { bear: bear(10) }), version: 2 as const };
    const parsed = WorkoutPost_parse(JSON.parse(JSON.stringify(v2)))!;
    expect(parsed.version).to.equal(2);
    expect(parsed.bear?.fur).to.equal("brown");
    expect(parsed.bear?.line).to.equal("female");
  });

  it("writes the feed row with counted kg next to the duration", () => {
    const summary = WorkoutPost_build(workout, settings, {}, { songs: ["One", "Two", "Three"], bear: bear(3100) });
    const withBear = { ...summary, sets: 12 };
    expect(WorkoutPost_levelText(withBear.bear!)).to.equal("Level 5 Regular");
    expect(WorkoutPost_levelText({ level: 40 })).to.equal("Level 40");
    expect(WorkoutPost_feedLine(withBear)).to.equal("Push day · 48 min · 12 sets · +3,100 kg · 🎵 3 songs");
    const v1 = { ...withBear, version: 1 as const, bear: undefined, songs: [], keptSongs: 1 };
    expect(WorkoutPost_feedLine(v1)).to.equal("Push day · 48 min · 12 sets · 1,500 kg · 🎵 1 song");
    expect(WorkoutPost_feedLine({ ...v1, keptSongs: undefined, volume: { value: 0, unit: "kg" } })).to.equal(
      "Push day · 48 min · 12 sets"
    );
  });
});
