import "mocha";
import { expect } from "chai";
import {
  ProgressPhotos_add,
  ProgressPhotos_base64,
  ProgressPhotos_cloudPath,
  ProgressPhotos_dataUrl,
  ProgressPhotos_empty,
  ProgressPhotos_fitSize,
  ProgressPhotos_index,
  ProgressPhotos_insert,
  ProgressPhotos_isFull,
  ProgressPhotos_markFiles,
  ProgressPhotos_maxPhotos,
  ProgressPhotos_migration,
  ProgressPhotos_missing,
  ProgressPhotos_nextId,
  ProgressPhotos_parse,
  ProgressPhotos_parseIndex,
  ProgressPhotos_remove,
  ProgressPhotos_removeTakenAt,
  ProgressPhotos_syncPlan,
  ProgressPhotos_uri,
} from "../src/models/progressPhotos";

const jpeg = "data:image/jpeg;base64,AAAA";

describe("ProgressPhotos", () => {
  it("keeps only JPEG data URLs, newest first", () => {
    const log = ProgressPhotos_parse({
      photos: [
        { id: 1, timestamp: 1, dataUrl: jpeg },
        { id: 2, timestamp: 2, dataUrl: "data:image/png;base64,AAAA" },
        { id: 3, timestamp: 3, dataUrl: jpeg },
      ],
    });
    expect(log.photos.map((p) => p.id)).to.deep.equal([3, 1]);
  });

  it("adds with a unique id and removes by id", () => {
    let log = ProgressPhotos_add(ProgressPhotos_empty(), jpeg, 10);
    log = ProgressPhotos_add(log, jpeg, 10);
    expect(log.photos.map((p) => p.id).sort()).to.deep.equal([10, 11]);
    expect(ProgressPhotos_add(log, "not a photo", 20)).to.equal(log);
    expect(ProgressPhotos_remove(log, 10).photos.map((p) => p.id)).to.deep.equal([11]);
  });

  it("refuses photo 201 and keeps the oldest", () => {
    let log = ProgressPhotos_empty();
    for (let i = 1; i <= ProgressPhotos_maxPhotos; i += 1) {
      log = ProgressPhotos_add(log, jpeg, i);
    }
    expect(ProgressPhotos_isFull(log)).to.equal(true);
    const after = ProgressPhotos_add(log, jpeg, 1000);
    expect(after).to.equal(log);
    expect(after.photos.some((p) => p.timestamp === 1)).to.equal(true);
  });

  it("rolls back the photo added at a given time", () => {
    const log = ProgressPhotos_add(ProgressPhotos_add(ProgressPhotos_empty(), jpeg, 5), jpeg, 9);
    expect(ProgressPhotos_removeTakenAt(log, 9).photos.map((p) => p.timestamp)).to.deep.equal([5]);
  });

  it("keeps file entries on the iPhone and points them at the documents folder", () => {
    const log = ProgressPhotos_parse({
      photos: [
        { id: 7, timestamp: 7, file: true },
        { id: 8, timestamp: 8 },
      ],
    });
    expect(log.photos).to.deep.equal([{ id: 7, timestamp: 7, file: true }]);
    expect(ProgressPhotos_uri(log.photos[0], "/docs/progress-photos")).to.equal("file:///docs/progress-photos/7.jpg");
    expect(ProgressPhotos_uri(log.photos[0], undefined)).to.equal(undefined);
    expect(ProgressPhotos_uri({ id: 1, timestamp: 1, dataUrl: jpeg }, "/docs")).to.equal(jpeg);
  });

  it("migrates build 124's data URLs to files, and keeps a photo whose file was not written", () => {
    const log = ProgressPhotos_parse({
      photos: [
        { id: 1, timestamp: 1, dataUrl: jpeg },
        { id: 2, timestamp: 2, dataUrl: "data:image/jpeg;base64,BBBB" },
        { id: 3, timestamp: 3, file: true },
      ],
    });
    expect(ProgressPhotos_migration(log).files).to.deep.equal([
      { id: 2, base64: "BBBB" },
      { id: 1, base64: "AAAA" },
    ]);
    const half = ProgressPhotos_markFiles(log, [2]);
    expect(half.photos).to.deep.equal([
      { id: 3, timestamp: 3, file: true },
      { id: 2, timestamp: 2, file: true },
      { id: 1, timestamp: 1, dataUrl: jpeg },
    ]);
    expect(ProgressPhotos_migration(half).files).to.deep.equal([{ id: 1, base64: "AAAA" }]);
    expect(ProgressPhotos_markFiles(log, [])).to.equal(log);
    expect(ProgressPhotos_migration(ProgressPhotos_markFiles(half, [1])).files).to.deep.equal([]);
  });

  it("inserts a file entry once and refuses a duplicate id", () => {
    const log = ProgressPhotos_insert(ProgressPhotos_empty(), { id: 5, timestamp: 5, file: true });
    expect(ProgressPhotos_insert(log, { id: 5, timestamp: 6, file: true })).to.equal(log);
    expect(ProgressPhotos_insert(log, { id: 6, timestamp: 6, dataUrl: "bad" })).to.equal(log);
    expect(ProgressPhotos_nextId(log, 5)).to.equal(6);
    expect(ProgressPhotos_nextId(log, 9)).to.equal(9);
  });

  it("converts between base64 and data URLs", () => {
    expect(ProgressPhotos_base64(jpeg)).to.equal("AAAA");
    expect(ProgressPhotos_dataUrl("AAAA")).to.equal(jpeg);
    expect(ProgressPhotos_dataUrl("not base64!")).to.equal(undefined);
  });

  it("plans uploads and cloud deletes, and restores only missing photos while there is room", () => {
    const log = ProgressPhotos_parse({
      photos: [
        { id: 1, timestamp: 1, file: true },
        { id: 2, timestamp: 2, file: true },
      ],
    });
    expect(ProgressPhotos_syncPlan(log, [2, 9])).to.deep.equal({ upload: [1], remove: [9] });
    expect(ProgressPhotos_cloudPath("u1", 2)).to.equal("u1/photos/2.jpg");
    const index = ProgressPhotos_parseIndex([
      { id: 3, timestamp: 3 },
      { id: 2, timestamp: 2 },
      { id: -1, timestamp: 0 },
    ]);
    expect(index).to.deep.equal([
      { id: 3, timestamp: 3 },
      { id: 2, timestamp: 2 },
    ]);
    expect(ProgressPhotos_missing(log, index)).to.deep.equal([{ id: 3, timestamp: 3 }]);
    expect(ProgressPhotos_index(log)).to.deep.equal([
      { id: 2, timestamp: 2 },
      { id: 1, timestamp: 1 },
    ]);
    let full = ProgressPhotos_empty();
    for (let i = 1; i <= ProgressPhotos_maxPhotos; i += 1) {
      full = ProgressPhotos_insert(full, { id: i, timestamp: i, file: true });
    }
    expect(ProgressPhotos_missing(full, [{ id: 999, timestamp: 999 }])).to.deep.equal([]);
  });

  it("fits the long side to 1080 px and never enlarges", () => {
    expect(ProgressPhotos_fitSize(4032, 3024)).to.deep.equal({ width: 1080, height: 810 });
    expect(ProgressPhotos_fitSize(600, 800)).to.deep.equal({ width: 600, height: 800 });
  });
});
