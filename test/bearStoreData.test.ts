import "mocha";
import { expect } from "chai";
import { BearStoreData_empty, BearStoreData_parse } from "../src/models/bearStoreData";
import { BearLook_setFur, BearLook_summary } from "../src/models/bearLook";

const base = { celebratedLevel: 3, seenBadges: ["a"] };

describe("BearStoreData fur", () => {
  it("leaves the fur unset on an empty store", () => {
    expect(BearStoreData_empty().fur).to.equal(undefined);
  });

  it("keeps a valid fur next to the line", () => {
    for (const fur of ["brown", "black", "polar"] as const) {
      expect(BearStoreData_parse({ ...base, line: "female", fur })).to.include({ line: "female", fur });
    }
  });

  it("reads a store saved before fur existed as unset", () => {
    const parsed = BearStoreData_parse({ ...base, line: "male" });
    expect(parsed.line).to.equal("male");
    expect(parsed).to.not.have.property("fur");
  });

  it("falls back to an empty store for a fur it does not know, the same as for a bad line", () => {
    expect(BearStoreData_parse({ ...base, fur: "green" })).to.deep.equal(BearStoreData_empty());
    expect(BearStoreData_parse({ ...base, fur: 3 })).to.deep.equal(BearStoreData_empty());
    expect(BearStoreData_parse({ ...base, line: "other" })).to.deep.equal(BearStoreData_empty());
  });

  it("survives a JSON round trip", () => {
    const store = { ...BearStoreData_empty(), line: "female" as const, fur: "polar" as const };
    expect(BearStoreData_parse(JSON.parse(JSON.stringify(store)))).to.deep.equal(store);
  });
});

describe("BearLook", () => {
  it("sets the fur without touching the rest of the store", () => {
    const store = { ...BearStoreData_empty(), line: "male" as const, spent: 40 };
    expect(BearLook_setFur(store, "black")).to.deep.equal({ ...store, fur: "black" });
  });

  it("returns the same store when the fur does not change", () => {
    const store = { ...BearStoreData_empty(), fur: "polar" as const };
    expect(BearLook_setFur(store, "polar")).to.equal(store);
  });

  it("names the line and the fur in one line", () => {
    expect(BearLook_summary("female", "polar")).to.equal("Female · Polar");
    expect(BearLook_summary("male", "brown")).to.equal("Male · Brown");
  });
});
