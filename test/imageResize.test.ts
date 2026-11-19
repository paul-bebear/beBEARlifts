import "mocha";
import { expect } from "chai";
import { ImageResize_scaledSize } from "../src/utils/imageResize";

describe("ImageResize", () => {
  it("keeps an image that fits", () => {
    expect(ImageResize_scaledSize(800, 600, 1024)).to.deep.equal({ width: 800, height: 600 });
  });

  it("scales the long side down to the maximum", () => {
    expect(ImageResize_scaledSize(4000, 3000, 1000)).to.deep.equal({ width: 1000, height: 750 });
    expect(ImageResize_scaledSize(3000, 4000, 1000)).to.deep.equal({ width: 750, height: 1000 });
  });

  it("rounds each side", () => {
    expect(ImageResize_scaledSize(3000, 1001, 1000)).to.deep.equal({ width: 1000, height: 334 });
  });

  it("throws on a zero side", () => {
    expect(() => ImageResize_scaledSize(0, 100, 1024)).to.throw("The photo could not be read");
    expect(() => ImageResize_scaledSize(100, 0, 1024)).to.throw("The photo could not be read");
  });
});
