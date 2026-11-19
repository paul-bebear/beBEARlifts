import "mocha";
import { expect } from "chai";
import {
  ProgressPhotos_dataUrl,
  ProgressPhotos_fileName,
  ProgressPhotos_isFileBase64,
  ProgressPhotos_isTempFileName,
  ProgressPhotos_putUnlink,
  ProgressPhotos_tempFileName,
} from "../src/models/progressPhotos";

const withRecord = { version: 1 as const, photos: [{ id: 7, timestamp: 1, file: true as const }] };
const noRecord = { version: 1 as const, photos: [] };

describe("ProgressPhotos_putUnlink", () => {
  it("deletes only the temp file when the check before the move refuses", () => {
    expect(ProgressPhotos_putUnlink(7, "precheck-refused", withRecord)).to.deep.equal([ProgressPhotos_tempFileName(7)]);
  });

  it("deletes only the temp file when the move fails", () => {
    expect(ProgressPhotos_putUnlink(7, "move-failed", noRecord)).to.deep.equal([ProgressPhotos_tempFileName(7)]);
  });

  it("deletes nothing when the photo is added", () => {
    expect(ProgressPhotos_putUnlink(7, "added", withRecord)).to.deep.equal([]);
  });

  it("keeps the final file when a race made the insert refuse and a record points at it", () => {
    expect(ProgressPhotos_putUnlink(7, "refused", withRecord)).to.deep.equal([]);
  });

  it("keeps the final file when another failure left a record for the id", () => {
    expect(ProgressPhotos_putUnlink(7, "failed", withRecord)).to.deep.equal([]);
  });

  it("deletes the final file when the insert is refused or fails and no record has the id", () => {
    expect(ProgressPhotos_putUnlink(7, "refused", noRecord)).to.deep.equal([ProgressPhotos_fileName(7)]);
    expect(ProgressPhotos_putUnlink(7, "failed", noRecord)).to.deep.equal([ProgressPhotos_fileName(7)]);
  });

  it("uses a temp name that differs from the final name and matches the stale-file check", () => {
    expect(ProgressPhotos_tempFileName(7)).to.not.equal(ProgressPhotos_fileName(7));
    expect(ProgressPhotos_isTempFileName(ProgressPhotos_tempFileName(7))).to.equal(true);
    expect(ProgressPhotos_isTempFileName(ProgressPhotos_fileName(7))).to.equal(false);
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
