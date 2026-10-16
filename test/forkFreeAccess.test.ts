import "mocha";
import { expect } from "chai";
import { ISubscription } from "../src/types";
import { SubscriptionPlan_derive } from "../src/utils/subscriptionPlan";
import {
  Subscriptions_cleanupOutdatedAppleReceipts,
  Subscriptions_cleanupOutdatedGooglePurchaseTokens,
  Subscriptions_hasSubscription,
} from "../src/utils/subscriptions";
import { Service } from "../src/api/service";

// Adapted from ishank26/Sabertooth test/appFreeAccess.test.ts (AGPL-3.0).

function emptySubscription(): ISubscription {
  return { apple: [], google: [] };
}

function subscriptionWithReceipts(): ISubscription {
  return {
    apple: [{ vtype: "subscription_receipt", value: "apple-receipt", id: "a1", createdAt: 1 }],
    google: [{ vtype: "subscription_receipt", value: "google-token", id: "g1", createdAt: 1 }],
  };
}

describe("beBEARlifts free access", () => {
  it("unlocks premium without a subscription", () => {
    expect(Subscriptions_hasSubscription(emptySubscription())).to.equal(true);
  });

  it("derives the free-access plan on web and native, so the purchase pitch never shows", () => {
    expect(SubscriptionPlan_derive({ subscription: emptySubscription(), isNative: false })).to.deep.equal({
      state: "freeaccess",
    });
    expect(
      SubscriptionPlan_derive({ subscription: emptySubscription(), status: [], isNative: true, isIos: true })
    ).to.deep.equal({ state: "freeaccess" });
  });

  it("sends no receipt checks and leaves stored receipts alone", async () => {
    const calls: string[] = [];
    const dispatched: unknown[] = [];
    const service = {
      verifyAppleReceipt: () => {
        calls.push("apple");
        return Promise.resolve(false);
      },
      verifyGooglePurchaseToken: () => {
        calls.push("google");
        return Promise.resolve(false);
      },
    } as unknown as Service;
    const dispatch = (action: unknown): void => {
      dispatched.push(action);
    };
    await Subscriptions_cleanupOutdatedAppleReceipts(dispatch, "user", service, subscriptionWithReceipts());
    await Subscriptions_cleanupOutdatedGooglePurchaseTokens(dispatch, "user", service, subscriptionWithReceipts());
    expect(calls).to.deep.equal([]);
    expect(dispatched).to.deep.equal([]);
  });
});
