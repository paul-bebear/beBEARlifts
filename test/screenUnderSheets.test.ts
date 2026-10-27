import "mocha";
import { expect } from "chai";
import { INavRouteLike, INavStateLike, ScreenUnderSheets_isShown } from "../src/models/screenUnderSheets";

const fullScreen = ["onboarding", "mainTabs", "subscription"];

function homeStack(...names: string[]): INavRouteLike {
  return {
    key: "home-tab",
    name: "home",
    state: { index: names.length - 1, routes: names.map((name) => ({ key: `${name}-key`, name })) },
  };
}

function tabs(index: number, home: INavRouteLike): INavRouteLike {
  return {
    key: "tabs",
    name: "mainTabs",
    state: { index, routes: [home, { key: "food-tab", name: "food" }] },
  };
}

function root(index: number, ...routes: INavRouteLike[]): INavStateLike {
  return { index, routes };
}

describe("ScreenUnderSheets", () => {
  it("shows the house when it is the focused screen", () => {
    expect(ScreenUnderSheets_isShown(root(0, tabs(0, homeStack("main"))), "main-key", fullScreen)).to.equal(true);
  });

  it("keeps the house shown while a sheet or a modal covers part of it", () => {
    const state = root(
      2,
      tabs(0, homeStack("main")),
      { key: "phone", name: "phoneSheetModal" },
      { key: "calendar", name: "monthCalendarModal" }
    );
    expect(ScreenUnderSheets_isShown(state, "main-key", fullScreen)).to.equal(true);
  });

  it("hides the house under a pushed screen, another tab or a full-screen root route", () => {
    expect(ScreenUnderSheets_isShown(root(0, tabs(0, homeStack("main", "settings"))), "main-key", fullScreen)).to.equal(
      false
    );
    expect(ScreenUnderSheets_isShown(root(0, tabs(1, homeStack("main"))), "main-key", fullScreen)).to.equal(false);
    const subscription = root(1, tabs(0, homeStack("main")), { key: "sub", name: "subscription" });
    expect(ScreenUnderSheets_isShown(subscription, "main-key", fullScreen)).to.equal(false);
  });

  it("answers no before the navigator has a state", () => {
    expect(ScreenUnderSheets_isShown(undefined, "main-key", fullScreen)).to.equal(false);
  });
});
