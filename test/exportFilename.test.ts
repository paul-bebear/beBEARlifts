import "mocha";
import { expect } from "chai";
import { ExportFilename_dated } from "../src/models/exportFilename";

describe("ExportFilename_dated", () => {
  it("uses the local date, so an evening export is not named after tomorrow", () => {
    const lateEvening = new Date(2026, 9, 20, 23, 30).getTime();
    const afterMidnight = new Date(2026, 9, 21, 0, 30).getTime();
    expect(ExportFilename_dated("bebear_music_", lateEvening)).to.equal("bebear_music_2026-10-20.json");
    expect(ExportFilename_dated("bebear_foodlog_", afterMidnight)).to.equal("bebear_foodlog_2026-10-21.json");
  });
});
