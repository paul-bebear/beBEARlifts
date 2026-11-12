import "mocha";
import { expect } from "chai";
import {
  FoodSummaryPages_indexAt,
  FoodSummaryPages_labels,
  FoodSummaryPages_offsetOf,
} from "../src/models/foodSummaryPages";

describe("FoodSummaryPages", () => {
  it("has two pages, macros then micros", () => {
    expect(FoodSummaryPages_labels).to.deep.equal(["Macros", "Micros"]);
  });

  it("reads the page from the scroll offset, rounding to the nearest page", () => {
    expect(FoodSummaryPages_indexAt(0, 390)).to.equal(0);
    expect(FoodSummaryPages_indexAt(194, 390)).to.equal(0);
    expect(FoodSummaryPages_indexAt(196, 390)).to.equal(1);
    expect(FoodSummaryPages_indexAt(390, 390)).to.equal(1);
  });

  it("stays inside the pages for an overscroll, a width not measured yet and a broken offset", () => {
    expect(FoodSummaryPages_indexAt(-40, 390)).to.equal(0);
    expect(FoodSummaryPages_indexAt(900, 390)).to.equal(1);
    expect(FoodSummaryPages_indexAt(300, 0)).to.equal(0);
    expect(FoodSummaryPages_indexAt(NaN, 390)).to.equal(0);
  });

  it("gives the offset a dot press scrolls to", () => {
    expect(FoodSummaryPages_offsetOf(1, 390)).to.equal(390);
    expect(FoodSummaryPages_offsetOf(0, 390)).to.equal(0);
    expect(FoodSummaryPages_offsetOf(-1, 390)).to.equal(0);
  });
});
