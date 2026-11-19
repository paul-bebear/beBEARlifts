import "mocha";
import { expect } from "chai";
import { BearImage_uri } from "../src/utils/bearImage";

describe("BearImage_uri on the web", () => {
  it("returns the asset path unchanged", () => {
    expect(BearImage_uri("/images/bear/level-3.png")).to.equal("/images/bear/level-3.png");
    expect(BearImage_uri("")).to.equal("");
  });
});
