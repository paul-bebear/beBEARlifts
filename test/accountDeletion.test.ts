import "mocha";
import { expect } from "chai";
import {
  AccountDeletion_isConfirmed,
  AccountDeletion_result,
  AccountDeletion_signInMessage,
  AccountDeletion_subscriptionLine,
  AccountDeletion_subscriptionNote,
} from "../src/models/accountDeletion";
import { IAccountPlanState } from "../src/models/accountPlan";

describe("AccountDeletion", () => {
  it("confirms only the exact word, ignoring outer spaces", () => {
    expect(AccountDeletion_isConfirmed("DELETE")).to.equal(true);
    expect(AccountDeletion_isConfirmed(" DELETE ")).to.equal(true);
    expect(AccountDeletion_isConfirmed("delete")).to.equal(false);
    expect(AccountDeletion_isConfirmed("DELET")).to.equal(false);
    expect(AccountDeletion_isConfirmed("")).to.equal(false);
  });

  it("succeeds only on a 200 that says the account is deleted", () => {
    expect(AccountDeletion_result(200, { deleted: true })).to.deep.equal({ ok: true });
    expect(AccountDeletion_result(200, {})).to.deep.equal({ ok: false, error: "The server returned 200." });
  });

  it("asks to sign in again on 401 and keeps the server's error text otherwise", () => {
    expect(AccountDeletion_result(401, { error: "anything" })).to.deep.equal({
      ok: false,
      error: AccountDeletion_signInMessage,
    });
    expect(AccountDeletion_result(502, { error: "Could not delete the account" })).to.deep.equal({
      ok: false,
      error: "Could not delete the account",
    });
    expect(AccountDeletion_result(404, undefined)).to.deep.equal({ ok: false, error: "The server returned 404." });
  });

  describe("subscription note", () => {
    const plus = (grant: "code" | "subscription" | "lifetime", userId = "u1"): IAccountPlanState => ({
      status: "known",
      userId,
      plan: "plus",
      grant,
      canManage: grant === "subscription",
    });

    it("warns only when the signed-in account's plus comes from a subscription", () => {
      expect(AccountDeletion_subscriptionNote(plus("subscription"), "u1")).to.equal(AccountDeletion_subscriptionLine);
      expect(AccountDeletion_subscriptionNote(plus("code"), "u1")).to.equal(undefined);
      expect(AccountDeletion_subscriptionNote(plus("lifetime"), "u1")).to.equal(undefined);
    });

    it("stays silent for free, unknown, activating and another user's plan", () => {
      expect(AccountDeletion_subscriptionNote({ status: "known", userId: "u1", plan: "free" }, "u1")).to.equal(
        undefined
      );
      expect(AccountDeletion_subscriptionNote({ status: "unknown" }, "u1")).to.equal(undefined);
      expect(AccountDeletion_subscriptionNote({ status: "activating", userId: "u1" }, "u1")).to.equal(undefined);
      expect(AccountDeletion_subscriptionNote(plus("subscription", "u2"), "u1")).to.equal(undefined);
      expect(AccountDeletion_subscriptionNote(plus("subscription"), undefined)).to.equal(undefined);
    });

    it("tells the user where to cancel", () => {
      expect(AccountDeletion_subscriptionLine).to.include("Settings → Apple ID → Subscriptions");
    });
  });
});
