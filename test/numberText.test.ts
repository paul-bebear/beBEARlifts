import "mocha";
import { expect } from "chai";
import {
  NumberText_parse,
  NumberText_parseNonNegative,
  NumberText_parsePositive,
  NumberText_round1,
  NumberText_round3,
} from "../src/models/numberText";

describe("NumberText", () => {
  describe("parse", () => {
    it("reads plain and padded numbers", () => {
      expect(NumberText_parse("12")).to.equal(12);
      expect(NumberText_parse(" 12.5 ")).to.equal(12.5);
      expect(NumberText_parse(".5")).to.equal(0.5);
    });

    it("reads a comma as the decimal point", () => {
      expect(NumberText_parse("1,5")).to.equal(1.5);
      expect(NumberText_parse(" 72,4 ")).to.equal(72.4);
    });

    it("returns undefined for empty or blank text, where Number would give 0", () => {
      expect(NumberText_parse("")).to.equal(undefined);
      expect(NumberText_parse("   ")).to.equal(undefined);
    });

    it("returns undefined for text that is not a finite number", () => {
      expect(NumberText_parse("abc")).to.equal(undefined);
      expect(NumberText_parse("12abc")).to.equal(undefined);
      expect(NumberText_parse("Infinity")).to.equal(undefined);
    });

    it("rejects two separators, the same as the old first-comma-only copies", () => {
      expect(NumberText_parse("1,234.5")).to.equal(undefined);
      expect(NumberText_parse("1,2,3")).to.equal(undefined);
    });

    it("keeps negative numbers and zero", () => {
      expect(NumberText_parse("-3")).to.equal(-3);
      expect(NumberText_parse("-1,5")).to.equal(-1.5);
      expect(NumberText_parse("0")).to.equal(0);
    });
  });

  describe("parseNonNegative", () => {
    it("keeps zero and drops negatives", () => {
      expect(NumberText_parseNonNegative("0")).to.equal(0);
      expect(NumberText_parseNonNegative("2,5")).to.equal(2.5);
      expect(NumberText_parseNonNegative("-1")).to.equal(undefined);
      expect(NumberText_parseNonNegative("")).to.equal(undefined);
    });
  });

  describe("parsePositive", () => {
    it("drops zero and negatives", () => {
      expect(NumberText_parsePositive("0")).to.equal(undefined);
      expect(NumberText_parsePositive("-1")).to.equal(undefined);
      expect(NumberText_parsePositive("0,1")).to.equal(0.1);
      expect(NumberText_parsePositive("")).to.equal(undefined);
    });
  });

  describe("round1", () => {
    it("rounds to one decimal, halves up", () => {
      expect(NumberText_round1(12.34)).to.equal(12.3);
      expect(NumberText_round1(12.35)).to.equal(12.4);
      expect(NumberText_round1(-0.25)).to.equal(-0.2);
      expect(NumberText_round1(7)).to.equal(7);
    });
  });

  describe("round3", () => {
    it("rounds to three decimals", () => {
      expect(NumberText_round3(0.12345)).to.equal(0.123);
      expect(NumberText_round3(1.0005)).to.equal(Math.round(1.0005 * 1000) / 1000);
      expect(NumberText_round3(2)).to.equal(2);
    });
  });
});
