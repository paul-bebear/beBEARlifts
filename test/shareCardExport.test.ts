import "mocha";
import { expect } from "chai";
import {
  IShareExportEvent,
  IShareExportJob,
  ShareCardExport_buttonTitle,
  ShareCardExport_idle,
  ShareCardExport_needsSurface,
  ShareCardExport_next,
} from "../src/models/shareCardExport";

function run(
  events: IShareExportEvent<number>[],
  from: IShareExportJob<number> = ShareCardExport_idle<number>()
): { job: IShareExportJob<number>; effects: string[] } {
  let job = from;
  const effects: string[] = [];
  for (const event of events) {
    const step = ShareCardExport_next(job, event);
    job = step.job;
    effects.push(...step.effects.map((e) => ("page" in e ? `${e.kind}:${e.page}` : e.kind)));
  }
  return { job, effects };
}

describe("ShareCardExport", () => {
  it("waits for every layout and the photo, then captures in order and shares once", () => {
    const { job, effects } = run([
      { type: "start", pages: ["rank", "photo"], frozen: 1, photo: "p1", share: ["rank", "photo"] },
      { type: "layout", page: "rank" },
      { type: "layout", page: "photo" },
      { type: "photoLoaded", photo: "p1" },
      { type: "captured", jobId: 1, file: "a" },
      { type: "captured", jobId: 1, file: "b" },
    ]);
    expect(effects).to.deep.equal(["capture:rank", "capture:photo", "share"]);
    expect([job.phase, job.files]).to.deep.equal(["sharing", ["a", "b"]]);
  });

  it("ignores a load from an older photo", () => {
    const { job, effects } = run([
      { type: "start", pages: ["photo"], frozen: 1, photo: "new", share: ["photo"] },
      { type: "layout", page: "photo" },
      { type: "photoLoaded", photo: "old" },
    ]);
    expect([job.phase, effects]).to.deep.equal(["preparing", []]);
  });

  it("cleans up files after a failure halfway", () => {
    const { job, effects } = run([
      { type: "start", pages: ["rank", "count"], frozen: 1, share: ["rank", "count"] },
      { type: "layout", page: "rank" },
      { type: "layout", page: "count" },
      { type: "captured", jobId: 1, file: "a" },
      { type: "failed", jobId: 1, message: "no" },
    ]);
    expect(effects).to.deep.equal(["capture:rank", "capture:count", "alert", "cleanup"]);
    expect(job.phase).to.equal("idle");
  });

  it("keeps the images when the browser refuses, and shares them again on retry", () => {
    const { job, effects } = run([
      { type: "start", pages: ["rank"], frozen: 1, share: ["rank"] },
      { type: "layout", page: "rank" },
      { type: "captured", jobId: 1, file: "a" },
      { type: "refused", jobId: 1 },
      { type: "retry" },
      { type: "shared", jobId: 1 },
    ]);
    expect(effects).to.deep.equal(["capture:rank", "share", "share", "cleanup"]);
    expect(job.phase).to.equal("idle");
  });
});

describe("ShareCardExport prepared before the tap", () => {
  const prepare: IShareExportEvent<number>[] = [
    { type: "start", pages: ["rank", "receipt", "collage"], frozen: 1 },
    { type: "layout", page: "rank" },
    { type: "layout", page: "receipt" },
    { type: "layout", page: "collage" },
    { type: "captured", jobId: 1, file: "a" },
    { type: "captured", jobId: 1, file: "b" },
    { type: "captured", jobId: 1, file: "c" },
  ];

  it("captures every page, shares nothing, and keeps the files", () => {
    const { job, effects } = run(prepare);
    expect(effects).to.deep.equal(["capture:rank", "capture:receipt", "capture:collage"]);
    expect([job.phase, job.files, ShareCardExport_needsSurface(job)]).to.deep.equal([
      "prepared",
      ["a", "b", "c"],
      false,
    ]);
  });

  it("shares the files of the chosen pages in one step, so the tap can call share at once", () => {
    const prepared = run(prepare).job;
    const step = ShareCardExport_next(prepared, { type: "share", pages: ["collage", "rank"] });
    expect(step.job.phase).to.equal("sharing");
    expect(step.effects).to.deep.equal([{ kind: "share", files: ["c", "a"], jobId: 1 }]);
  });

  it("goes back to prepared after a share, so the same card can be shared again", () => {
    const { job, effects } = run(
      [
        { type: "share", pages: ["rank"] },
        { type: "shared", jobId: 1 },
        { type: "share", pages: ["receipt"] },
      ],
      run(prepare).job
    );
    expect(effects).to.deep.equal(["share", "share"]);
    expect([job.phase, job.selection]).to.deep.equal(["sharing", ["receipt"]]);
  });

  it("ignores a share tap before the images are ready", () => {
    const { job, effects } = run([
      { type: "start", pages: ["rank"], frozen: 1 },
      { type: "share", pages: ["rank"] },
    ]);
    expect([job.phase, effects]).to.deep.equal(["preparing", []]);
  });

  it("drops a render that finishes after the photo, seed or card changed", () => {
    const { job, effects } = run([
      { type: "start", pages: ["rank"], frozen: 1, photo: "old" },
      { type: "layout", page: "rank" },
      { type: "photoLoaded", photo: "old" },
      { type: "start", pages: ["rank"], frozen: 2, photo: "new" },
      { type: "captured", jobId: 1, file: "stale" },
      { type: "layout", page: "rank" },
      { type: "photoLoaded", photo: "new" },
      { type: "captured", jobId: 2, file: "fresh" },
    ]);
    expect(effects).to.deep.equal(["capture:rank", "cleanup", "capture:rank"]);
    expect([job.id, job.phase, job.files, job.frozen]).to.deep.equal([2, "prepared", ["fresh"], 2]);
  });

  it("cleans up the old files when new ones replace a prepared set", () => {
    const step = ShareCardExport_next(run(prepare).job, { type: "start", pages: ["rank"], frozen: 2 });
    expect(step.effects).to.deep.equal([{ kind: "cleanup", files: ["a", "b", "c"] }]);
    expect(step.job.phase).to.equal("preparing");
  });

  it("shows Retry image and an error line after a failed render, and renders again on retry", () => {
    const failed = run([
      { type: "start", pages: ["rank"], frozen: 1 },
      { type: "layout", page: "rank" },
      { type: "failed", jobId: 1, message: "boom" },
    ]);
    expect([failed.job.phase, failed.job.error, ShareCardExport_buttonTitle(failed.job, "Share")]).to.deep.equal([
      "failed",
      "Could not make the card image. Tap Retry image.",
      "Retry image",
    ]);
    const again = ShareCardExport_next(failed.job, { type: "retry" });
    expect([again.job.phase, again.job.error, again.job.id, again.job.frozen]).to.deep.equal([
      "preparing",
      undefined,
      2,
      1,
    ]);
  });

  it("alerts and stays prepared when the share itself throws", () => {
    const { job, effects } = run(
      [
        { type: "share", pages: ["rank"] },
        { type: "failed", jobId: 1, message: "no" },
      ],
      run(prepare).job
    );
    expect(effects).to.deep.equal(["share", "alert"]);
    expect([job.phase, job.files.length]).to.deep.equal(["prepared", 3]);
  });
});
