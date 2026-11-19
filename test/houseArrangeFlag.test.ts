import "mocha";
import { expect } from "chai";
import { HouseArrangeFlag_isOn } from "../src/utils/houseArrangeFlag";

type IGlobalWindow = { window?: { location: { search: string } } };

describe("HouseArrangeFlag_isOn", () => {
  const holder = globalThis as unknown as IGlobalWindow;
  afterEach(() => {
    delete holder.window;
  });
  it("is off when there is no window", () => {
    expect(HouseArrangeFlag_isOn()).to.equal(false);
  });
  it("reads the arrange flag from the page query string", () => {
    holder.window = { location: { search: "?tab=bear&arrange=1" } };
    expect(HouseArrangeFlag_isOn()).to.equal(true);
    holder.window = { location: { search: "?arrange=10" } };
    expect(HouseArrangeFlag_isOn()).to.equal(false);
    holder.window = { location: { search: "" } };
    expect(HouseArrangeFlag_isOn()).to.equal(false);
  });
});
