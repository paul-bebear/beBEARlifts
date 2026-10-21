import "mocha";
import { expect } from "chai";
import {
  ProgressPhotos_add,
  ProgressPhotos_empty,
  ProgressPhotos_fitSize,
  ProgressPhotos_isFull,
  ProgressPhotos_maxPhotos,
  ProgressPhotos_parse,
  ProgressPhotos_remove,
  ProgressPhotos_removeTakenAt,
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

  it("fits the long side to 1080 px and never enlarges", () => {
    expect(ProgressPhotos_fitSize(4032, 3024)).to.deep.equal({ width: 1080, height: 810 });
    expect(ProgressPhotos_fitSize(600, 800)).to.deep.equal({ width: 600, height: 800 });
  });
});
