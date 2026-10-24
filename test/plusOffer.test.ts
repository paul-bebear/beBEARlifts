import "mocha";
import { expect } from "chai";
import {
  PlusOffer_afterFirstProgram,
  PlusOffer_capSheetDue,
  PlusOffer_capSheetTitle,
  PlusOffer_day,
  PlusOffer_fromRefusal,
  PlusOffer_parseMemory,
  PlusOffer_paywallOutcome,
  PlusOffer_rememberCapDay,
  PlusOffer_idle,
  PlusOffer_reduce,
  PlusOffer_startFailed,
  PlusOffer_activating,
  PlusOffer_restoredMessage,
  PlusOffer_nothingToRestore,
  PlusOffer_restoreFailed,
  IPlusOfferEvent,
  IPlusOfferFlow,
  IPlusOfferStep,
} from "../src/models/plusOffer";
import { IAiCapsRefusal } from "../src/models/aiCaps";
import { IAccountPlanState } from "../src/models/accountPlan";

const free: IAccountPlanState = { status: "known", userId: "a", plan: "free" };
const dayCap: IAiCapsRefusal = {
  reason: "day",
  plan: "free",
  used: { day: 3, week: 5 },
  caps: { day: 3, week: 10 },
};
const ready = { hasProgram: true, available: true, userId: "a", plan: free, shownBefore: false };

describe("PlusOffer", () => {
  it("offers once after the first program to a signed-in free user", () => {
    expect(PlusOffer_afterFirstProgram(ready)).to.equal(true);
    expect(PlusOffer_afterFirstProgram({ ...ready, shownBefore: true })).to.equal(false);
    expect(PlusOffer_afterFirstProgram({ ...ready, hasProgram: false })).to.equal(false);
    expect(PlusOffer_afterFirstProgram({ ...ready, available: false })).to.equal(false);
  });

  it("waits for sign-in and for a known plan", () => {
    expect(PlusOffer_afterFirstProgram({ ...ready, userId: undefined })).to.equal(false);
    expect(PlusOffer_afterFirstProgram({ ...ready, plan: { status: "unknown" } })).to.equal(false);
    expect(PlusOffer_afterFirstProgram({ ...ready, userId: "b" })).to.equal(false);
    expect(
      PlusOffer_afterFirstProgram({
        ...ready,
        plan: { status: "known", userId: "a", plan: "plus", grant: "code", canManage: false },
      })
    ).to.equal(false);
  });

  it("offers an upgrade only for a free user's day or week limit", () => {
    expect(PlusOffer_fromRefusal(dayCap)).to.equal(true);
    expect(PlusOffer_fromRefusal({ ...dayCap, reason: "week" })).to.equal(true);
    expect(PlusOffer_fromRefusal({ ...dayCap, plan: "plus" })).to.equal(false);
    expect(PlusOffer_fromRefusal({ reason: "onboard", used: 3, cap: 3 })).to.equal(false);
    expect(PlusOffer_fromRefusal({ reason: "global", error: "x" })).to.equal(false);
    expect(PlusOffer_fromRefusal(undefined)).to.equal(false);
  });

  it("shows the limit sheet at most once a day", () => {
    const today = PlusOffer_day(new Date(2026, 9, 4, 23, 30));
    expect(today).to.equal("2026-10-04");
    expect(PlusOffer_capSheetDue(undefined, today)).to.equal(true);
    expect(PlusOffer_capSheetDue(today, today)).to.equal(false);
    expect(PlusOffer_capSheetDue("2026-10-03", today)).to.equal(true);
  });

  it("names the limit that was hit and the plus limit", () => {
    expect(PlusOffer_capSheetTitle(dayCap)).to.equal("You used today's 3 AI uses. beBEAR+ gives 30 a day.");
    expect(PlusOffer_capSheetTitle({ ...dayCap, reason: "week" })).to.equal(
      "You used this week's 10 AI uses. beBEAR+ gives 150 a week."
    );
  });

  it("maps RevenueCat's paywall results", () => {
    expect(PlusOffer_paywallOutcome("PURCHASED")).to.equal("purchased");
    expect(PlusOffer_paywallOutcome("RESTORED")).to.equal("restored");
    expect(PlusOffer_paywallOutcome("CANCELLED")).to.equal("cancelled");
    expect(PlusOffer_paywallOutcome("NOT_PRESENTED")).to.equal("notPresented");
    expect(PlusOffer_paywallOutcome("SOMETHING_NEW")).to.equal("error");
  });

  it("parses the saved offer memory and keeps the limit day per account", () => {
    expect(PlusOffer_parseMemory({ firstProgramShown: true, capSheetDays: { a: "2026-10-04", b: 4 } })).to.deep.equal({
      firstProgramShown: true,
      capSheetDays: { a: "2026-10-04" },
    });
    expect(PlusOffer_parseMemory({ firstProgramShown: "yes" })).to.deep.equal({});
    expect(PlusOffer_rememberCapDay({ capSheetDays: { a: "2026-10-03" } }, "b", "2026-10-04")).to.deep.equal({
      capSheetDays: { a: "2026-10-03", b: "2026-10-04" },
    });
  });
});

