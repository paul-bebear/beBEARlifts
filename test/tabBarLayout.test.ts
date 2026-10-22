import "mocha";
import { expect } from "chai";
import {
  TabBarLayout_compute,
  TabBarLayout_contentPadding,
  TabBarLayout_coveredBottom,
  TabBarLayout_keyboardOccluded,
  TabBarLayout_scrollPadding,
} from "../src/models/tabBarLayout";

describe("TabBarLayout", () => {
  it("floats the pill on the home indicator inset", () => {
    expect(TabBarLayout_compute(34)).to.deep.equal({ pillHeight: 60, bottomGap: 34, height: 94 });
  });

  it("keeps a gap under the pill when there is no inset", () => {
    expect(TabBarLayout_compute(0)).to.deep.equal({ pillHeight: 60, bottomGap: 12, height: 72 });
  });

  it("pads scroll content past the bar", () => {
    expect(TabBarLayout_contentPadding(94)).to.equal(110);
    expect(TabBarLayout_contentPadding(94)).to.be.greaterThan(TabBarLayout_compute(34).height);
  });

  it("adds no padding while the bar is hidden", () => {
    expect(TabBarLayout_contentPadding(0)).to.equal(0);
    expect(TabBarLayout_scrollPadding({ tabBarHeight: 0, footerHeight: 50 })).to.equal(50);
  });

  it("stacks a screen footer on top of the bar", () => {
    expect(TabBarLayout_scrollPadding({ tabBarHeight: 94, footerHeight: 50 })).to.equal(160);
    expect(TabBarLayout_coveredBottom({ tabBarHeight: 94, footerHeight: 50 })).to.equal(144);
  });

  it("counts only the bar and the footer while no keyboard is up", () => {
    const occluded = TabBarLayout_keyboardOccluded({
      coveredBottom: 134,
      tabBarHeight: 94,
      keypadHeight: 0,
      systemKeyboardHeight: 0,
    });
    expect(occluded).to.equal(134);
  });

  it("ignores a keyboard shorter than the bar", () => {
    const occluded = TabBarLayout_keyboardOccluded({
      coveredBottom: 134,
      tabBarHeight: 94,
      keypadHeight: 60,
      systemKeyboardHeight: 0,
    });
    expect(occluded).to.equal(134);
  });

  it("lifts the footer by the part of the keyboard above the bar", () => {
    const keypad = TabBarLayout_keyboardOccluded({
      coveredBottom: 134,
      tabBarHeight: 94,
      keypadHeight: 300,
      systemKeyboardHeight: 0,
    });
    expect(keypad).to.equal(40 + 300);
    const system = TabBarLayout_keyboardOccluded({
      coveredBottom: 134,
      tabBarHeight: 94,
      keypadHeight: 0,
      systemKeyboardHeight: 336,
    });
    expect(system).to.equal(40 + 336);
  });
});
