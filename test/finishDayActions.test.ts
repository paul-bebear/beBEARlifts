import "mocha";
import { expect } from "chai";
import { FinishDayActions_list } from "../src/models/finishDayActions";

describe("FinishDayActions_list", () => {
  it("lists Add photo, Share, Music in that order", () => {
    expect(FinishDayActions_list({ musicEnabled: true, exportAvailable: true })).to.eql(["photo", "share", "music"]);
  });

  it("drops Music when the music feature is off", () => {
    expect(FinishDayActions_list({ musicEnabled: false, exportAvailable: true })).to.eql(["photo", "share"]);
  });

  it("drops Share when the export is not available", () => {
    expect(FinishDayActions_list({ musicEnabled: true, exportAvailable: false })).to.eql(["photo", "music"]);
  });

  it("keeps only Add photo when both are off", () => {
    expect(FinishDayActions_list({ musicEnabled: false, exportAvailable: false })).to.eql(["photo"]);
  });
});
