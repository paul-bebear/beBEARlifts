import "mocha";
import { expect } from "chai";
import { existsSync, readFileSync, statSync } from "fs";
import { resolve } from "path";
import {
  BearBadges_all,
  BearBadges_compute,
  BearBadges_forRecord,
  BearBadges_grid,
  BearBadges_image,
  IBearBadgeSources,
} from "../src/models/bearBadges";
import { FoodLog_empty, IFoodLog } from "../src/models/foodLog";
import { IHistoryRecord, ISet } from "../src/types";
import { Weight_build } from "../src/models/weight";
import { ShareCardExport_idle, ShareCardExport_next } from "../src/models/shareCardExport";

const hour = 60 * 60 * 1000;
const day = 24 * hour;

function at(date: string, h: number): number {
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h);
  return d.getTime();
}

function workout(id: number, start: number): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(start).toISOString(),
    programId: "adhoc",
    programName: "Ad-Hoc",
    day: 1,
    dayName: "Ad-Hoc",
    id,
    startTime: start,
    endTime: start + hour,
    entries: [],
  } as IHistoryRecord;
}

const set: ISet = {
  vtype: "set",
  id: "s",
  index: 0,
  completedReps: 5,
  completedWeight: Weight_build(100, "kg"),
  isCompleted: true,
};

function sources(history: IHistoryRecord[], extra: Partial<IBearBadgeSources> = {}): IBearBadgeSources {
  return { history, prs: {}, doneDays: new Set(), foodLog: FoodLog_empty(), tierSet: "male", ...extra };
}

function ids(s: IBearBadgeSources): string[] {
  return BearBadges_compute(s).map((b) => b.id);
}

