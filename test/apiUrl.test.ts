import "mocha";
import { expect } from "chai";
import { ApiUrl_for as webApiUrl } from "../src/utils/apiUrl";
import { ApiUrl_for as nativeApiUrl } from "../src/utils/apiUrl.native";

describe("ApiUrl_for", () => {
  it("keeps the path relative on the web, so the page's own origin serves it", () => {
    expect(webApiUrl("/api/food/search?q=oats")).to.equal("/api/food/search?q=oats");
  });

  it("points native at the deployed site, because the app has no origin", () => {
    expect(nativeApiUrl("/api/ai/warmup")).to.equal("https://lifts.paulbebear.com/api/ai/warmup");
  });
});
