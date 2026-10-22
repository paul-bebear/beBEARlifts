import "mocha";
import { expect } from "chai";
import { ShareCardBear_frame } from "../src/models/shareCardBear";

describe("ShareCardBear", () => {
  it("cuts the empty canvas above a small bear, so the cub fills the frame", () => {
    expect(ShareCardBear_frame("small", 280)).to.deep.equal({
      width: 267,
      height: 280,
      imageWidth: 267,
      imageHeight: 400,
      imageCrop: 120,
    });
  });

  it("shows the whole canvas for a space bear", () => {
    expect(ShareCardBear_frame("space", 300)).to.deep.equal({
      width: 200,
      height: 300,
      imageWidth: 200,
      imageHeight: 300,
      imageCrop: 0,
    });
  });

  it("keeps the feet on the frame's bottom edge for every size", () => {
    for (const size of ["small", "medium", "big", "space"] as const) {
      const frame = ShareCardBear_frame(size, 240);
      expect(Math.abs(frame.imageHeight - frame.imageCrop - frame.height), size).to.be.at.most(1);
      expect(frame.width, size).to.be.at.most(360);
    }
  });
});
