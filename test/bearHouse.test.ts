import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  BearHouse_activeDays,
  BearHouse_gymExit,
  BearHouse_hitSlop,
  BearHouse_images,
  BearHouse_lockLine,
  BearHouse_objects,
  BearHouse_padlock,
  BearHouse_pillLeft,
  BearHouse_pillWidth,
  BearHouse_sources,
  BearHouse_tap,
  IBearHouseObject,
  IBearHouseObjectId,
  IBearHouseSources,
  IBearHouseTier,
} from "../src/models/bearHouse";
import { FoodLog_dayKey, FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import { Notes_empty, Notes_new, Notes_save } from "../src/models/notes";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, IStats } from "../src/types";

const hourMs = 3600000;
const dayMs = 24 * hourMs;
const now = new Date(2026, 9, 26, 12).getTime();
const today = FoodLog_dayKey(new Date(now));
const tiers: IBearHouseTier[] = ["trailer", "apartment", "loft", "mansion", "spaceship", "moon", "mars"];
const dayZeroOpen: IBearHouseObjectId[] = ["whiteboard", "door", "bowl", "bed", "notebook", "tv", "passport", "scale"];

const empty: IBearHouseSources = {
  kcal: 0,
  kcalTarget: 0,
  hasNoteToday: false,
  streak: 0,
  friendCount: 0,
  pendingRequests: 0,
  honeyEarned: 0,
  badgeCount: 0,
  isOffline: true,
};

function byId(objects: IBearHouseObject[], id: IBearHouseObjectId): IBearHouseObject {
  return objects.find((o) => o.id === id)!;
}

