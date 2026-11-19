import "mocha";
import { expect } from "chai";
import { RevenueCat_iosApiKey } from "../src/utils/revenueCatKey";

describe("RevenueCat_iosApiKey", () => {
  it("is the public iOS key, never a secret key", () => {
    expect(RevenueCat_iosApiKey).to.match(/^appl_[A-Za-z0-9]+$/);
    expect(RevenueCat_iosApiKey.startsWith("sk_")).to.equal(false);
  });
});
