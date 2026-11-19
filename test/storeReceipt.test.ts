import "mocha";
import { expect } from "chai";
import { StoreReceipt_name } from "../src/utils/storeReceipt";

describe("StoreReceipt_name on the web", () => {
  it("has no store receipt name", () => {
    expect(StoreReceipt_name()).to.equal(undefined);
  });
});
