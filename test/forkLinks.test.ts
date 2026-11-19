import "mocha";
import { expect } from "chai";
import { ForkLinks_isImportLink } from "../src/models/forkLinks";

describe("ForkLinks_isImportLink", () => {
  it("accepts a program link with data on the fork host", () => {
    expect(ForkLinks_isImportLink("https://lifts.paulbebear.com/program?data=abc")).to.equal(true);
  });
  it("accepts a /p/ share link", () => {
    expect(ForkLinks_isImportLink("https://lifts.paulbebear.com/p/xyz")).to.equal(true);
  });
  it("rejects /program without data", () => {
    expect(ForkLinks_isImportLink("https://lifts.paulbebear.com/program")).to.equal(false);
  });
  it("rejects other paths on the fork host", () => {
    expect(ForkLinks_isImportLink("https://lifts.paulbebear.com/app")).to.equal(false);
    expect(ForkLinks_isImportLink("https://lifts.paulbebear.com/pricing")).to.equal(false);
  });
  it("rejects another host, another scheme and a port", () => {
    expect(ForkLinks_isImportLink("https://www.liftosaur.com/p/xyz")).to.equal(false);
    expect(ForkLinks_isImportLink("http://lifts.paulbebear.com/p/xyz")).to.equal(false);
    expect(ForkLinks_isImportLink("https://lifts.paulbebear.com:8080/p/xyz")).to.equal(false);
  });
  it("rejects text that is not a URL", () => {
    expect(ForkLinks_isImportLink("not a url")).to.equal(false);
    expect(ForkLinks_isImportLink("")).to.equal(false);
  });
});
