import "mocha";
import { expect } from "chai";
import {
  TabRouting_isProgramScreen,
  TabRouting_programTab,
  TabRouting_resetRoutes,
  TabRouting_shouldReset,
  TabRouting_showsBack,
  TabRouting_tabForScreen,
} from "../src/models/tabRouting";
import type { IScreen } from "../src/models/screen";

const programScreens: IScreen[] = ["programs", "editProgram", "programPreview", "onerms", "programselect"];

describe("TabRouting", () => {
  it("leaves onboarding with a dashboard back route when opening any program screen offline", () => {
    for (const screen of programScreens) {
      expect(TabRouting_shouldReset(screen, undefined, true, true)).to.equal(true);
      expect(TabRouting_shouldReset(screen, undefined, true, false)).to.equal(false);
      expect(TabRouting_shouldReset(screen, undefined, false, true)).to.equal(false);
      expect(TabRouting_resetRoutes("graphs", screen, undefined, true).map((route) => route.name)).to.deep.equal([
        "progressDashboard",
        screen,
      ]);
    }
  });

  it("keeps non-program onboarding steps and explicit tab resets unchanged", () => {
    expect(TabRouting_shouldReset("units", undefined, true, true)).to.equal(false);
    expect(TabRouting_shouldReset("main", "home", false, false)).to.equal(true);
    expect(TabRouting_shouldReset("main", "home", false, true)).to.equal(true);
  });

  it("opens the program from the Progress tab in the offline build and from the Program tab upstream", () => {
    expect(TabRouting_programTab(true)).to.equal("graphs");
    expect(TabRouting_programTab(false)).to.equal("program");
  });

  it("sends every program screen to the Progress tab offline, whatever tab the user is on", () => {
    for (const screen of programScreens) {
      expect(TabRouting_isProgramScreen(screen)).to.equal(true);
      expect(TabRouting_tabForScreen(screen, "home", true)).to.equal("graphs");
      expect(TabRouting_tabForScreen(screen, "friends", true)).to.equal("graphs");
      expect(TabRouting_tabForScreen(screen, "food", true)).to.equal("graphs");
      expect(TabRouting_tabForScreen(screen, "program", true)).to.equal("graphs");
      expect(TabRouting_tabForScreen(screen, undefined, true)).to.equal("graphs");
    }
  });

  it("keeps the upstream routing: the current tab wins, then the screen's own tab", () => {
    expect(TabRouting_tabForScreen("programs", "home", false)).to.equal("home");
    expect(TabRouting_tabForScreen("programs", undefined, false)).to.equal("program");
    expect(TabRouting_tabForScreen("editProgram", "graphs", false)).to.equal("graphs");
  });

  it("keeps other screens on the current tab offline", () => {
    expect(TabRouting_isProgramScreen("main")).to.equal(false);
    expect(TabRouting_tabForScreen("settings", "graphs", true)).to.equal("graphs");
    expect(TabRouting_tabForScreen("food", "home", true)).to.equal("home");
    expect(TabRouting_tabForScreen("main", undefined, true)).to.equal("home");
  });

  it("puts the friends screen on the friends tab", () => {
    expect(TabRouting_tabForScreen("friends", undefined, true)).to.equal("friends");
  });

  it("stacks a program screen on the dashboard so it has a back arrow", () => {
    expect(TabRouting_resetRoutes("graphs", "editProgram", { programId: "p1" }, true)).to.deep.equal([
      { name: "progressDashboard" },
      { name: "editProgram", params: { programId: "p1" } },
    ]);
    expect(TabRouting_resetRoutes("graphs", "programs", undefined, true)).to.deep.equal([
      { name: "progressDashboard" },
      { name: "programs", params: undefined },
    ]);
  });

  it("leaves every other reset as a single route", () => {
    expect(TabRouting_resetRoutes("graphs", "music", undefined, true)).to.deep.equal([
      { name: "music", params: undefined },
    ]);
    expect(TabRouting_resetRoutes("graphs", "progressDashboard", undefined, true)).to.deep.equal([
      { name: "progressDashboard", params: undefined },
    ]);
    expect(TabRouting_resetRoutes("program", "editProgram", { programId: "p1" }, false)).to.deep.equal([
      { name: "editProgram", params: { programId: "p1" } },
    ]);
    expect(TabRouting_resetRoutes("graphs", "editProgram", { programId: "p1" }, false)).to.deep.equal([
      { name: "editProgram", params: { programId: "p1" } },
    ]);
  });

  it("stacks History on Journal so it has a back arrow, online and offline", () => {
    for (const offline of [true, false]) {
      expect(TabRouting_resetRoutes("food", "history", undefined, offline)).to.deep.equal([
        { name: "food" },
        { name: "history", params: undefined },
      ]);
    }
  });

  it("draws the back chevron at the root of every tab but home, so it leads home", () => {
    const root = { hasStackBack: false, isTabRoot: true, hasLeftButtons: false };
    expect(TabRouting_showsBack({ ...root, routeName: "food" })).to.equal(true);
    expect(TabRouting_showsBack({ ...root, routeName: "settings" })).to.equal(true);
    expect(TabRouting_showsBack({ ...root, routeName: "main" })).to.equal(false);
  });

  it("keeps the workout's own Close button and the onboarding roots without a chevron", () => {
    expect(
      TabRouting_showsBack({ hasStackBack: false, isTabRoot: true, routeName: "progress", hasLeftButtons: true })
    ).to.equal(false);
    expect(
      TabRouting_showsBack({ hasStackBack: false, isTabRoot: false, routeName: "first", hasLeftButtons: false })
    ).to.equal(false);
    expect(
      TabRouting_showsBack({ hasStackBack: true, isTabRoot: false, routeName: "progress", hasLeftButtons: false })
    ).to.equal(true);
  });

  it("opens a workout record on the Journal tab when Journal or History opens it", () => {
    expect(TabRouting_shouldReset("progress", undefined, false, true)).to.equal(false);
    expect(TabRouting_tabForScreen("progress", "food", true)).to.equal("food");
  });
});