function run(events: IPlusOfferEvent[], flow: IPlusOfferFlow = PlusOffer_idle()): IPlusOfferStep {
  return events.reduce<IPlusOfferStep>((step, event) => PlusOffer_reduce(step.state, event), {
    state: flow,
    effects: [],
  });
}

function types(step: IPlusOfferStep): string[] {
  return step.effects.map((effect) => effect.type);
}

const capEvent: IPlusOfferEvent = { type: "capRefused", refusal: dayCap, userId: "a", memory: {}, today: "2026-10-04" };

describe("PlusOffer_reduce", () => {
  it("buys from Settings: identify, paywall, then activate and sync", () => {
    const opened = run([{ type: "open", trigger: "settings", userId: "a" }]);
    expect(opened.effects).to.deep.equal([{ type: "identify", userId: "a" }]);
    const shown = run([{ type: "identified", ready: true }], opened.state);
    expect(types(shown)).to.deep.equal(["presentPaywall"]);
    const bought = run([{ type: "paywallClosed", outcome: "purchased" }], shown.state);
    expect(bought.effects).to.deep.equal([{ type: "markActivating", userId: "a" }, { type: "sync" }]);
    const done = run([{ type: "synced", result: "plus" }], bought.state);
    expect(done).to.deep.equal({ state: PlusOffer_idle(), effects: [] });
  });

  it("asks a signed-out user to sign in, and stops when sign-in is cancelled", () => {
    const opened = run([{ type: "open", trigger: "settings", userId: undefined }]);
    expect(types(opened)).to.deep.equal(["askSignIn"]);
    expect(run([{ type: "signInChoice" }], opened.state).state.step).to.equal("idle");
    const signing = run([{ type: "signInChoice", provider: "apple" }], opened.state);
    expect(signing.effects).to.deep.equal([{ type: "signIn", provider: "apple" }]);
    expect(run([{ type: "signedIn" }], signing.state).state.step).to.equal("idle");
    expect(run([{ type: "signedIn", userId: "a" }], signing.state).effects).to.deep.equal([
      { type: "identify", userId: "a" },
    ]);
    expect(run([{ type: "signedIn", error: "No network" }], signing.state).effects).to.deep.equal([
      { type: "alert", message: "No network" },
    ]);
  });

  it("ignores a second trigger while one flow runs", () => {
    const busy = run([{ type: "open", trigger: "settings", userId: "a" }]);
    expect(run([{ type: "firstProgram" }], busy.state)).to.deep.equal({ state: busy.state, effects: [] });
    expect(run([capEvent], busy.state).effects).to.deep.equal([]);
  });

  it("shows the limit sheet once for two refusals at once, and once a day per account", () => {
    const first = run([capEvent]);
    expect(types(first)).to.deep.equal(["rememberCapDay", "askCap"]);
    expect(run([capEvent], first.state).effects).to.deep.equal([]);
    const memory = { capSheetDays: { a: "2026-10-04" } };
    expect(run([{ ...capEvent, memory } as IPlusOfferEvent]).effects).to.deep.equal([]);
    expect(types(run([{ ...capEvent, userId: "b", memory } as IPlusOfferEvent]))).to.deep.equal([
      "rememberCapDay",
      "askCap",
    ]);
    expect(run([capEvent, { type: "capChoice", see: true }]).effects).to.deep.equal([
      { type: "identify", userId: "a" },
    ]);
  });

  it("checks the first-program offer again after the wait", () => {
    const waiting = run([{ type: "firstProgram" }]);
    expect(waiting.effects).to.deep.equal([{ type: "wait", ms: 800 }]);
    expect(run([{ type: "waited", eligible: false, userId: "a" }], waiting.state).state.step).to.equal("idle");
    expect(run([{ type: "waited", eligible: true, userId: "a" }], waiting.state).effects).to.deep.equal([
      { type: "identify", userId: "a" },
    ]);
  });

  it("counts the first-program offer as shown only when the paywall opened", () => {
    const presenting = run([
      { type: "firstProgram" },
      { type: "waited", eligible: true, userId: "a" },
      { type: "identified", ready: true },
    ]);
    expect(types(run([{ type: "paywallClosed", outcome: "cancelled" }], presenting.state))).to.deep.equal([
      "markFirstProgramShown",
    ]);
    expect(run([{ type: "paywallClosed", outcome: "error" }], presenting.state).effects).to.deep.equal([]);
    expect(types(run([{ type: "paywallClosed", outcome: "purchased" }], presenting.state))).to.deep.equal([
      "markFirstProgramShown",
      "markActivating",
      "sync",
    ]);
    const notReady = run([{ type: "firstProgram" }, { type: "waited", eligible: true, userId: "a" }]);
    expect(run([{ type: "identified", ready: false }], notReady.state).effects).to.deep.equal([]);
  });

  it("tells the user when a requested paywall cannot start", () => {
    const opened = run([{ type: "open", trigger: "settings", userId: "a" }]);
    expect(run([{ type: "identified", ready: false }], opened.state).effects).to.deep.equal([
      { type: "alert", message: PlusOffer_startFailed },
    ]);
  });

  it("restores through the same activation, and says what happened", () => {
    const restoring = run([
      { type: "open", trigger: "restore", userId: "a" },
      { type: "identified", ready: true },
    ]);
    expect(types(restoring)).to.deep.equal(["restore"]);
    const restored = run([{ type: "restoreDone", outcome: "restored" }], restoring.state);
    expect(types(restored)).to.deep.equal(["markActivating", "sync"]);
    expect(run([{ type: "synced", result: "plus" }], restored.state).effects).to.deep.equal([
      { type: "alert", message: PlusOffer_restoredMessage },
    ]);
    expect(run([{ type: "synced", result: "error" }], restored.state).effects).to.deep.equal([
      { type: "alert", message: PlusOffer_activating },
    ]);
    expect(run([{ type: "restoreDone", outcome: "none" }], restoring.state).effects).to.deep.equal([
      { type: "alert", message: PlusOffer_nothingToRestore },
    ]);
    expect(run([{ type: "restoreDone", outcome: "error" }], restoring.state).effects).to.deep.equal([
      { type: "alert", message: PlusOffer_restoreFailed },
    ]);
  });

  it("stays quiet when a newer sync took over, and resets after a failure", () => {
    const activating = run([
      { type: "open", trigger: "settings", userId: "a" },
      { type: "identified", ready: true },
      { type: "paywallClosed", outcome: "purchased" },
    ]);
    expect(run([{ type: "synced", result: "stale" }], activating.state)).to.deep.equal({
      state: PlusOffer_idle(),
      effects: [],
    });
    expect(run([{ type: "failed" }], activating.state).state).to.deep.equal(PlusOffer_idle());
  });

  it("ignores an event that does not fit the current step", () => {
    const opened = run([{ type: "open", trigger: "settings", userId: "a" }]);
    expect(run([{ type: "paywallClosed", outcome: "purchased" }], opened.state).effects).to.deep.equal([]);
    expect(run([{ type: "synced", result: "plus" }]).effects).to.deep.equal([]);
  });
});
