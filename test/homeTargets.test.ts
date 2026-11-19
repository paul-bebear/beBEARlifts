import "mocha";
import { expect } from "chai";
import { HomeTargets_forBoard, HomeTargets_forHouse } from "../src/models/homeTargets";

describe("HomeTargets", () => {
  it("opens the goal wizard on the pace step only when a goal exists", () => {
    expect(HomeTargets_forBoard("goal", true)).to.deep.equal({ kind: "goalWizard", mode: "pace", tab: "graphs" });
    expect(HomeTargets_forBoard("goal", false)).to.deep.equal({ kind: "goalWizard", mode: "goal", tab: "graphs" });
  });

  it("opens the streak screen on the graphs tab", () => {
    expect(HomeTargets_forBoard("streak", false)).to.deep.equal({ kind: "screen", screen: "streak", tab: "graphs" });
  });

  it("opens the plus sheet for plus and the bear panel for the bear", () => {
    expect(HomeTargets_forBoard("plus", false)).to.deep.equal({ kind: "modal", name: "plusSheetModal" });
    expect(HomeTargets_forBoard("bear", false)).to.deep.equal({ kind: "modal", name: "bearPanelModal" });
  });

  it("opens the modals for the plus, bear panel and phone objects", () => {
    expect(HomeTargets_forHouse({ kind: "plus" }, false, false)).to.deep.equal({
      kind: "modal",
      name: "plusSheetModal",
    });
    expect(HomeTargets_forHouse({ kind: "bearPanel" }, false, false)).to.deep.equal({
      kind: "modal",
      name: "bearPanelModal",
    });
    expect(HomeTargets_forHouse({ kind: "phone" }, false, false)).to.deep.equal({
      kind: "modal",
      name: "phoneSheetModal",
    });
  });

  it("opens the screen and tab the object names", () => {
    expect(HomeTargets_forHouse({ kind: "screen", screen: "food", tab: "food" }, false, false)).to.deep.equal({
      kind: "screen",
      screen: "food",
      tab: "food",
    });
  });

  it("the door resumes a running workout, else checks the bag, else picks", () => {
    expect(HomeTargets_forHouse({ kind: "door" }, true, true)).to.deep.equal({ kind: "workout", action: "resume" });
    expect(HomeTargets_forHouse({ kind: "door" }, true, false)).to.deep.equal({ kind: "workout", action: "bagCheck" });
    expect(HomeTargets_forHouse({ kind: "door" }, false, false)).to.deep.equal({ kind: "workout", action: "pick" });
  });
});
