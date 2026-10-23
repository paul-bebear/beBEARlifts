import "mocha";
import { expect } from "chai";
import { BearStoreData_empty, IBearStoreData } from "../src/models/bearStoreData";
import { DailyChecklist_doneDays, DailyChecklist_streak } from "../src/models/dailyChecklist";
import { FoodLog_empty } from "../src/models/foodLog";
import {
  HibernationPass_buy,
  HibernationPass_dismiss,
  HibernationPass_offer,
  HibernationPass_purchase,
  HibernationPass_settle,
  HibernationPass_wakeText,
} from "../src/models/hibernationPass";

const run = ["2026-10-18", "2026-10-19", "2026-10-20"];
const today = "2026-10-22";

function store(passes = 1): IBearStoreData {
  return { ...BearStoreData_empty(), passes };
}

describe("HibernationPass", () => {
  it("keeps the store when there are no streak days", () => {
    const saved = store();
    expect(HibernationPass_settle(saved, new Set(), today)).to.deep.equal({ store: saved, covered: [] });
    expect(HibernationPass_settle(saved, new Set(), today).store).to.equal(saved);
  });

  it("keeps the store when there are no missed days", () => {
    const saved = store();
    expect(HibernationPass_settle(saved, new Set(run), "2026-10-21").store).to.equal(saved);
  });

  it("covers one missed day and records the wake sheet without mutating inputs", () => {
    const saved = store();
    const days = new Set(run);
    const result = HibernationPass_settle(saved, days, today);
    expect(result.covered).to.deep.equal(["2026-10-21"]);
    expect(result.store).to.deep.equal({
      ...saved,
      passes: 0,
      coveredDays: ["2026-10-21"],
      pendingWake: { days: ["2026-10-21"], streak: 4 },
    });
    expect(saved).to.deep.equal(store());
    expect([...days]).to.deep.equal(run);
  });

  it("spends nothing when two missed days exceed one pass", () => {
    const saved = store();
    expect(HibernationPass_settle(saved, new Set(run), "2026-10-23").store).to.equal(saved);
  });

  it("covers two days when two passes are held", () => {
    const result = HibernationPass_settle(store(2), new Set(run), "2026-10-23");
    expect(result.covered).to.deep.equal(["2026-10-21", "2026-10-22"]);
    expect(result.store.passes).to.equal(0);
    expect(result.store.pendingWake?.streak).to.equal(5);
  });

  it("requires three streak days and spends nothing without a pass", () => {
    const saved = store();
    expect(HibernationPass_settle(saved, new Set(run.slice(1)), today).store).to.equal(saved);
    const empty = store(0);
    expect(HibernationPass_settle(empty, new Set(run), today).store).to.equal(empty);
  });

  it("keeps today open and ignores future activity", () => {
    const saved = store();
    expect(HibernationPass_settle(saved, new Set([...run, "2026-10-30"]), "2026-10-21").store).to.equal(saved);
  });

  it("covers yesterday even when today already has activity", () => {
    const result = HibernationPass_settle(store(), new Set([...run, today]), today);
    expect(result.covered).to.deep.equal(["2026-10-21"]);
    expect(result.store.pendingWake?.streak).to.equal(5);
  });

  it("returns the same store on a second settle even with a pass left", () => {
    const settled = HibernationPass_settle(store(2), new Set(run), today).store;
    expect(HibernationPass_settle(settled, new Set(run), today).store).to.equal(settled);
    expect(settled.passes).to.equal(1);
  });

  it("counts covered days through the streak gap", () => {
    const settled = HibernationPass_settle(store(), new Set(run), today).store;
    const done = DailyChecklist_doneDays({
      foodLog: FoodLog_empty(),
      workouts: [],
      coveredDays: [...run, ...settled.coveredDays],
    });
    expect(DailyChecklist_streak(done, today)).to.equal(4);
  });

  it("includes earlier covered days when checking the minimum streak", () => {
    const saved = { ...store(), coveredDays: [run[1]] };
    expect(HibernationPass_settle(saved, new Set([run[0], run[2]]), today).store.pendingWake?.streak).to.equal(4);
  });

  it("keeps the pass spent after activity is logged for a covered day", () => {
    const settled = HibernationPass_settle(store(2), new Set(run), today).store;
    expect(HibernationPass_settle(settled, new Set([...run, "2026-10-21"]), today).store).to.equal(settled);
    expect(settled.coveredDays).to.deep.equal(["2026-10-21"]);
  });

  it("covers month and year boundaries using local calendar dates", () => {
    const result = HibernationPass_settle(store(2), new Set(["2026-12-29", "2026-12-30", "2026-12-31"]), "2027-01-03");
    expect(result.covered).to.deep.equal(["2027-01-01", "2027-01-02"]);
  });

  it("retains at most 400 sorted covered days", () => {
    const coveredDays = Array.from({ length: 400 }, (_, i) => new Date(2020, 0, i + 1).toISOString().slice(0, 10));
    const result = HibernationPass_settle({ ...store(), coveredDays }, new Set(run), today);
    expect(result.store.coveredDays).to.have.length(400);
    expect(result.store.coveredDays.at(-1)).to.equal("2026-10-21");
  });

  it("buys for 25 honey and refuses full or underfunded purchases unchanged", () => {
    const first = HibernationPass_buy(store(0), 50).store;
    expect([first.passes, first.spent]).to.deep.equal([1, 25]);
    const second = HibernationPass_buy(first, 25).store;
    expect([second.passes, second.spent]).to.deep.equal([2, 50]);
    expect(HibernationPass_buy(second, 0)).to.deep.equal({ store: second, refusal: "full" });
    expect(HibernationPass_buy(second, 100).store).to.equal(second);
    expect(HibernationPass_buy(first, 24)).to.deep.equal({ store: first, refusal: "honey" });
    expect(HibernationPass_buy(first, 24).store).to.equal(first);
  });

  it("rechecks persisted spending for queued purchases", () => {
    const sources = {
      workouts: [],
      stats: { weight: {}, length: {}, percentage: {} },
      foodLog: FoodLog_empty(),
      sharedAt: Array.from({ length: 3 }, (_, i) => Array(10).fill(new Date(2026, 9, i + 1, 12).getTime())).flat(),
    };
    const first = HibernationPass_purchase(store(0), sources, new Date(2026, 9, 22, 12).getTime());
    expect([first.passes, first.spent]).to.deep.equal([1, 25]);
    expect(HibernationPass_purchase(first, sources, new Date(2026, 9, 22, 12).getTime())).to.equal(first);
  });

  it("renders purchase eligibility and exact refusal text", () => {
    expect(HibernationPass_offer(store(0), 25)).to.deep.equal({ disabled: false, label: "Buy a pass · 25 honey" });
    expect(HibernationPass_offer(store(2), 100)).to.deep.equal({ disabled: true, label: "You hold 2, the most." });
    expect(HibernationPass_offer(store(0), 12)).to.deep.equal({
      disabled: true,
      label: "You need 25 honey. You have 12.",
    });
  });

  it("writes the one-day and two-day wake text", () => {
    expect(HibernationPass_wakeText({ days: ["2026-10-21"], streak: 12 }, 1)).to.deep.equal({
      title: "Your bear hibernated",
      body: "It slept through yesterday, so your 12-day streak is safe. 1 pass left.",
      button: "Good morning",
    });
    expect(HibernationPass_wakeText({ days: ["2026-10-20", "2026-10-21"], streak: 12 }, 0).body).to.equal(
      "It slept through 2 days, so your 12-day streak is safe. 0 passes left."
    );
  });

  it("dismisses only the displayed wake and preserves other saved fields", () => {
    const settled = HibernationPass_settle(store(), new Set(run), today).store;
    const wake = settled.pendingWake!;
    expect(HibernationPass_dismiss(settled, { ...wake, streak: 99 })).to.equal(settled);
    expect(HibernationPass_dismiss(settled, { ...wake })).to.deep.equal({ ...store(0), coveredDays: ["2026-10-21"] });
  });
});
