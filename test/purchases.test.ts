import "mocha";
import { expect } from "chai";
import {
  Purchases_configure,
  Purchases_identify,
  Purchases_isAvailable,
  Purchases_manage,
  Purchases_presentPaywall,
  Purchases_prices,
  Purchases_restore,
  Purchases_whenReadyFor,
} from "../src/utils/purchases";

describe("Purchases on the web", () => {
  it("is not available and never configures a store", () => {
    expect(Purchases_isAvailable()).to.equal(false);
    expect(Purchases_configure("user-1")).to.equal(undefined);
    expect(Purchases_identify(undefined)).to.equal(undefined);
  });
  it("is never ready for a user", async () => {
    expect(await Purchases_whenReadyFor("user-1")).to.equal(false);
  });
  it("reports the paywall as unavailable and a restore as an error", async () => {
    expect(await Purchases_presentPaywall()).to.equal("unavailable");
    expect(await Purchases_restore()).to.equal("error");
  });
  it("has no prices and nothing to manage", async () => {
    expect(await Purchases_prices()).to.equal(undefined);
    expect(await Purchases_manage()).to.equal(undefined);
  });
});
