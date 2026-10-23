import "mocha";
import { expect } from "chai";
import { HomeToday_card, HomeToday_historyLabel } from "../src/models/homeToday";

describe("HomeToday", () => {
  it("shows the ongoing workout while one is running, even before the first finished one", () => {
    expect(HomeToday_card({ hasProgress: true, historyCount: 0 })).to.equal("ongoing");
    expect(HomeToday_card({ hasProgress: true, historyCount: 5 })).to.equal("ongoing");
  });

  it("shows the welcome card until the first workout is finished", () => {
    expect(HomeToday_card({ hasProgress: false, historyCount: 0 })).to.equal("welcome");
  });

  it("shows the next workout once there is history", () => {
    expect(HomeToday_card({ hasProgress: false, historyCount: 1 })).to.equal("next");
  });

  it("labels the History link with the workout count, and hides it with no history", () => {
    expect(HomeToday_historyLabel(0)).to.equal(undefined);
    expect(HomeToday_historyLabel(1)).to.equal("History · 1 workout");
    expect(HomeToday_historyLabel(12)).to.equal("History · 12 workouts");
  });
});
