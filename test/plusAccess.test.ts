import "mocha";
import { expect } from "chai";
import { AccountPlan_empty, IAccountPlanState } from "../src/models/accountPlan";
import {
  IPlusFeature,
  IPlusStoreOffering,
  PlusAccess_allows,
  PlusAccess_hasPlus,
  PlusAccess_list,
  PlusAccess_needsPlus,
  PlusAccess_prices,
  PlusAccess_pricesFromOffering,
  PlusAccess_pricesInStore,
  PlusAccess_pricesLine,
  PlusAccess_screenFeature,
} from "../src/models/plusAccess";

function storePackage(priceString: string): { product: { priceString: string } } {
  return { product: { priceString } };
}

const euroOffering: IPlusStoreOffering = {
  monthly: storePackage("6,99 €"),
  annual: storePackage("39,99 €"),
  lifetime: storePackage("79,99 €"),
};

const plusUser: IAccountPlanState = { status: "known", userId: "u1", plan: "plus", grant: "code", canManage: false };
const freeUser: IAccountPlanState = { status: "known", userId: "u1", plan: "free" };
const free: IPlusFeature[] = ["plates", "restTimer", "watch", "graphs", "measurements", "importExport"];
const gated: IPlusFeature[] = ["weekInsights", "muscles", "trendLines", "api"];

describe("PlusAccess", () => {
  it("keeps every logging feature free, even when signed out", () => {
    for (const feature of free) {
      expect(PlusAccess_needsPlus(feature), feature).to.equal(false);
      expect(PlusAccess_allows(feature, AccountPlan_empty(), undefined), feature).to.equal(true);
    }
  });

  it("gates insights, muscles, trend lines and the API behind beBEAR+", () => {
    for (const feature of gated) {
      expect(PlusAccess_needsPlus(feature), feature).to.equal(true);
      expect(PlusAccess_allows(feature, AccountPlan_empty(), "u1"), feature).to.equal(false);
      expect(PlusAccess_allows(feature, freeUser, "u1"), feature).to.equal(false);
      expect(PlusAccess_allows(feature, plusUser, "u1"), feature).to.equal(true);
    }
  });

  it("reads beBEAR+ only for the account that is signed in", () => {
    expect(PlusAccess_hasPlus(plusUser, "u1")).to.equal(true);
    expect(PlusAccess_hasPlus(plusUser, "u2")).to.equal(false);
    expect(PlusAccess_hasPlus(plusUser, undefined)).to.equal(false);
    expect(PlusAccess_hasPlus({ status: "activating", userId: "u1" }, "u1")).to.equal(false);
  });

  it("sends the muscle screens to beBEAR+ and keeps the graphs list free", () => {
    expect(PlusAccess_screenFeature("musclesProgram")).to.equal("muscles");
    expect(PlusAccess_screenFeature("musclesDay")).to.equal("muscles");
    expect(PlusAccess_needsPlus(PlusAccess_screenFeature("graphsList")!)).to.equal(false);
    expect(PlusAccess_screenFeature("settings")).to.equal(undefined);
  });

  it("lists the same split the landing pages sell", () => {
    expect(PlusAccess_list("plus").map((f) => f.key)).to.deep.equal(["ai", ...gated]);
    expect(PlusAccess_list("free").map((f) => f.key)).to.deep.equal(free);
  });

  it("shows the prices the store sends, in the store's currency", () => {
    const prices = PlusAccess_pricesFromOffering(euroOffering);
    expect(prices).to.deep.equal({ monthly: "6,99 €", annual: "39,99 €", lifetime: "79,99 €" });
    expect(PlusAccess_pricesLine(prices, false)).to.equal("6,99 € a month, 39,99 € a year, or 79,99 € once for life.");
  });

  it("lists only the plans the store offers", () => {
    const prices = PlusAccess_pricesFromOffering({ ...euroOffering, lifetime: null });
    expect(prices).to.deep.equal({ monthly: "6,99 €", annual: "39,99 €" });
    expect(PlusAccess_pricesLine(prices, false)).to.equal("6,99 € a month or 39,99 € a year.");
    expect(PlusAccess_pricesLine({ annual: "39,99 €" }, false)).to.equal("39,99 € a year.");
  });

  it("never quotes a dollar price on iPhone when the store sends none", () => {
    expect(PlusAccess_pricesFromOffering(null)).to.deep.equal({});
    expect(PlusAccess_pricesLine(undefined, false)).to.equal(PlusAccess_pricesInStore);
    expect(PlusAccess_pricesLine({}, false)).to.equal(PlusAccess_pricesInStore);
    expect(PlusAccess_pricesLine(undefined, true)).to.equal(PlusAccess_prices);
  });
});
