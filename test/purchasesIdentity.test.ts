import "mocha";
import { expect } from "chai";
import {
  PurchasesIdentity_finished,
  PurchasesIdentity_configuredWith,
  PurchasesIdentity_waitFor,
  PurchasesIdentity_want,
} from "../src/models/purchasesIdentity";

describe("PurchasesIdentity", () => {
  it("needs no call for the user RevenueCat was configured with", () => {
    const state = PurchasesIdentity_configuredWith("a");
    expect(PurchasesIdentity_waitFor(state, "a")).to.equal("ready");
    expect(PurchasesIdentity_want(state, "a").effect).to.equal(undefined);
  });

  it("logs in after sign-in and is ready only when the call finishes", () => {
    const signedIn = PurchasesIdentity_want(PurchasesIdentity_configuredWith(undefined), "a");
    expect(signedIn.effect).to.deep.equal({ type: "logIn", userId: "a" });
    expect(PurchasesIdentity_waitFor(signedIn.state, "a")).to.equal("wait");
    const done = PurchasesIdentity_finished(signedIn.state, true);
    expect(done.effect).to.equal(undefined);
    expect(PurchasesIdentity_waitFor(done.state, "a")).to.equal("ready");
  });

  it("runs one call at a time and then catches up with the latest user", () => {
    const first = PurchasesIdentity_want(PurchasesIdentity_configuredWith(undefined), "a");
    const switched = PurchasesIdentity_want(first.state, "b");
    expect(switched.effect).to.equal(undefined);
    const next = PurchasesIdentity_finished(switched.state, true);
    expect(next.effect).to.deep.equal({ type: "logIn", userId: "b" });
    expect(PurchasesIdentity_waitFor(next.state, "a")).to.equal("rejected");
    expect(PurchasesIdentity_waitFor(next.state, "b")).to.equal("wait");
    expect(PurchasesIdentity_waitFor(PurchasesIdentity_finished(next.state, true).state, "b")).to.equal("ready");
  });

  it("is not ready for the old user after logging in as a new one fails", () => {
    const switching = PurchasesIdentity_want(PurchasesIdentity_configuredWith("a"), "b");
    const failed = PurchasesIdentity_finished(switching.state, false);
    expect(failed.state.done).to.equal("a");
    expect(PurchasesIdentity_waitFor(failed.state, "a")).to.equal("rejected");
    expect(PurchasesIdentity_waitFor(failed.state, "b")).to.equal("rejected");
  });

  it("logs out after sign-out", () => {
    const out = PurchasesIdentity_want(PurchasesIdentity_configuredWith("a"), undefined);
    expect(out.effect).to.deep.equal({ type: "logOut" });
    expect(PurchasesIdentity_finished(out.state, true).state).to.deep.equal({ wanted: null, done: null });
  });

  it("does not retry a failed call for the same user until asked again", () => {
    const tried = PurchasesIdentity_want(PurchasesIdentity_configuredWith(undefined), "a");
    const failed = PurchasesIdentity_finished(tried.state, false);
    expect(failed.effect).to.equal(undefined);
    expect(PurchasesIdentity_waitFor(failed.state, "a")).to.equal("rejected");
    expect(PurchasesIdentity_want(failed.state, "a").effect).to.deep.equal({ type: "logIn", userId: "a" });
  });

  it("ignores a finish with nothing running", () => {
    const state = PurchasesIdentity_configuredWith("a");
    expect(PurchasesIdentity_finished(state, true)).to.deep.equal({ state });
  });
});