describe("BearBadges", () => {
  it("gives early bear and night bear from the local start hour", () => {
    expect(ids(sources([workout(1, at("2026-10-01", 6))]))).to.deep.equal(["earlyBear"]);
    expect(ids(sources([workout(1, at("2026-10-01", 22))]))).to.deep.equal(["nightBear"]);
    expect(ids(sources([workout(1, at("2026-10-01", 12))]))).to.deep.equal([]);
  });

  it("needs a beaten previous best for First PR", () => {
    const first = { 1: { squat_barbell: { maxWeightSet: set } } };
    const beaten = { 2: { squat_barbell: { maxWeightSet: set, prevMaxWeightSet: set } } };
    const history = [workout(1, at("2026-10-01", 12)), workout(2, at("2026-10-02", 12))];
    expect(ids(sources(history, { prs: first }))).to.deep.equal([]);
    expect(BearBadges_compute(sources(history, { prs: beaten }))[0]).to.deep.include({ id: "firstPr", recordId: 2 });
  });

  it("gives out of hibernation after 14 days off and 100 workouts on the 100th", () => {
    const gap = [workout(1, at("2026-09-01", 12)), workout(2, at("2026-09-16", 12))];
    expect(ids(sources(gap))).to.deep.equal(["outOfHibernation"]);
    const many = Array.from({ length: 100 }, (_, i) => workout(i + 1, at("2026-01-01", 12) + i * day));
    expect(BearBadges_compute(sources(many)).find((b) => b.id === "hundredWorkouts")).to.deep.include({
      recordId: 100,
    });
  });

  it("puts day badges on the 7th day of the first run", () => {
    const doneDays = new Set([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
    expect(BearBadges_compute(sources([], { doneDays })).find((b) => b.id === "bearWeek")).to.deep.equal({
      id: "bearWeek",
      day: "2026-10-07",
    });
    doneDays.delete("2026-10-04");
    expect(ids(sources([], { doneDays }))).to.deep.equal(["streak3"]);
  });

  it("gives a streak badge on the last day of the first run that is long enough", () => {
    const days = (from: string, count: number): string[] =>
      Array.from({ length: count }, (_, i) => {
        const d = new Date(`${from}T12:00:00`);
        d.setDate(d.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
    const doneDays = new Set([...days("2026-01-01", 2), ...days("2026-02-01", 14)]);
    const badges = BearBadges_compute(sources([], { doneDays }));
    expect(badges.filter((b) => b.id.startsWith("streak"))).to.deep.equal([
      { id: "streak3", day: "2026-02-03" },
      { id: "streak7", day: "2026-02-07" },
      { id: "streak14", day: "2026-02-14" },
    ]);
    const hundred = new Set(days("2026-01-01", 100));
    expect(ids(sources([], { doneDays: hundred }))).to.include.members(["streak30", "streak100"]);
  });

  it("gives a level badge on the workout that crosses each tier, and none for Cub", () => {
    const history = [
      workout(1, at("2026-10-01", 12)),
      workout(2, at("2026-10-02", 12)),
      workout(3, at("2026-10-03", 12)),
    ];
    const workouts = [
      { record: history[0], countedKg: 4000 },
      { record: history[1], countedKg: 1200 },
      { record: history[2], countedKg: 20000 },
    ];
    const levels = BearBadges_compute(sources(history, { workouts })).filter((b) => b.id.startsWith("level"));
    expect(levels).to.deep.equal([
      { id: "level2", recordId: 2, at: history[1].endTime },
      { id: "level3", recordId: 3, at: history[2].endTime },
    ]);
  });

  it("crosses the women's level badges at the women's thresholds", () => {
    const history = [workout(1, at("2026-10-01", 12)), workout(2, at("2026-10-02", 12))];
    const workouts = [
      { record: history[0], countedKg: 3500 },
      { record: history[1], countedKg: 12000 },
    ];
    const levels = (side: "male" | "female"): unknown[] =>
      BearBadges_compute(sources(history, { workouts, tierSet: side })).filter((b) => b.id.startsWith("level"));
    expect(levels("female")).to.deep.equal([
      { id: "level2", recordId: 1, at: history[0].endTime },
      { id: "level3", recordId: 2, at: history[1].endTime },
    ]);
    expect(levels("male")).to.deep.equal([{ id: "level2", recordId: 2, at: history[1].endTime }]);
  });

  it("lists the old seven, five streak badges and 11 level badges from Teen to Mars", () => {
    const all = BearBadges_all();
    expect(all).to.have.length(7 + 5 + 11);
    expect(all.filter((i) => i.id.startsWith("level")).map((i) => i.name)).to.deep.equal([
      "Teen",
      "Amateur",
      "Rookie",
      "Regular",
      "Strong",
      "Athlete",
      "Power",
      "Titan",
      "Astronaut",
      "Lunar",
      "Mars",
    ]);
    expect(new Set(all.map((i) => i.id)).size).to.equal(all.length);
    expect(all.every((i) => i.emoji.length > 0 && i.image === `/images/badges/${i.id}.webp`)).to.equal(true);
  });

  it("ships earned and grey locked art for every badge under 25 KB each", () => {
    const native = readFileSync(resolve(__dirname, "../src/utils/bearImage.native.ts"), "utf8");
    for (const info of BearBadges_all()) {
      for (const isEarned of [true, false]) {
        const image = BearBadges_image(info, isEarned)!;
        const file = resolve(__dirname, "..", image.slice(1));
        expect(existsSync(file), image).to.equal(true);
        expect(statSync(file).size, image).to.be.lessThan(25000);
        expect(native).to.include(`"${image}": require("../..${image}")`);
      }
      expect(BearBadges_image(info, false)).to.equal(`/images/badges/${info.id}-locked.webp`);
    }
  });

  it("keeps the emoji fallback when a badge has no image", () => {
    const info = { id: "firstPr" as const, name: "First PR", description: "Beat a previous best", emoji: "🏆" };
    expect(BearBadges_image(info, true)).to.equal(undefined);
    expect(BearBadges_image(info, false)).to.equal(undefined);
  });

  it("waits for each badge image before capturing its share card", () => {
    for (const info of BearBadges_all()) {
      const started = ShareCardExport_next(ShareCardExport_idle(), {
        type: "start",
        pages: ["badge"],
        frozen: info,
        images: [info.image!],
        share: ["badge"],
      });
      const laidOut = ShareCardExport_next(started.job, { type: "layout", page: "badge" });
      expect(laidOut.job.phase).to.equal("preparing");
      expect(laidOut.effects).to.deep.equal([]);
      const loaded = ShareCardExport_next(laidOut.job, { type: "imageLoaded", uri: info.image! });
      expect(loaded.effects).to.deep.equal([{ kind: "capture", page: "badge", jobId: 1 }]);
    }
  });

  it("builds the grid with earned badges first, newest first, then locked in list order", () => {
    const history = [workout(1, at("2026-10-01", 6)), workout(2, at("2026-10-02", 23))];
    const grid = BearBadges_grid(BearBadges_compute(sources(history)));
    expect(grid.earned).to.equal(2);
    expect(grid.total).to.equal(BearBadges_all().length);
    expect(grid.entries.map((e) => e.info.id).slice(0, 2)).to.deep.equal(["nightBear", "earlyBear"]);
    expect(grid.entries.slice(2).every((e) => e.badge == null)).to.equal(true);
    expect(grid.entries).to.have.length(grid.total);
    expect(grid.entries[2].info.id).to.equal("firstPr");
  });

  it("gives honey hunter for 7 days at the protein minimum", () => {
    const empty = FoodLog_empty();
    const base = { ...empty, goals: { ...empty.goals, protein: { min: 120, max: 0 } } };
    const entries = Array.from({ length: 7 }, (_, i) => ({
      id: `${i}`,
      day: `2026-10-0${i + 1}`,
      meal: "lunch" as const,
      name: "Chicken",
      source: "manual" as const,
      nutrients: { calories: 0, protein: base.goals.protein.min, carbs: 0, fat: 0 },
      createdAt: 0,
    }));
    const foodLog = { ...base, entries } as IFoodLog;
    expect(ids(sources([], { foodLog }))).to.deep.equal(["honeyHunter"]);
  });

  it("marks a badge new on its own workout and leaves out later badges", () => {
    const history = [
      workout(1, at("2026-10-01", 6)),
      workout(2, at("2026-10-02", 12)),
      workout(3, at("2026-10-03", 23)),
    ];
    const badges = BearBadges_compute(sources(history));
    expect(BearBadges_forRecord(badges, history[0])).to.deep.include({ isNew: true, earned: 1 });
    expect(BearBadges_forRecord(badges, history[1])).to.deep.include({ isNew: false, earned: 1 });
    expect(BearBadges_forRecord(badges, history[1]).badge?.id).to.equal("earlyBear");
    expect(BearBadges_forRecord(badges, history[2]).badge?.id).to.equal("nightBear");
  });
});
