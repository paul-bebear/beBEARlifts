import "mocha";
import { expect } from "chai";
import {
  HouseFrame_canvas,
  HouseFrame_fit,
  HouseFrame_gymArt,
  HouseFrame_oldTop,
  HouseFrame_safeRect,
  HouseFrame_statusBarStyle,
  HouseFrame_tall,
} from "../src/models/houseFrame";
import {
  BearHouse_art,
  BearHouse_gymExit,
  BearHouse_gymWallColor,
  BearHouse_objects,
  BearHouse_wallColor,
  IBearHouseTier,
} from "../src/models/bearHouse";
import { BearScene_gymArt, IBearRect } from "../src/models/bearScene";

const iPhone = { width: 393, height: 852 };
const iPhoneInsets = { top: 59, bottom: 34 };
const iPhoneSe = { width: 375, height: 667 };
const iPad = { width: 820, height: 1180 };
const tiers: IBearHouseTier[] = ["trailer", "apartment", "loft", "mansion", "spaceship", "moon", "mars"];
const sources = {
  kcal: 0,
  kcalTarget: 0,
  hasNoteToday: false,
  streak: 0,
  friendCount: 1,
  pendingRequests: 0,
  honeyEarned: 0,
  badgeCount: 0,
  isOffline: true,
};

function inside(rect: IBearRect, safe: IBearRect): boolean {
  return rect[0] >= safe[0] && rect[1] >= safe[1] && rect[2] <= safe[2] && rect[3] <= safe[3];
}

describe("HouseFrame", () => {
  it("fills an iPhone 16 Pro at the screen width and cuts 32 pt of ceiling", () => {
    const fit = HouseFrame_fit(iPhone);
    expect(fit.scale).to.be.closeTo(0.3838, 0.0001);
    expect(fit.width).to.equal(393);
    expect(fit.height).to.be.closeTo(884.3, 0.1);
    expect(fit.left).to.equal(0);
    expect(fit.top).to.be.closeTo(-32.3, 0.1);
    expect(fit.sideColorWidth).to.equal(0);
  });

  it("cuts 177 pt on an iPhone SE: the whole 164 pt ceiling, then 13 pt of floor", () => {
    const fit = HouseFrame_fit(iPhoneSe);
    expect(fit.scale).to.be.closeTo(375 / 1024, 0.0001);
    expect(fit.height - iPhoneSe.height).to.be.closeTo(176.8, 0.1);
    expect(fit.top).to.be.closeTo(-HouseFrame_oldTop * fit.scale, 0.1);
    expect(fit.top + fit.height - iPhoneSe.height).to.be.closeTo(12.7, 0.1);
  });

  it("keeps the old picture whole on an iPad and fills 17 pt of each side with the wall colour", () => {
    const fit = HouseFrame_fit(iPad);
    expect(fit.scale).to.be.closeTo(1180 / 1536, 0.0001);
    expect(fit.sideColorWidth).to.be.closeTo(16.7, 0.1);
    expect(fit.left).to.equal(fit.sideColorWidth);
    const oldTop = fit.top + HouseFrame_oldTop * fit.scale;
    expect(oldTop).to.be.closeTo(0, 0.1);
    expect(oldTop + 1536 * fit.scale).to.be.closeTo(1180, 0.1);
  });

  it("cuts the floor only after the whole ceiling is gone", () => {
    const fit = HouseFrame_fit({ width: 1024, height: 1536 });
    expect(fit.top).to.equal(-HouseFrame_oldTop);
    expect(fit.height + fit.top).to.equal(HouseFrame_canvas.height - HouseFrame_oldTop);
  });

  it("centres the art on a screen taller than the whole canvas", () => {
    const fit = HouseFrame_fit({ width: 100, height: 300 });
    expect(fit.height).to.equal(225);
    expect(fit.top).to.equal(37.5);
  });

  it("returns the canvas rows between the status bar and the home indicator", () => {
    const fit = HouseFrame_fit(iPhone);
    const safe = HouseFrame_safeRect(fit, iPhone, iPhoneInsets);
    expect(safe[0]).to.equal(0);
    expect(safe[2]).to.equal(1024);
    expect(safe[1]).to.be.closeTo((59 + 32.3) / fit.scale, 0.5);
    expect(safe[3]).to.be.closeTo((852 - 34 + 32.3) / fit.scale, 0.5);
  });

  it("keeps every object, the board, the bear's feet and the gym exit inside the safe area on an iPhone", () => {
    const safe = HouseFrame_safeRect(HouseFrame_fit(iPhone), iPhone, iPhoneInsets);
    for (const tier of tiers) {
      for (const object of BearHouse_objects(tier, 1000, sources, undefined)) {
        expect(inside(object.rect, safe), `${tier} ${object.id}`).to.equal(true);
        if (object.id !== "whiteboard") {
          expect(object.pillAt.y, `${tier} ${object.id} pill`).to.be.within(safe[1], safe[3]);
        }
      }
    }
    expect(inside(BearHouse_art.board, safe)).to.equal(true);
    expect(BearHouse_art.foot.y).to.be.within(safe[1], safe[3]);
    expect(inside(BearHouse_gymExit("/images/bear/gyms/garage.webp").rect, safe)).to.equal(true);
    expect(inside(HouseFrame_gymArt.board, safe)).to.equal(true);
  });

  it("picks the status bar text that reads best on the ceiling", () => {
    expect(HouseFrame_statusBarStyle(BearHouse_wallColor("trailer"))).to.equal("light-content");
    expect(HouseFrame_statusBarStyle(BearHouse_gymWallColor("/images/bear/gyms/trailer-park.webp"))).to.equal(
      "dark-content"
    );
    expect(HouseFrame_statusBarStyle("#000000")).to.equal("light-content");
    expect(HouseFrame_statusBarStyle("#ffffff")).to.equal("dark-content");
  });

  it("moves the gym's anchors 448 rows down onto the tall canvas", () => {
    expect(HouseFrame_tall(BearScene_gymArt)).to.deep.equal({
      canvas: { width: 1024, height: 2304 },
      foot: { x: 512, y: 1938 },
      minHeightShare: BearScene_gymArt.minHeightShare,
      board: [125, 643, 825, 1123],
      inkBottom: 1041,
    });
    expect(BearHouse_art.canvas).to.deep.equal(HouseFrame_canvas);
    expect(BearHouse_art.board).to.deep.equal(HouseFrame_gymArt.board);
    expect(BearHouse_art.inkBottom).to.equal(HouseFrame_gymArt.inkBottom);
  });
});
