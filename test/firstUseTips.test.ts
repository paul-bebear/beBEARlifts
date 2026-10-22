import "mocha";
import { expect } from "chai";
import { FirstUseTips_next, IFirstUseEvent } from "../src/models/firstUseTips";

describe("FirstUseTips", () => {
  it("shows each tip once and records it in helps", () => {
    const first = FirstUseTips_next("setTap", ["other"]);
    expect(first.tip?.text).to.equal(
      "Tap the circle when a set is done. Change the numbers first if you did something else."
    );
    expect(first.helps).to.deep.equal(["other", first.tip?.id]);
    const second = FirstUseTips_next("setTap", first.helps);
    expect(second.tip).to.equal(undefined);
    expect(second.helps).to.equal(first.helps);
  });
  it("keeps the four tips apart, one sentence each", () => {
    const events: IFirstUseEvent[] = ["setTap", "crossedWeight", "finishTap", "programEditorOpen"];
    let helps: string[] = [];
    for (const event of events) {
      const next = FirstUseTips_next(event, helps);
      expect(next.tip, event).not.to.equal(undefined);
      helps = next.helps;
    }
    expect(new Set(helps).size).to.equal(4);
    expect(FirstUseTips_next("finishTap", []).tip?.text).to.equal("Finish saves the workout and grows your bear.");
  });
});
