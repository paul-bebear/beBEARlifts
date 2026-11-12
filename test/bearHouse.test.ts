import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  BearHouse_art,
  BearHouse_bowlImage,
  BearHouse_box,
  BearHouse_doorLabel,
  BearHouse_gymExit,
  BearHouse_gymWallColor,
  BearHouse_hitSlop,
  BearHouse_images,
  BearHouse_objects,
  BearHouse_pillLeft,
  BearHouse_pillWidth,
  BearHouse_room,
  BearHouse_sources,
  BearHouse_wallColor,
  IBearHouseObject,
  IBearHouseObjectId,
  IBearHouseSources,
} from "../src/models/bearHouse";
import { BearFullness_percent } from "../src/models/bearFullness";
import { FoodLog_dayKey, FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { HouseFrame_canvas } from "../src/models/houseFrame";
import { Weight_build } from "../src/models/weight";
import { IStats } from "../src/types";

const hourMs = 3600000;
const now = new Date(2026, 9, 26, 12).getTime();
const today = FoodLog_dayKey(new Date(now));
const cabinObjects: IBearHouseObjectId[] = [
  "whiteboard",
  "door",
  "bowl",
  "bed",
  "scale",
  "calendar",
  "phone",
  "mirror",
];

const empty: IBearHouseSources = { fullness: 0, dayOfMonth: 1, pendingRequests: 0, hasWorkout: false };

function cabin(sources: IBearHouseSources = empty, seen?: ReadonlySet<IBearHouseObjectId>): IBearHouseObject[] {
  return BearHouse_objects(sources, seen);
}

function byId(objects: IBearHouseObject[], id: IBearHouseObjectId): IBearHouseObject {
  return objects.find((o) => o.id === id)!;
}

function food(day: string, calories: number): IFoodEntry {
  return {
    id: `${day}-${calories}`,
    day,
    meal: "lunch",
    name: "Food",
    source: "manual",
    nutrients: { calories, protein: 0, carbs: 0, fat: 0 },
    createdAt: now,
  };
}

function stats(weights: { at: number; kg: number }[]): IStats {
  return {
    weight: { weight: weights.map((w) => ({ vtype: "stat", value: Weight_build(w.kg, "kg"), timestamp: w.at })) },
    length: {},
    percentage: {},
  };
}

describe("BearHouse", () => {
  it("draws exactly the eight cabin objects, all there from day 0", () => {
    const objects = cabin();
    expect(objects.map((o) => o.id)).to.have.members(cabinObjects);
    expect(objects).to.have.length(8);
    for (const object of objects) {
      expect(object, object.id).to.not.have.property("lock");
    }
  });

  it("gives every screen target a tab, because the home stack has none of these screens", () => {
    for (const object of cabin()) {
      if (object.target.kind === "screen") {
        expect(object.target.tab, object.id).to.be.a("string");
      }
    }
    expect(byId(cabin(), "mirror").target).to.deep.equal({ kind: "screen", screen: "progressPhotos", tab: "graphs" });
    expect(byId(cabin(), "scale").target).to.deep.equal({ kind: "screen", screen: "stats", tab: "graphs" });
  });

  it("opens the food day page from the bowl and the Calendar page from the wall calendar, both in the food tab", () => {
    expect(byId(cabin(), "bowl").target).to.deep.equal({ kind: "screen", screen: "foodDay", tab: "food" });
    expect(byId(cabin(), "calendar").target).to.deep.equal({ kind: "screen", screen: "food", tab: "food" });
  });

  it("gives every object a label and a target", () => {
    const summary = Object.fromEntries(cabin().map((o) => [o.id, [o.label, o.target.kind]]));
    expect(summary).to.deep.equal({
      whiteboard: ["To-do", "plus"],
      door: ["Gym", "door"],
      bowl: ["Food", "screen"],
      bed: ["Bed", "bearPanel"],
      scale: ["Scale", "screen"],
      calendar: ["Calendar", "screen"],
      phone: ["Phone", "phone"],
      mirror: ["Mirror", "screen"],
    });
  });

  it("draws only the Weigh in pill on an empty day, and none once there is a weight", () => {
    expect(
      cabin()
        .filter((o) => o.pill != null)
        .map((o) => [o.id, o.pill])
    ).to.deep.equal([["scale", "Weigh in"]]);
    expect(cabin({ ...empty, weight: "72.4" }).filter((o) => o.pill != null)).to.deep.equal([]);
  });

  it("paints the door into the room and opens the running workout from it", () => {
    const idle = byId(cabin(), "door");
    expect(idle.image).to.equal(undefined);
    expect(idle.isPainted).to.equal(true);
    expect(idle.label).to.equal(BearHouse_doorLabel.gym);
    expect(idle.pill).to.equal(undefined);
    expect(idle.rect).to.deep.equal([20, 896, 250, 1592]);
    const running = byId(cabin({ ...empty, hasWorkout: true }), "door");
    expect(running.label).to.equal("Back to workout");
    expect(running.pill).to.equal("Back to workout");
    expect(running.target).to.deep.equal({ kind: "door" });
  });

  it("keeps the whiteboard in the room picture, with no sprite and no tap area of its own", () => {
    const board = byId(cabin(), "whiteboard");
    expect(board.image).to.equal(undefined);
    expect(board.isPainted).to.equal(false);
    expect(board.rect).to.deep.equal([32, 190, 992, 650]);
  });

  it("shows the day of the month on the calendar, the weight on the scale and the requests on the phone", () => {
    const objects = cabin({ ...empty, dayOfMonth: 22, pendingRequests: 2, weight: "72.4" });
    expect(byId(objects, "calendar").overlay?.text).to.equal("22");
    expect(byId(objects, "phone").overlay?.text).to.equal("2");
    expect(byId(objects, "scale").overlay?.text).to.equal("72.4");
    expect(byId(cabin(), "phone").overlay).to.equal(undefined);
  });

  it("always shows the date on the calendar and never a streak", () => {
    expect(byId(cabin(), "calendar").overlay?.text).to.equal("1");
    expect(byId(cabin({ ...empty, dayOfMonth: 31 }), "calendar").overlay?.text).to.equal("31");
    expect(byId(cabin(), "calendar").overlay?.kind).to.equal("number");
  });

  it("picks one of five bowl files by the fullness percent", () => {
    const bowl = (fullness: number): string => BearHouse_bowlImage({ ...empty, fullness });
    expect(bowl(0)).to.equal("bowl-empty");
    expect(bowl(9.9)).to.equal("bowl-empty");
    expect(bowl(10)).to.equal("bowl-quarter");
    expect(bowl(39.9)).to.equal("bowl-quarter");
    expect(bowl(40)).to.equal("bowl-half");
    expect(bowl(64.9)).to.equal("bowl-half");
    expect(bowl(65)).to.equal("bowl-three-quarter");
    expect(bowl(89.9)).to.equal("bowl-three-quarter");
    expect(bowl(90)).to.equal("bowl-full");
    expect(bowl(100)).to.equal("bowl-full");
    expect(byId(cabin({ ...empty, fullness: 53.6 }), "bowl").image).to.equal("/images/bear/house/bowl-half.webp");
  });

  it("fills the bowl from the same percent that sets the bear's fullness", () => {
    const base = FoodLog_empty();
    const foodLog = { ...base, entries: [food(today, 840)], goals: { ...base.goals, calories: { min: 0, max: 2800 } } };
    const sources = BearHouse_sources({
      foodLog,
      stats: stats([]),
      units: "kg",
      pendingRequests: 0,
      hasWorkout: false,
      now,
    });
    expect(sources.fullness).to.equal(BearFullness_percent(foodLog, now));
    expect(sources.fullness).to.equal(30);
    expect(BearHouse_bowlImage(sources)).to.equal("bowl-quarter");
  });

  it("draws the bed and the phone from their own files, with no tier to pick from", () => {
    expect(byId(cabin(), "bed").image).to.equal("/images/bear/house/bed.webp");
    expect(byId(cabin(), "phone").image).to.equal("/images/bear/house/phone.webp");
  });

  it("marks objects new only when the seen flags are kept, and never the whiteboard", () => {
    expect(cabin().some((o) => o.isNew)).to.equal(false);
    const seen = new Set<IBearHouseObjectId>(cabinObjects.filter((id) => id !== "mirror"));
    const objects = cabin(empty, seen);
    expect(objects.filter((o) => o.isNew).map((o) => o.id)).to.deep.equal(["mirror"]);
    expect(byId(objects, "mirror").pill).to.equal("New");
    expect(byId(cabin(empty, new Set()), "whiteboard").isNew).to.equal(false);
  });

  it("puts the calendar, mirror and door behind the bear, and the rest in front", () => {
    const layers = Object.fromEntries(cabin().map((o) => [o.id, o.layer]));
    expect(layers).to.deep.equal({
      whiteboard: "front",
      door: "back",
      bowl: "front",
      bed: "front",
      scale: "front",
      calendar: "back",
      phone: "front",
      mirror: "back",
    });
  });

  it("lays the phone on the bed and draws it after the bed", () => {
    const objects = cabin();
    const bed = byId(objects, "bed").rect;
    const phone = byId(objects, "phone").rect;
    expect(phone[0]).to.be.at.least(bed[0]);
    expect(phone[2]).to.be.at.most(bed[2]);
    expect(phone[1]).to.be.at.least(bed[1]);
    expect(phone[3]).to.be.at.most(bed[3]);
    expect(objects.indexOf(byId(objects, "phone"))).to.be.above(objects.indexOf(byId(objects, "bed")));
  });

  it("keeps every object inside the canvas, and the bowl and the scale whole above row 2222", () => {
    for (const object of cabin()) {
      const [x1, y1, x2, y2] = object.rect;
      expect(x1, object.id).to.be.at.least(0);
      expect(y1, object.id).to.be.at.least(0);
      expect(x2, object.id).to.be.at.most(1024);
      expect(y2, object.id).to.be.at.most(HouseFrame_canvas.height);
      expect(x2 - x1, object.id).to.be.above(0);
    }
    expect(byId(cabin(), "bowl").rect[3]).to.be.at.most(2222);
    expect(byId(cabin(), "scale").rect[3]).to.be.at.most(2222);
  });

  it("stands each sprite on its slot and keeps its own shape", () => {
    const slots: Record<string, number[]> = {
      calendar: [65, 700, 217, 867],
      mirror: [767, 907, 995, 1417],
      bed: [700, 1556, 1024, 2246],
      phone: [856, 1661, 982, 1741],
      bowl: [37, 1975, 370, 2190],
      scale: [454, 2002, 843, 2190],
    };
    for (const [id, slot] of Object.entries(slots)) {
      const rect = byId(cabin(), id as IBearHouseObjectId).rect;
      expect(rect[0], id).to.be.at.least(slot[0] - 0.1);
      expect(rect[1], id).to.be.at.least(slot[1] - 0.1);
      expect(rect[2], id).to.be.at.most(slot[2] + 0.1);
      expect(rect[3], id).to.equal(slot[3]);
    }
  });

  it("grows the phone's tap area to 44 points at every phone width", () => {
    for (const width of [343, 390, 430]) {
      const box = BearHouse_box(byId(cabin(), "phone").rect, width / 1024);
      const slop = BearHouse_hitSlop(box);
      expect(box.width + slop.left + slop.right, `${width} wide`).to.be.at.least(44);
      expect(box.height + slop.top + slop.bottom, `${width} high`).to.be.at.least(44);
    }
  });

  it("gives the room the cabin wall, the whiteboard and the bear's foot line", () => {
    expect(BearHouse_wallColor()).to.equal("#EBD2C0");
    expect(BearHouse_room()).to.equal("/images/bear/house/room-cabin.webp");
    expect(BearHouse_art.canvas).to.deep.equal({ width: 1024, height: 2304 });
    expect(BearHouse_art.board).to.deep.equal([32, 190, 992, 650]);
    expect(BearHouse_art.foot).to.deep.equal({ x: 512, y: 1620 });
    expect(BearHouse_art.inkBottom).to.equal(650);
  });

  it("gives every gym a wall colour and keeps the gym exit door", () => {
    const gyms = fs
      .readdirSync(path.join(__dirname, "..", "images", "bear", "gyms"))
      .filter((f) => f.endsWith(".webp"));
    expect(gyms.length).to.be.above(0);
    for (const gym of gyms) {
      expect(BearHouse_gymWallColor(`/images/bear/gyms/${gym}`), gym).to.match(/^#[0-9a-f]{6}$/);
    }
    expect(BearHouse_gymWallColor("/images/bear/gyms/garage.webp")).to.equal("#532b11");
    expect(BearHouse_gymExit("/images/bear/gyms/garage.webp").image).to.equal("/images/bear/house/door-exit-gym.webp");
    expect(BearHouse_gymExit("/images/bear/gyms/moon.webp").image).to.equal("/images/bear/house/door-exit-space.webp");
  });

  it("ships every image the house draws", () => {
    for (const image of BearHouse_images) {
      expect(fs.existsSync(path.join(__dirname, "..", image)), image).to.equal(true);
    }
  });

  it("builds the sources from today's food, weight, date and the running workout", () => {
    const base = FoodLog_empty();
    const foodLog = { ...base, entries: [food(today, 900)], goals: { ...base.goals, calories: { min: 0, max: 2800 } } };
    const sources = BearHouse_sources({
      foodLog,
      stats: stats([{ at: now - hourMs, kg: 72.4 }]),
      units: "kg",
      pendingRequests: 1,
      hasWorkout: true,
      now,
    });
    expect(sources).to.deep.equal({
      fullness: (100 * 900) / 2800,
      weight: "72.4",
      dayOfMonth: new Date(now).getDate(),
      pendingRequests: 1,
      hasWorkout: true,
    });
  });

  it("sizes the hit area and the pill position", () => {
    expect(BearHouse_hitSlop({ left: 0, top: 0, width: 30, height: 50 })).to.deep.equal({
      top: 0,
      bottom: 0,
      left: 7,
      right: 7,
    });
    expect(BearHouse_pillLeft(10, 100, 390)).to.equal(4);
    expect(BearHouse_pillLeft(380, 100, 390)).to.equal(286);
    expect(BearHouse_pillLeft(195, 100, 390)).to.equal(145);
    expect(BearHouse_pillWidth("Food", 10)).to.equal(40);
  });
});
