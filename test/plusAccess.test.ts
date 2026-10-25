import "mocha";
import { expect } from "chai";
import {
  IPlusFeature,
  PlusAccess_accountRow,
  PlusAccess_afterLoad,
  PlusAccess_allows,
  PlusAccess_empty,
  PlusAccess_hasPlus,
  PlusAccess_list,
  PlusAccess_needsPlus,
  PlusAccess_parse,
  PlusAccess_screenFeature,
} from "../src/models/plusAccess";

const plusUser = { userId: "u1", plus: true };
const free: IPlusFeature[] = ["plates", "restTimer", "watch", "graphs", "measurements", "importExport"];
const gated: IPlusFeature[] = ["weekInsights", "muscles", "trendLines", "api"];

describe("PlusAccess", () => {
  it("keeps every logging feature free, even when signed out", () => {
    for (const feature of free) {
      expect(PlusAccess_needsPlus(feature), feature).to.equal(false);
      expect(PlusAccess_allows(feature, PlusAccess_empty(), undefined), feature).to.equal(true);
    }
  });

  it("gates insights, muscles, trend lines and the API behind beBEAR+", () => {
    for (const feature of gated) {
      expect(PlusAccess_needsPlus(feature), feature).to.equal(true);
      expect(PlusAccess_allows(feature, PlusAccess_empty(), "u1"), feature).to.equal(false);
      expect(PlusAccess_allows(feature, plusUser, "u1"), feature).to.equal(true);
    }
  });

  it("reads beBEAR+ only for the account that is signed in", () => {
    expect(PlusAccess_hasPlus(plusUser, "u1")).to.equal(true);
    expect(PlusAccess_hasPlus(plusUser, "u2")).to.equal(false);
    expect(PlusAccess_hasPlus(plusUser, undefined)).to.equal(false);
    expect(PlusAccess_hasPlus({ plus: true }, undefined)).to.equal(false);
  });

  it("parses only a saved plus row with a user id", () => {
    expect(PlusAccess_parse({ userId: "u1", plus: true })).to.deep.equal(plusUser);
    expect(PlusAccess_parse({ userId: "u1", plus: "yes" })).to.deep.equal(PlusAccess_empty());
    expect(PlusAccess_parse({ plus: true })).to.deep.equal(PlusAccess_empty());
    expect(PlusAccess_parse(undefined)).to.deep.equal(PlusAccess_empty());
  });

  it("keeps the saved plan when the read fails, but only for the same account", () => {
    expect(PlusAccess_afterLoad(plusUser, "u1", undefined)).to.deep.equal(plusUser);
    expect(PlusAccess_afterLoad(plusUser, "u2", undefined)).to.deep.equal(PlusAccess_empty());
    expect(PlusAccess_afterLoad(plusUser, undefined, undefined)).to.deep.equal(PlusAccess_empty());
    expect(PlusAccess_afterLoad(plusUser, "u1", false)).to.deep.equal(PlusAccess_empty());
    expect(PlusAccess_afterLoad(PlusAccess_empty(), "u2", true)).to.deep.equal({ userId: "u2", plus: true });
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

  it("offers beBEAR+ on the account row of a free account", () => {
    expect(PlusAccess_accountRow(false).actionLabel).to.equal("Get beBEAR+");
    expect(PlusAccess_accountRow(true).title).to.equal("beBEAR+ is on");
  });
});
