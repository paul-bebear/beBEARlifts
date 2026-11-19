import "mocha";
import { expect } from "chai";
import { ImageCache_download, ImageCache_initialUri, ImageCache_markMissing } from "../src/utils/imageCache";

describe("ImageCache (web)", () => {
  const url = "https://x.test/a.jpg";

  it("serves the remote url as the first source", () => {
    expect(ImageCache_initialUri(url)).to.equal(url);
  });

  it("keeps serving the remote url after a miss", () => {
    ImageCache_markMissing(url);
    expect(ImageCache_initialUri(url)).to.equal(url);
  });

  it("resolves a download with nothing to do", async () => {
    expect(await ImageCache_download(url)).to.equal(undefined);
  });
});
