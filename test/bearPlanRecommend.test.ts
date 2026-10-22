import "mocha";
import { expect } from "chai";
import { BearPlan_recommend, IBearPlanInput } from "../src/models/bearPlanRecommend";

const base: IBearPlanInput = { picks: ["gym"], goal: "size", agile: false, experience: "new" };

describe("BearPlanRecommend", () => {
  it("puts the day count of the experience first and marks only that card", () => {
    expect(BearPlan_recommend(base).map((c) => c.days)).to.deep.equal([3, 4, 5]);
    expect(BearPlan_recommend({ ...base, experience: "months" }).map((c) => c.days)).to.deep.equal([4, 3, 5]);
    expect(BearPlan_recommend({ ...base, experience: "years" }).map((c) => c.days)).to.deep.equal([5, 3, 4]);
    const cards = BearPlan_recommend({ ...base, experience: "years" });
    expect(cards.map((c) => c.recommended)).to.deep.equal([true, false, false]);
  });

  it("passes goal, agility and the resolved places to every card", () => {
    const cards = BearPlan_recommend({ ...base, picks: ["street", "dumbbells"], goal: "both", agile: true });
    for (const card of cards) {
      expect(card.params.goal).to.equal("both");
      expect(card.params.agile).to.equal(true);
      expect(card.params.places).to.deep.equal(["dumbbells", "street", "floor"]);
      expect(card.params.days).to.equal(card.days);
    }
  });

  for (const experience of ["new", "months", "years"] as const) {
    for (const [days, recommended] of [
      [2, 3],
      [3, 3],
      [4, 4],
      [5, 5],
      [6, 5],
    ] as const) {
      it(`recommends ${recommended} days for ${days} available days with ${experience} experience`, () => {
        const cards = BearPlan_recommend({ ...base, experience, days });
        expect(cards.map((card) => card.days)).to.deep.equal([
          recommended,
          ...([3, 4, 5] as const).filter((day) => day !== recommended),
        ]);
        expect(cards.map((card) => card.recommended)).to.deep.equal([true, false, false]);
      });
    }
  }

  it("keeps the youth rule on every card when days are supplied", () => {
    for (const days of [2, 3, 4, 5, 6] as const) {
      const cards = BearPlan_recommend({ ...base, age: 16, days });
      expect(cards.every((card) => card.params.youth)).to.equal(true);
    }
  });

  it("sets youth under 18 only", () => {
    expect(BearPlan_recommend({ ...base, age: 15 })[0].params.youth).to.equal(true);
    expect(BearPlan_recommend({ ...base, age: 17 })[0].params.youth).to.equal(true);
    expect(BearPlan_recommend({ ...base, age: 18 })[0].params.youth).to.equal(false);
    expect(BearPlan_recommend(base)[0].params.youth).to.equal(false);
  });

  it("names each card after its catalog program and mentions the jumps when agile", () => {
    const cards = BearPlan_recommend({ ...base, experience: "years" });
    expect(cards.map((c) => c.name)).to.deep.equal([
      "beBEAR 5-Day Upper/Lower/Push/Pull/Lower",
      "beBEAR 3-Day Full Body",
      "beBEAR 4-Day Upper/Lower",
    ]);
    expect(cards[1].summary).to.include("stretching");
    const agile = BearPlan_recommend({ ...base, agile: true });
    expect(agile.every((c) => c.summary.includes("Jumps"))).to.equal(true);
    expect(agile[0].summary).not.to.include("stretching");
  });
});
