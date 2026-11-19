import "mocha";
import { expect } from "chai";
import { AiCaps_defaults } from "../src/models/aiCaps";
import {
  AccountPlan_accept,
  AccountPlan_activatingTries,
  AccountPlan_aiCaps,
  AccountPlan_codeRedeemed,
  AccountPlan_empty,
  AccountPlan_isPlus,
  AccountPlan_parse,
  AccountPlan_parseSync,
  AccountPlan_settingsRow,
  IAccountPlanState,
} from "../src/models/accountPlan";

const free: IAccountPlanState = { status: "known", userId: "a", plan: "free" };
const plusA: IAccountPlanState = { status: "known", userId: "a", plan: "plus", grant: "subscription", canManage: true };

describe("AccountPlan", () => {
  it("parses the saved store value and drops anything unreadable", () => {
    expect(AccountPlan_parse(plusA)).to.deep.equal(plusA);
    expect(AccountPlan_parse({ status: "activating", userId: "a" })).to.deep.equal({
      status: "activating",
      userId: "a",
    });
    expect(AccountPlan_parse({ status: "known", userId: "a", plan: "plus" })).to.deep.equal(AccountPlan_empty());
    expect(AccountPlan_parse({ status: "known", userId: "a", plan: "gold" })).to.deep.equal(AccountPlan_empty());
    expect(AccountPlan_parse(undefined)).to.deep.equal(AccountPlan_empty());
  });

  it("reads the sync answer, and plus needs a grant", () => {
    expect(AccountPlan_parseSync("a", { plan: "plus", grant: "lifetime", canManageSubscription: false })).to.deep.equal(
      {
        status: "known",
        userId: "a",
        plan: "plus",
        grant: "lifetime",
        canManage: false,
      }
    );
    expect(AccountPlan_parseSync("a", { plan: "free", grant: null })).to.deep.equal(free);
    expect(AccountPlan_parseSync("a", { plan: "plus", grant: null })).to.equal(undefined);
    expect(AccountPlan_parseSync("a", { error: "x" })).to.equal(undefined);
  });

  it("drops an answer for a user who is no longer signed in", () => {
    expect(AccountPlan_accept(free, "a", plusA)).to.deep.equal(plusA);
    expect(AccountPlan_accept(free, "b", plusA)).to.deep.equal(AccountPlan_empty());
    expect(AccountPlan_accept({ status: "known", userId: "b", plan: "free" }, "b", plusA)).to.deep.equal({
      status: "known",
      userId: "b",
      plan: "free",
    });
    expect(AccountPlan_accept(plusA, undefined, plusA)).to.deep.equal(AccountPlan_empty());
  });

  it("keeps a purchase activating through 4 free answers and gives up on the 5th", () => {
    let state: IAccountPlanState = { status: "activating", userId: "a" };
    for (let answer = 1; answer < AccountPlan_activatingTries; answer += 1) {
      state = AccountPlan_accept(state, "a", free);
      expect(state).to.deep.equal({ status: "activating", userId: "a", tries: answer });
      expect(AccountPlan_parse(state)).to.deep.equal(state);
    }
    expect(AccountPlan_accept(state, "a", free)).to.deep.equal(free);
    expect(AccountPlan_accept(state, "a", plusA)).to.deep.equal(plusA);
    expect(AccountPlan_accept({ status: "activating", userId: "b" }, "a", free)).to.deep.equal(free);
  });

  it("counts plus only for the signed-in user", () => {
    expect(AccountPlan_isPlus(plusA, "a")).to.equal(true);
    expect(AccountPlan_isPlus(plusA, "b")).to.equal(false);
    expect(AccountPlan_isPlus(free, "a")).to.equal(false);
  });

  it("offers Manage subscription whenever a subscription runs, even beside a code", () => {
    expect(AccountPlan_settingsRow(plusA, "a").action).to.equal("manage");
    expect(AccountPlan_settingsRow({ ...plusA, grant: "code" }, "a").action).to.equal("manage");
    expect(AccountPlan_settingsRow({ ...plusA, grant: "code", canManage: false }, "a")).to.deep.equal({
      title: "beBEAR+ from a code",
      action: "none",
    });
    expect(AccountPlan_settingsRow({ ...plusA, grant: "lifetime", canManage: false }, "a").title).to.equal(
      "beBEAR+ for life"
    );
  });

  it("offers beBEAR+ to free and signed-out users, and shows activation", () => {
    expect(AccountPlan_settingsRow(free, "a").action).to.equal("open");
    expect(AccountPlan_settingsRow(plusA, undefined).action).to.equal("open");
    expect(AccountPlan_settingsRow({ status: "activating", userId: "a" }, "a").subtitle).to.equal(
      "Purchase done. Activating…"
    );
  });

  const aiCaps = { day: 3, week: 10, plusDay: 40, plusWeek: 200, lifetime: 3 };

  function parsedSync(body: object): IAccountPlanState {
    const state = AccountPlan_parseSync("a", body);
    if (state == null) {
      throw new Error("Expected a readable sync answer");
    }
    return state;
  }

  it("stores the caps the sync answer sends and quotes them in the offer row", () => {
    const synced = parsedSync({ plan: "free", grant: null, aiCaps });
    expect(synced).to.deep.equal({ ...free, aiCaps });
    expect(AccountPlan_parse(synced)).to.deep.equal(synced);
    expect(AccountPlan_aiCaps(synced)).to.deep.equal(aiCaps);
    expect(AccountPlan_settingsRow(synced, "a").subtitle).to.equal("40 AI uses a day. Tracking stays free.");
    expect(AccountPlan_codeRedeemed(synced, "a")).to.deep.include({ aiCaps });
  });

  it("uses the app's caps when the sync answer has none or bad ones", () => {
    expect(AccountPlan_parseSync("a", { plan: "free", grant: null })).to.deep.equal(free);
    expect(AccountPlan_aiCaps(free)).to.deep.equal(AiCaps_defaults);
    expect(AccountPlan_aiCaps({ status: "activating", userId: "a" })).to.deep.equal(AiCaps_defaults);
    expect(AccountPlan_settingsRow(free, "a").subtitle).to.equal("30 AI uses a day. Tracking stays free.");
    const bad = parsedSync({ plan: "free", grant: null, aiCaps: { plusDay: 0 } });
    expect(AccountPlan_aiCaps(bad)).to.deep.equal(AiCaps_defaults);
  });

  it("keeps a running subscription when the same user redeems a code", () => {
    expect(AccountPlan_codeRedeemed(plusA, "a")).to.deep.equal({ ...plusA, grant: "code", canManage: true });
    const code: IAccountPlanState = { status: "known", userId: "a", plan: "plus", grant: "code", canManage: false };
    expect(AccountPlan_codeRedeemed(free, "a")).to.deep.equal(code);
    expect(AccountPlan_codeRedeemed(AccountPlan_empty(), "a")).to.deep.equal(code);
    expect(AccountPlan_codeRedeemed(plusA, "b")).to.deep.equal({ ...code, userId: "b" });
  });
});
