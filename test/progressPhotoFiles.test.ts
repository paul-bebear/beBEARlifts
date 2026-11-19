import "mocha";
import { expect } from "chai";
import {
  ProgressPhotos_dataUrl,
  ProgressPhotos_fileName,
  ProgressPhotos_isFileBase64,
  ProgressPhotos_putPlan,
  ProgressPhotos_tempFileName,
} from "../src/models/progressPhotos";

describe("ProgressPhotoFiles put rule", () => {
  it("never lists the final photo file for deletion, whatever the outcome", () => {
    for (const outcome of ["added", "refused", "failed"] as const) {
      expect(ProgressPhotos_putPlan(7, outcome).unlink).to.not.include(ProgressPhotos_fileName(7));
    }
  });

  it("deletes only the temp file when the insert is refused or fails", () => {
    expect(ProgressPhotos_putPlan(7, "refused")).to.deep.equal({
      promote: false,
      unlink: [ProgressPhotos_tempFileName(7)],
    });
    expect(ProgressPhotos_putPlan(7, "failed")).to.deep.equal({
      promote: false,
      unlink: [ProgressPhotos_tempFileName(7)],
    });
  });

  it("moves the temp file into place and deletes nothing when the photo is added", () => {
    expect(ProgressPhotos_putPlan(7, "added")).to.deep.equal({ promote: true, unlink: [] });
  });

  it("uses a temp name that differs from the final name", () => {
    expect(ProgressPhotos_tempFileName(7)).to.not.equal(ProgressPhotos_fileName(7));
  });
});

describe("ProgressPhotos_isFileBase64", () => {
  it("accepts a base64 string over the 1 MB web cap", () => {
    const big = "A".repeat(2 * 1024 * 1024);
    expect(ProgressPhotos_isFileBase64(big)).to.equal(true);
    expect(ProgressPhotos_dataUrl(big)).to.equal(undefined);
  });

  it("refuses an empty string and characters outside base64", () => {
    expect(ProgressPhotos_isFileBase64("")).to.equal(false);
    expect(ProgressPhotos_isFileBase64("AA AA")).to.equal(false);
    expect(ProgressPhotos_isFileBase64("data:image/jpeg;base64,AAAA")).to.equal(false);
  });
});
