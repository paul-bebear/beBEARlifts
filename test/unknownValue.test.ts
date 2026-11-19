import "mocha";
import { expect } from "chai";
import {
  UnknownValue_finite,
  UnknownValue_isFinite,
  UnknownValue_isNonNegative,
  UnknownValue_isRecord,
  UnknownValue_nonNegative,
  UnknownValue_text,
  UnknownValue_textOrEmpty,
  UnknownValue_trimmedText,
} from "../src/models/unknownValue";

describe("UnknownValue", () => {
  it("isRecord takes any non-null object, arrays included", () => {
    expect(UnknownValue_isRecord({})).to.equal(true);
    expect(UnknownValue_isRecord([])).to.equal(true);
    expect(UnknownValue_isRecord(null)).to.equal(false);
    expect(UnknownValue_isRecord(undefined)).to.equal(false);
    expect(UnknownValue_isRecord("x")).to.equal(false);
    expect(UnknownValue_isRecord(1)).to.equal(false);
  });

  it("finite takes any finite number and refuses strings", () => {
    expect(UnknownValue_finite(-2.5)).to.equal(-2.5);
    expect(UnknownValue_finite(0)).to.equal(0);
    expect(UnknownValue_finite(Number.NaN)).to.equal(undefined);
    expect(UnknownValue_finite(Infinity)).to.equal(undefined);
    expect(UnknownValue_finite("3")).to.equal(undefined);
    expect(UnknownValue_finite(null)).to.equal(undefined);
    expect(UnknownValue_isFinite(-1)).to.equal(true);
    expect(UnknownValue_isFinite("1")).to.equal(false);
  });

  it("nonNegative takes finite numbers of 0 or more", () => {
    expect(UnknownValue_nonNegative(0)).to.equal(0);
    expect(UnknownValue_nonNegative(4)).to.equal(4);
    expect(UnknownValue_nonNegative(-0.1)).to.equal(undefined);
    expect(UnknownValue_nonNegative(Number.NaN)).to.equal(undefined);
    expect(UnknownValue_nonNegative("4")).to.equal(undefined);
    expect(UnknownValue_isNonNegative(0)).to.equal(true);
    expect(UnknownValue_isNonNegative(-1)).to.equal(false);
  });

  it("text keeps a non-empty string as is, spaces included", () => {
    expect(UnknownValue_text("a")).to.equal("a");
    expect(UnknownValue_text(" a ")).to.equal(" a ");
    expect(UnknownValue_text(" ")).to.equal(" ");
    expect(UnknownValue_text("")).to.equal(undefined);
    expect(UnknownValue_text(1)).to.equal(undefined);
    expect(UnknownValue_text(["a"])).to.equal(undefined);
  });

  it("trimmedText trims and refuses a blank string", () => {
    expect(UnknownValue_trimmedText(" a ")).to.equal("a");
    expect(UnknownValue_trimmedText("  ")).to.equal(undefined);
    expect(UnknownValue_trimmedText("")).to.equal(undefined);
    expect(UnknownValue_trimmedText(null)).to.equal(undefined);
  });

  it("textOrEmpty gives an empty string for anything but a string", () => {
    expect(UnknownValue_textOrEmpty("a")).to.equal("a");
    expect(UnknownValue_textOrEmpty("")).to.equal("");
    expect(UnknownValue_textOrEmpty(undefined)).to.equal("");
    expect(UnknownValue_textOrEmpty(5)).to.equal("");
  });
});
