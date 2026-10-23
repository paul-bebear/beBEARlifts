import "mocha";
import { expect } from "chai";
import { Season_for, Season_lastDay, Season_parse } from "../src/models/season";

const on = (month: number, day: number): Date => new Date(2026, month - 1, day, 12);

describe("Season_for", () => {
  it("splits the northern year into bulk, lean and summer on the first of the month", () => {
    expect(Season_for(on(10, 1), false)).to.equal("bulk");
    expect(Season_for(on(12, 31), false)).to.equal("bulk");
    expect(Season_for(on(3, 31), false)).to.equal("bulk");
    expect(Season_for(on(4, 1), false)).to.equal("lean");
    expect(Season_for(on(6, 30), false)).to.equal("lean");
    expect(Season_for(on(7, 1), false)).to.equal("summer");
    expect(Season_for(on(9, 30), false)).to.equal("summer");
  });

  it("shifts every date by six months south of the equator", () => {
    expect(Season_for(on(4, 1), true)).to.equal("bulk");
    expect(Season_for(on(9, 30), true)).to.equal("bulk");
    expect(Season_for(on(10, 1), true)).to.equal("lean");
    expect(Season_for(on(12, 31), true)).to.equal("lean");
    expect(Season_for(on(1, 1), true)).to.equal("summer");
    expect(Season_for(on(3, 31), true)).to.equal("summer");
  });
});

describe("Season_lastDay", () => {
  it("names the last day of each season in both halves of the world", () => {
    expect([
      Season_lastDay("bulk", false),
      Season_lastDay("lean", false),
      Season_lastDay("summer", false),
    ]).to.deep.equal(["March 31", "June 30", "September 30"]);
    expect([Season_lastDay("bulk", true), Season_lastDay("lean", true), Season_lastDay("summer", true)]).to.deep.equal([
      "September 30",
      "December 31",
      "March 31",
    ]);
  });
});

describe("Season_parse", () => {
  it("keeps a known season and drops anything else", () => {
    expect(Season_parse("lean")).to.equal("lean");
    expect(Season_parse("winter")).to.equal(undefined);
  });
});
