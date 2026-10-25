import "mocha";
import { expect } from "chai";
import {
  AccountPlan_accept,
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
});
