import "mocha";
import { expect } from "chai";
import {
  DemoFileCache_initialUri,
  DemoFileCache_markMissing,
  DemoFileCache_store,
  DemoFileCache_touch,
} from "../src/utils/demoFileCache";

describe("DemoFileCache on the web", () => {
  it("shows the remote URL, because the service worker caches /images/", () => {
    expect(DemoFileCache_initialUri("squat.gif", "https://example.test/squat.gif")).to.equal(
      "https://example.test/squat.gif"
    );
  });
  it("does nothing on markMissing, touch and store", async () => {
    expect(DemoFileCache_markMissing("squat.gif")).to.equal(undefined);
    expect(await DemoFileCache_touch("squat.gif")).to.equal(undefined);
    expect(await DemoFileCache_store("squat.gif", "https://example.test/squat.gif")).to.equal(undefined);
  });
});
