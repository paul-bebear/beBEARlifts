import "mocha";
import { expect } from "chai";
import { BundleNames_assetsInPage, BundleNames_hashedAsset } from "../src/utils/bundleNames";

describe("BundleNames", () => {
  it("lists the scripts and stylesheets the page loads", () => {
    const html = `
      <link rel="stylesheet" type="text/css" href="/app.0f3a9c21b4d5e6f7.css" />
      <link rel="preload" href="/images/front-muscles.svg" as="image" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <script>window.Rollbar = {};</script>
      <script src="/vendors.1a2b3c4d5e6f7a8b.js"></script>
      <script src="/app.9e8d7c6b5a4f3e2d.js"></script>
      <script src="/app.9e8d7c6b5a4f3e2d.js"></script>`;
    expect(BundleNames_assetsInPage(html)).to.deep.equal([
      "/app.0f3a9c21b4d5e6f7.css",
      "/vendors.1a2b3c4d5e6f7a8b.js",
      "/app.9e8d7c6b5a4f3e2d.js",
    ]);
  });

  it("returns nothing for a page without bundles", () => {
    expect(BundleNames_assetsInPage("<html><body>offline</body></html>")).to.deep.equal([]);
  });

  it("matches only content-hashed bundle names", () => {
    expect(BundleNames_hashedAsset.test("/app.9e8d7c6b5a4f3e2d.js")).to.equal(true);
    expect(BundleNames_hashedAsset.test("/vendors.1a2b3c4d5e6f7a8b.js")).to.equal(true);
    expect(BundleNames_hashedAsset.test("/app.0f3a9c21b4d5e6f7.css")).to.equal(true);
    expect(BundleNames_hashedAsset.test("/app.js")).to.equal(false);
    expect(BundleNames_hashedAsset.test("/app.js.map")).to.equal(false);
    expect(BundleNames_hashedAsset.test("/main.9e8d7c6b5a4f3e2d.js")).to.equal(false);
  });
});
