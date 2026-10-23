import "mocha";
import { expect } from "chai";
import { StoreBuild_showsProCodes } from "../src/models/storeBuild";

describe("StoreBuild_showsProCodes", () => {
  it("hides the code field in an App Store install", () => {
    expect(StoreBuild_showsProCodes("ios", "receipt", false)).to.equal(false);
  });

  it("shows it in TestFlight and dev installs", () => {
    expect(StoreBuild_showsProCodes("ios", "sandboxReceipt", false)).to.equal(true);
    expect(StoreBuild_showsProCodes("ios", "receipt", true)).to.equal(true);
  });

  it("hides it on iOS when the receipt name is unknown", () => {
    expect(StoreBuild_showsProCodes("ios", undefined, false)).to.equal(false);
    expect(StoreBuild_showsProCodes("ios", "", false)).to.equal(false);
  });

  it("shows it off iOS", () => {
    expect(StoreBuild_showsProCodes("web", undefined, false)).to.equal(true);
    expect(StoreBuild_showsProCodes("android", undefined, false)).to.equal(true);
  });
});
