import "mocha";
import { expect } from "chai";
import {
  BadgeCelebration_isLevelUpDue,
  BadgeCelebration_next,
  BadgeCelebration_step,
} from "../src/models/badgeCelebration";
import { IBearBadge } from "../src/models/bearBadges";
import { BearStoreData_empty, BearStoreData_parse, IBearStoreData } from "../src/models/bearStoreData";

const streak3: IBearBadge = { id: "streak3", day: "2026-10-03" };
const streak7: IBearBadge = { id: "streak7", day: "2026-10-07" };
const level2: IBearBadge = { id: "level2", recordId: 4, at: 1 };

function store(patch: Partial<IBearStoreData> = {}): IBearStoreData {
  return { ...BearStoreData_empty(), badgesSeeded: true, ...patch };
}

describe("BadgeCelebration", () => {
  it("marks every badge a user already has as seen on the first run and shows none", () => {
    const step = BadgeCelebration_next([streak3, level2], BearStoreData_empty());
    expect(step.badge).to.equal(undefined);
    expect(step.store.seenBadges).to.have.members(["streak3", "level2"]);
    expect(step.store.badgesSeeded).to.equal(true);
  });

  it("seeds an empty history without showing anything", () => {
    const step = BadgeCelebration_next([], BearStoreData_empty());
    expect(step.badge).to.equal(undefined);
    expect(step.store).to.deep.equal({ ...BearStoreData_empty(), badgesSeeded: true });
  });

  it("shows the oldest unseen badge and writes its id to seenBadges", () => {
    const step = BadgeCelebration_next([streak3, streak7], store());
    expect(step.badge).to.equal(streak3);
    expect(step.store.seenBadges).to.deep.equal(["streak3"]);
  });

  it("never shows the same badge twice and shows the rest one at a time", () => {
    const first = BadgeCelebration_next([streak3, streak7], store());
    const second = BadgeCelebration_next([streak3, streak7], first.store);
    const third = BadgeCelebration_next([streak3, streak7], second.store);
    expect(second.badge).to.equal(streak7);
    expect(third.badge).to.equal(undefined);
    expect(third.store).to.equal(second.store);
  });

  it("returns the same store object when nothing is due", () => {
    const saved = store({ seenBadges: ["streak3"] });
    expect(BadgeCelebration_next([streak3], saved).store).to.equal(saved);
  });

  it("waits while a level-up card is due, then shows the badge", () => {
    const saved = store({ seeded: true, celebratedLevel: 1 });
    expect(BadgeCelebration_isLevelUpDue(saved, 5000, "male")).to.equal(true);
    const waiting = BadgeCelebration_step([level2], saved, 5000, "male");
    expect(waiting.badge).to.equal(undefined);
    expect(waiting.store).to.equal(saved);
    const celebrated = { ...saved, celebratedLevel: 2 };
    expect(BadgeCelebration_isLevelUpDue(celebrated, 5000, "male")).to.equal(false);
    expect(BadgeCelebration_step([level2], celebrated, 5000, "male").badge).to.equal(level2);
  });

  it("does not hold badges back for a store the bear has not seeded yet", () => {
    expect(BadgeCelebration_isLevelUpDue(store({ celebratedLevel: 1 }), 5000, "male")).to.equal(false);
  });

  it("keeps the seen list and the seeded flag through a parse", () => {
    const saved = store({ seenBadges: ["streak3"] });
    expect(BearStoreData_parse(JSON.parse(JSON.stringify(saved)))).to.deep.equal(saved);
  });
});
