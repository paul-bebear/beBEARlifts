import "mocha";
import { expect } from "chai";
import {
  AiCaps_defaults,
  AiCaps_fromServer,
  AiCaps_message,
  AiCaps_offerSubtitle,
  AiCaps_parse,
  AiCaps_plusFeature,
  AiCaps_plusLine,
  AiCaps_plusOf,
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

  it("reads the share and report-day refusals the server sends", () => {
    const share = { reason: "share", error: "Share used." };
    expect(AiCaps_parse(share)).to.deep.equal(share);
    expect(AiCaps_refusalText({ reason: "reportDay", error: "10 reports today." })).to.equal("10 reports today.");
  });

  it("shows the beBEAR+ caps", () => {
    expect(AiCaps_plusLine()).to.equal("beBEAR+: 30 AI uses a day, 150 a week.");
  });

  const server = { day: 3, week: 10, plusDay: 40, plusWeek: 200, lifetime: 3 };

  it("quotes the caps the server sends", () => {
    const caps = AiCaps_fromServer(server);
    expect(AiCaps_plusLine(AiCaps_plusOf(caps))).to.equal("beBEAR+: 40 AI uses a day, 200 a week.");
    expect(AiCaps_offerSubtitle(caps)).to.equal("40 AI uses a day. Tracking stays free.");
    expect(AiCaps_plusFeature(caps)).to.deep.equal({
      title: "200 AI uses a week",
      description: "40 a day instead of 3. Meal photos, meal text, nutrition labels, body scans and the AI warm-up.",
    });
  });

  it("falls back to the app's caps when the server sends none", () => {
    expect(AiCaps_fromServer(undefined)).to.equal(undefined);
    expect(AiCaps_fromServer("40")).to.equal(undefined);
    expect(AiCaps_plusOf(undefined)).to.deep.equal({ day: 30, week: 150 });
    expect(AiCaps_offerSubtitle(undefined)).to.equal("30 AI uses a day. Tracking stays free.");
    expect(AiCaps_plusFeature(undefined).title).to.equal("150 AI uses a week");
  });

  it("replaces each cap that is not a positive whole number", () => {
    expect(AiCaps_fromServer({ day: 0, week: -1, plusDay: 2.5, plusWeek: "200", lifetime: null })).to.deep.equal(
      AiCaps_defaults
    );
    expect(AiCaps_fromServer({ plusDay: 40 })).to.deep.equal({ ...AiCaps_defaults, plusDay: 40 });
  });
});
