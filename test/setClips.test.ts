import "mocha";
import { expect } from "chai";
import {
  ISetClip,
  SetClips_empty,
  SetClips_find,
  SetClips_filmedSets,
  SetClips_groups,
  SetClips_historyGroups,
  SetClips_parse,
  SetClips_put,
  SetClips_savedLabel,
  SetClips_thumbnail,
  SetClips_thumbnailMaxBytes,
  SetClips_workoutId,
} from "../src/models/setClips";
import { ISet } from "../src/types";

const clip: ISetClip = {
  workoutId: 1234,
  setId: "set-1",
  exerciseId: "squat",
  timestamp: 2000,
  size: 20000000,
  duration: 5,
  thumbnail: "data:image/jpeg;base64,YWJj",
  savedVia: "share",
};

describe("SetClips", () => {
  it("uses startTime until a workout receives its history id", () => {
    expect(SetClips_workoutId({ id: 0, startTime: 1234 })).to.equal(1234);
    expect(SetClips_workoutId({ id: 1234, startTime: 1234 })).to.equal(1234);
    expect(SetClips_workoutId({ id: 5678, startTime: 1234 })).to.equal(5678);
  });

  it("parses only small metadata records and drops unknown fields", () => {
    const raw = { version: 1, clips: [{ ...clip, video: "large video", file: { size: clip.size } }] };
    expect(SetClips_parse(raw)).to.deep.equal({ version: 1, clips: [clip] });
    for (const invalid of [null, 1, "x", [], {}, { clips: [null, 1, {}, { ...clip, workoutId: NaN }] }]) {
      expect(SetClips_parse(invalid)).to.deep.equal(SetClips_empty());
    }
    for (const field of ["workoutId", "timestamp", "size"]) {
      for (const value of [-1, Infinity, NaN, "123"]) {
        expect(SetClips_parse({ clips: [{ ...clip, [field]: value }] }).clips).to.deep.equal([]);
      }
    }
  });

  it("retains valid metadata when duration or thumbnail cannot be read", () => {
    const parsed = SetClips_parse({ clips: [{ ...clip, duration: Infinity, thumbnail: "blob:video" }] });
    expect(parsed.clips[0]).to.deep.equal({ ...clip, duration: undefined, thumbnail: undefined });
    expect(SetClips_parse({ clips: [{ ...clip, duration: 0 }] }).clips[0].duration).to.equal(0);
  });

  it("matches workout, stable set id and exercise id", () => {
    const log = SetClips_put(SetClips_empty(), clip);
    expect(SetClips_find(log, clip)).to.deep.equal(clip);
    expect(SetClips_find(log, { ...clip, workoutId: 999 })).to.equal(undefined);
    expect(SetClips_find(log, { ...clip, setId: "set-2" })).to.equal(undefined);
    expect(SetClips_find(log, { ...clip, exerciseId: "bench" })).to.equal(undefined);
  });

  it("replaces the same set and keeps distinct workouts and exercises", () => {
    const log = SetClips_parse({
      clips: [clip, { ...clip, timestamp: 3000 }, { ...clip, workoutId: 5678 }, { ...clip, exerciseId: "bench" }],
    });
    expect(log.clips).to.have.length(3);
    expect(log.clips[0].timestamp).to.equal(3000);
    expect(SetClips_put(log, { ...clip, timestamp: NaN })).to.equal(log);
  });

  it("caps both writes and imported data at the newest 300 records", () => {
    const records = Array.from({ length: 310 }, (_, i) => ({ ...clip, setId: `set-${i}`, timestamp: i }));
    const log = records.reduce(SetClips_put, SetClips_empty());
    expect(log.clips).to.have.length(300);
    expect(log.clips[0].timestamp).to.equal(309);
    expect(log.clips[299].timestamp).to.equal(10);
    expect(SetClips_parse({ clips: records.reverse() })).to.deep.equal(log);
  });

  it("ignores a late thumbnail from an older recording of the same set", () => {
    const log = SetClips_put(SetClips_empty(), { ...clip, timestamp: 3000 });
    expect(SetClips_put(log, clip)).to.equal(log);
  });

  it("accepts only JPEG data URLs under the 30 KB serialized limit", () => {
    expect(SetClips_thumbnail(clip.thumbnail)).to.equal(clip.thumbnail);
    const prefix = "data:image/jpeg;base64,";
    const limit = prefix + "A".repeat(SetClips_thumbnailMaxBytes - prefix.length);
    expect(SetClips_thumbnail(limit)).to.equal(limit);
    expect(SetClips_thumbnail(limit + "A")).to.equal(undefined);
    for (const invalid of [
      undefined,
      "data:image/png;base64,YWJj",
      "https://example.com/a.jpg",
      "data:image/jpeg;base64,<x>",
    ]) {
      expect(SetClips_thumbnail(invalid)).to.equal(undefined);
    }
  });

  it("separates identical sets so a camera mark identifies the filmed set", () => {
    const sets: ISet[] = ["set-0", "set-1", "set-2"].map((id, index) => ({ vtype: "set", id, index, reps: 5 }));
    const log = SetClips_put(SetClips_empty(), clip);
    expect(SetClips_groups(sets, false, log, 1234, "squat")).to.deep.equal(sets.map((set) => [set]));
    expect(SetClips_groups(sets, true, log, 1234, "squat")).to.deep.equal([sets]);
    expect(SetClips_groups(sets, false, log, 5678, "squat")).to.deep.equal([sets]);
    expect(SetClips_groups(sets, false, undefined, undefined, undefined)).to.deep.equal([sets]);
  });

  it("labels downloads separately from Photos", () => {
    expect(SetClips_savedLabel(clip)).to.match(/^Saved to Photos at /);
    expect(SetClips_savedLabel({ ...clip, savedVia: "download" })).to.match(/^Downloaded at /);
  });

  it("attaches the thumbnail to the filmed row and selects filmed warmups", () => {
    const sets: ISet[] = ["set-0", "set-1", "set-2"].map((id, index) => ({ vtype: "set", id, index, reps: 5 }));
    const log = SetClips_put(SetClips_empty(), clip);
    const groups = SetClips_historyGroups(sets, false, "kg", log, 1234, "squat");
    expect(groups.map((group) => group.clip?.setId)).to.deep.equal([undefined, "set-1", undefined]);
    expect(SetClips_historyGroups(sets, true, "kg", log, 1234, "squat")[0].clip).to.equal(undefined);
    expect(SetClips_filmedSets(sets, log, 1234, "squat")).to.deep.equal([sets[1]]);
    expect(SetClips_filmedSets(sets, log, 5678, "squat")).to.deep.equal([]);
    expect(SetClips_filmedSets(sets)).to.deep.equal([]);
    expect(SetClips_historyGroups([], false, "kg", log, 1234, "squat")[0].clip).to.equal(undefined);
  });
});
