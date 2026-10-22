import "mocha";
import { expect } from "chai";
import {
  AiCaps_message,
  AiCaps_parse,
  AiCaps_plusLine,
  AiCaps_refusalText,
  AiCaps_usageLine,
} from "../src/models/aiCaps";

const dayBody = {
  error: "server text",
  reason: "day",
  plan: "free",
  used: { day: 3, week: 7 },
  caps: { day: 3, week: 10 },
  weekFreesIn: 4,
};

describe("AiCaps", () => {
  it("reads the daily refusal from the 429 body", () => {
    expect(AiCaps_parse(dayBody)).to.deep.equal({
      reason: "day",
      plan: "free",
      used: { day: 3, week: 7 },
      caps: { day: 3, week: 10 },
      weekFreesIn: 4,
    });
    expect(AiCaps_refusalText(dayBody)).to.equal(
      "Your 3 AI uses for today are used. More tomorrow. 3 of 3 today, 7 of 10 this week."
    );
  });

  it("says when the weekly cap frees up", () => {
    const week = { ...dayBody, reason: "week", used: { day: 1, week: 10 } };
    expect(AiCaps_refusalText(week)).to.equal(
      "Your 10 AI uses for this week are used. More in 4 days. 1 of 3 today, 10 of 10 this week."
    );
    expect(AiCaps_message(AiCaps_parse({ ...week, weekFreesIn: 1 })!)).to.equal(
      "Your 10 AI uses for this week are used. More tomorrow."
    );
    expect(AiCaps_message(AiCaps_parse({ ...week, weekFreesIn: undefined })!)).to.equal(
      "Your 10 AI uses for this week are used. More tomorrow."
    );
  });

  it("builds the usage line", () => {
    expect(AiCaps_usageLine({ day: 2, week: 7 }, { day: 3, week: 10 })).to.equal("2 of 3 today, 7 of 10 this week");
  });

  it("reads the onboarding, report and global refusals", () => {
    expect(AiCaps_refusalText({ reason: "onboard", used: { lifetime: 3 }, caps: { lifetime: 3 } })).to.equal(
      "You used all 3 AI setups. Pick a beBEAR plan instead."
    );
    expect(AiCaps_refusalText({ reason: "report", error: "This workout already has its AI report." })).to.equal(
      "This workout already has its AI report."
    );
    expect(AiCaps_refusalText({ reason: "global", error: "The app's daily AI allowance is used up." })).to.equal(
      "The app's daily AI allowance is used up."
    );
  });

  it("returns undefined for a body it cannot read", () => {
    expect(AiCaps_parse(undefined)).to.equal(undefined);
    expect(AiCaps_parse({ error: "Rate limited" })).to.equal(undefined);
    expect(AiCaps_parse({ reason: "day", used: { day: "3", week: 7 }, caps: { day: 3, week: 10 } })).to.equal(
      undefined
    );
    expect(AiCaps_parse({ reason: "report" })).to.equal(undefined);
  });

  it("shows the beBEAR+ caps", () => {
    expect(AiCaps_plusLine()).to.equal("beBEAR+: 30 AI uses a day, 150 a week.");
  });
});