function record(startTime: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id: startTime,
    date: new Date(startTime).toISOString(),
    startTime,
    endTime: startTime + hourMs,
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Upper",
    entries: [],
  };
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
  it("opens exactly the eight day-0 objects and locks every later one at 0 active days", () => {
    const objects = BearHouse_objects("trailer", 0, empty, undefined);
    const open = objects.filter((o) => o.lock == null).map((o) => o.id);
    expect(open).to.have.members(dayZeroOpen);
    expect(open).to.have.length(8);
    for (const object of objects.filter((o) => !dayZeroOpen.includes(o.id))) {
      expect(object.lock, object.id).to.not.equal(undefined);
      expect(object.lock!.toGo).to.equal(object.lock!.atDays);
    }
  });

  it("gives every object a label and a target, and every open one a pill", () => {
    for (const object of BearHouse_objects("trailer", 0, empty, undefined)) {
      expect(object.label, object.id).to.not.equal("");
      expect(object.target.kind, object.id).to.be.a("string");
      if (object.lock == null) {
        expect(object.pill, object.id).to.not.equal("");
      }
    }
  });

  it("labels and targets the day-0 room like the picked mockup", () => {
    const objects = BearHouse_objects("trailer", 0, empty, undefined);
    const summary = Object.fromEntries(objects.map((o) => [o.id, [o.label, o.target.kind]]));
    expect(summary).to.deep.include({
      whiteboard: ["To-do", "plus"],
      door: ["Gym", "door"],
      bowl: ["Food", "journal"],
      bed: ["Bed", "bearPanel"],
      notebook: ["Journal", "journal"],
      tv: ["TV", "addFriend"],
      passport: ["Passport", "line"],
      scale: ["Scale", "screen"],
      calendar: ["Calendar", "monthCalendar"],
      boombox: ["Music", "screen"],
      phone: ["Friends", "addFriend"],
      honey: ["Honey", "honey"],
      shelf: ["Trophies", "screen"],
      wardrobe: ["Wardrobe", "honey"],
      mirror: ["Mirror", "screen"],
    });
  });

  it("opens each arrival on its day and counts the days left before it", () => {
    const at = (days: number): IBearHouseObject[] => BearHouse_objects("trailer", days, empty, undefined);
    expect(byId(at(2), "calendar").lock).to.deep.equal({ atDays: 3, toGo: 1 });
    expect(byId(at(3), "calendar").lock).to.equal(undefined);
    expect(byId(at(6), "phone").lock).to.deep.equal({ atDays: 7, toGo: 1 });
    expect(byId(at(13), "honey").lock).to.deep.equal({ atDays: 14, toGo: 1 });
    expect(byId(at(30), "shelf").lock).to.equal(undefined);
    expect(byId(at(30), "wardrobe").lock).to.equal(undefined);
    expect(byId(at(99), "mirror").lock).to.deep.equal({ atDays: 100, toGo: 1 });
    expect(at(100).every((o) => o.lock == null)).to.equal(true);
    expect(BearHouse_lockLine({ atDays: 3, toGo: 2 })).to.equal("Opens at 3 active days · 2 to go");
  });

  it("drops the padlocked object's state overlay and keeps it on open ones", () => {
    const sources = { ...empty, streak: 4, pendingRequests: 2 };
    expect(byId(BearHouse_objects("trailer", 0, sources, undefined), "calendar").overlay).to.equal(undefined);
    expect(byId(BearHouse_objects("trailer", 7, sources, undefined), "calendar").overlay?.text).to.equal("4");
    expect(byId(BearHouse_objects("trailer", 7, sources, undefined), "phone").overlay?.kind).to.equal("badge");
  });

  it("draws the music boombox only in the offline build", () => {
    const ids = (isOffline: boolean): IBearHouseObjectId[] =>
      BearHouse_objects("trailer", 0, { ...empty, isOffline }, undefined).map((o) => o.id);
    expect(ids(true)).to.include("boombox");
    expect(ids(false)).to.not.include("boombox");
  });

  it("fills the bowl by the share of the kcal target", () => {
    const bowl = (kcal: number, kcalTarget: number): string | undefined =>
      byId(BearHouse_objects("trailer", 0, { ...empty, kcal, kcalTarget }, undefined), "bowl").image;
    expect(bowl(0, 2800)).to.equal("/images/bear/house/bowl-empty.webp");
    expect(bowl(699, 2800)).to.equal("/images/bear/house/bowl-empty.webp");
    expect(bowl(700, 2800)).to.equal("/images/bear/house/bowl-half.webp");
    expect(bowl(2100, 2800)).to.equal("/images/bear/house/bowl-half.webp");
    expect(bowl(2101, 2800)).to.equal("/images/bear/house/bowl-full.webp");
    expect(bowl(500, 0)).to.equal("/images/bear/house/bowl-full.webp");
  });

  it("switches the TV from Add a friend to the feed once there is a friend", () => {
    const tv = (friendCount: number): IBearHouseObject =>
      byId(BearHouse_objects("trailer", 0, { ...empty, friendCount }, undefined), "tv");
    expect(tv(0).pill).to.equal("No friends yet");
    expect(tv(0).target).to.deep.equal({ kind: "addFriend" });
    expect(tv(1).pill).to.equal("TV");
    expect(tv(1).target).to.deep.equal({ kind: "screen", screen: "friends", tab: "friends" });
    expect(tv(1).overlay?.kind).to.equal("tv");
  });

  it("shows the latest weight on the scale and asks for a weigh-in without one", () => {
    const scale = (weight?: string): IBearHouseObject =>
      byId(BearHouse_objects("trailer", 0, { ...empty, weight }, undefined), "scale");
    expect(scale().pill).to.equal("Weigh in");
    expect(scale().overlay).to.equal(undefined);
    expect(scale("72.4").pill).to.equal("Scale");
    expect(scale("72.4").overlay?.text).to.equal("72.4");
  });

  it("picks the TV, bed, honey jar and shelf art from the tier and the counts", () => {
    const image = (tier: IBearHouseTier, id: IBearHouseObjectId, sources = empty): string | undefined =>
      byId(BearHouse_objects(tier, 1000, sources, undefined), id).image;
    expect(image("apartment", "tv")).to.equal("/images/bear/house/tv-crt.webp");
    expect(image("loft", "tv")).to.equal("/images/bear/house/tv-flat-small.webp");
    expect(image("mansion", "tv")).to.equal("/images/bear/house/tv-flat-big.webp");
    expect(image("mars", "tv")).to.equal("/images/bear/house/tv-hologram.webp");
    expect(image("loft", "bed")).to.equal("/images/bear/house/bed-small.webp");
    expect(image("mansion", "bed")).to.equal("/images/bear/house/bed-big.webp");
    expect(image("trailer", "honey", { ...empty, honeyEarned: 49 })).to.equal("/images/bear/house/honey-jar-half.webp");
    expect(image("trailer", "honey", { ...empty, honeyEarned: 50 })).to.equal("/images/bear/house/honey-jar-full.webp");
    expect(image("trailer", "shelf", { ...empty, badgeCount: 9 })).to.equal(
      "/images/bear/house/trophy-shelf-some.webp"
    );
    expect(image("trailer", "shelf", { ...empty, badgeCount: 10 })).to.equal(
      "/images/bear/house/trophy-shelf-full.webp"
    );
    expect(image("trailer", "door")).to.equal("/images/bear/house/door-home-trailer.webp");
    expect(image("moon", "door")).to.equal("/images/bear/house/door-home-space.webp");
  });

  it("marks open objects new only when the seen flags are kept", () => {
    expect(BearHouse_objects("trailer", 0, empty, undefined).some((o) => o.isNew)).to.equal(false);
    const seen = new Set<IBearHouseObjectId>(dayZeroOpen);
    const objects = BearHouse_objects("trailer", 3, empty, seen);
    expect(objects.filter((o) => o.isNew).map((o) => o.id)).to.deep.equal(["calendar"]);
  });

  it("keeps every drawn object inside its room and standing on its slot", () => {
    for (const tier of tiers) {
      for (const object of BearHouse_objects(tier, 1000, { ...empty, friendCount: 1 }, undefined)) {
        const [x1, y1, x2, y2] = object.rect;
        expect(x1, `${tier} ${object.id}`).to.be.at.least(0);
        expect(y1).to.be.at.least(0);
        expect(x2).to.be.at.most(1024);
        expect(y2).to.be.at.most(1536);
        expect(x2 - x1).to.be.above(0);
      }
    }
    const exit = BearHouse_gymExit("/images/bear/gyms/garage.webp");
    expect(exit.image).to.equal("/images/bear/house/door-exit-gym.webp");
    expect(BearHouse_gymExit("/images/bear/gyms/moon.webp").image).to.equal("/images/bear/house/door-exit-space.webp");
  });

  it("ships every image the house draws", () => {
    for (const image of BearHouse_images) {
      expect(fs.existsSync(path.join(__dirname, "..", image)), image).to.equal(true);
    }
  });

  it("counts active days from counted workouts, food entries and weigh-ins, once per day", () => {
    const yesterday = now - dayMs;
    const days = BearHouse_activeDays({
      workouts: [{ record: record(now - 3 * dayMs), countedKg: 1000 }],
      foodLog: { entries: [food(today, 500), food(today, 300), food(FoodLog_dayKey(new Date(yesterday)), 200)] },
      stats: stats([
        { at: yesterday, kg: 70 },
        { at: now - 5 * dayMs, kg: 70 },
      ]),
    });
    expect(days).to.equal(4);
  });

  it("builds the sources from today's food, notes, weight and streak", () => {
    const base = FoodLog_empty();
    const foodLog = { ...base, entries: [food(today, 900)], goals: { ...base.goals, calories: { min: 0, max: 2800 } } };
    const note = { ...Notes_new("n1", today, now), body: "Felt strong" };
    const sources = BearHouse_sources({
      workouts: [],
      foodLog,
      stats: stats([{ at: now - hourMs, kg: 72.4 }]),
      notes: Notes_save(Notes_empty(), note, now),
      units: "kg",
      friendCount: 0,
      pendingRequests: 0,
      honeyEarned: 10,
      badgeCount: 1,
      isOffline: false,
      now,
    });
    expect(sources).to.deep.include({ kcal: 900, kcalTarget: 2800, hasNoteToday: true, weight: "72.4", streak: 1 });
  });

  it("answers a padlocked object and the passport with a line and opens the rest", () => {
    const objects = BearHouse_objects("trailer", 1, empty, undefined);
    expect(BearHouse_tap(byId(objects, "calendar"))).to.deep.equal({
      kind: "note",
      text: "Opens at 3 active days · 2 to go",
    });
    expect(BearHouse_tap(byId(objects, "passport"))).to.deep.equal({ kind: "note", text: "City stamps come soon" });
    expect(BearHouse_tap(byId(objects, "bed"))).to.deep.equal({ kind: "open", target: { kind: "bearPanel" } });
  });

  it("sizes the padlock, the hit area and the pill position", () => {
    const [x1, y1, x2, y2] = BearHouse_padlock([0, 0, 200, 200]);
    expect(y2 - y1).to.equal(96);
    expect((x1 + x2) / 2).to.equal(100);
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
