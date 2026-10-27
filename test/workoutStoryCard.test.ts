import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as htmlToImage from "html-to-image";
import { ShareCardImage_capture, ShareCardImage_share } from "../src/utils/shareCardImage";
import { WorkoutSharePage } from "../src/components/shareCards/workoutSharePage";
import {
  ILiftEquivalent,
  LiftEquivalents_all,
  LiftEquivalents_count,
  LiftEquivalents_formatCount,
  LiftEquivalents_pick,
} from "../src/models/liftEquivalents";
import {
  WorkoutStoryCard_build,
  WorkoutStoryCard_duration,
  WorkoutStoryCard_exportImages,
  WorkoutStoryCard_headline,
  WorkoutStoryCard_iconCount,
  WorkoutStoryCard_muscles,
  WorkoutStoryCard_pages,
  WorkoutStoryCard_prCount,
  WorkoutStoryCard_receipt,
  WorkoutStoryCard_setsText,
  WorkoutStoryCard_stats,
  WorkoutStoryCard_summary,
  WorkoutStoryCard_toNext,
  WorkoutStoryCard_weightNumber,
} from "../src/models/workoutStoryCard";
import { BearTier_progress } from "../src/models/bearTier";
import { IPersonalRecords } from "../src/models/history";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, ISet } from "../src/types";

const settings = { ...Settings_build(), units: "kg" as const };

function set(reps: number, kg: number, isCompleted: boolean = true): ISet {
  return {
    vtype: "set",
    id: `${reps}${kg}`,
    index: 0,
    completedReps: reps,
    completedWeight: Weight_build(kg, "kg"),
    isCompleted,
  };
}

const record = {
  vtype: "history_record",
  date: "2026-10-19T16:00:00.000Z",
  programId: "adhoc",
  programName: "Ad-Hoc",
  day: 1,
  dayName: "Ad-Hoc",
  id: 1,
  startTime: 0,
  endTime: 62 * 60 * 1000,
  entries: [
    {
      vtype: "history_entry",
      id: "bench",
      index: 0,
      exercise: { id: "benchPress", equipment: "barbell" },
      warmupSets: [],
      sets: [set(10, 60), set(8, 60), set(5, 80, false)],
    },
    {
      vtype: "history_entry",
      id: "squat",
      index: 1,
      exercise: { id: "squat", equipment: "barbell" },
      warmupSets: [],
      sets: [set(5, 100)],
    },
  ],
} as IHistoryRecord;

describe("WorkoutStoryCard", () => {
  afterEach(() => sinon.restore());
  it("formats the duration in hours and minutes", () => {
    expect([47 * 60000, 62 * 60000, 0].map(WorkoutStoryCard_duration)).to.deep.equal(["47m", "1h 2m", "0m"]);
  });

  it("totals time and finished sets, and uses the app's own volume, which counts entered reps", () => {
    const stats = WorkoutStoryCard_stats(record, settings);
    expect(stats).to.deep.include({ duration: "1h 2m", sets: 3, weightKg: 1980 });
    expect(stats.weight).to.deep.equal(Weight_build(1980, "kg"));
  });

  it("gives the busiest muscle 1 and skips unfinished sets", () => {
    const muscles = WorkoutStoryCard_muscles(record, settings);
    expect(muscles.chest).to.equal(1);
    expect(muscles.quadriceps).to.be.greaterThan(0).and.lessThan(1);
    expect(muscles.calves ?? 0).to.be.lessThan(muscles.chest!);
  });

  it("has no muscles for a workout with no finished sets", () => {
    expect(WorkoutStoryCard_muscles({ ...record, entries: [] }, settings)).to.deep.equal({});
  });

  it("writes the weight as a whole number with thousands commas", () => {
    expect(WorkoutStoryCard_weightNumber(Weight_build(12345.6, "lb"))).to.equal("12,346");
  });

  it("headlines sets for bodyweight and empty workouts, and weight for loaded workouts", () => {
    for (const units of ["kg", "lb"] as const) {
      const unitSettings = { ...settings, units };
      const bodyweight = {
        ...record,
        entries: [{ ...record.entries[0], exercise: { id: "pushUp" }, sets: [set(10, 0), set(8, 0)] }],
      } as IHistoryRecord;
      const stats = WorkoutStoryCard_stats(bodyweight, unitSettings);
      expect(WorkoutStoryCard_headline(stats)).to.deep.equal({ label: "TRAINED TODAY", value: "2", unit: "sets" });
      expect(WorkoutStoryCard_summary(stats, WorkoutStoryCard_setsText(2))).to.equal("1h 2m · 2 sets");
      const empty = WorkoutStoryCard_stats({ ...record, entries: [] }, unitSettings);
      expect(WorkoutStoryCard_headline(empty).label).to.equal("TRAINED TODAY");
    }
    const loaded = WorkoutStoryCard_stats(record, settings);
    expect(WorkoutStoryCard_headline(loaded)).to.deep.equal({ label: "LIFTED TODAY", value: "1,980", unit: "kg" });
    expect(WorkoutStoryCard_summary(loaded, WorkoutStoryCard_setsText(1))).to.equal("1,980 kg · 1h 2m · 1 set");
  });

  it("totals a bodyweight receipt in sets and leaves its line volume blank", () => {
    const bodyweight = {
      ...record,
      entries: [{ ...record.entries[0], exercise: { id: "pushUp" }, sets: [set(10, 0), set(8, 0)] }],
    } as IHistoryRecord;
    const receipt = WorkoutStoryCard_receipt(bodyweight, settings, {});
    expect([receipt.total, receipt.lines.map((l) => l.volume)]).to.deep.equal(["2 sets", [""]]);
  });

  it("writes headline text on every card for a bodyweight workout", () => {
    const bodyweight = {
      ...record,
      entries: [{ ...record.entries[0], exercise: { id: "pushUp" }, sets: [set(10, 0), set(8, 0)] }],
    } as IHistoryRecord;
    const achievements = { lifetimeKg: new Map(), badges: [] };
    const data = WorkoutStoryCard_build({
      record: bodyweight,
      settings,
      prs: {},
      achievements,
      tierSet: "male",
      seed: 1,
    });
    for (const page of ["photo", "count", "rank", "receipt"] as const) {
      const html = renderToStaticMarkup(createElement(WorkoutSharePage, { page, data }));
      expect(html, page)
        .to.not.contain(">kg<")
        .and.not.match(/(^|[>\s])0 kg/);
    }
    expect(renderToStaticMarkup(createElement(WorkoutSharePage, { page: "photo", data }))).to.contain("TRAINED TODAY");
  });

  it("calls navigator.share before the first await, inside the tap", async () => {
    const share = sinon.stub().resolves();
    sinon.stub(globalThis, "navigator").value({ userAgent: "iPhone", canShare: () => true, share });
    const pending = ShareCardImage_share(["data:image/png;base64,AA=="], "bebear-workout");
    expect(share.callCount).to.equal(1);
    expect(share.firstCall.args[0].files[0].name).to.equal("bebear-workout.png");
    expect(await pending).to.equal("shared");
  });
});

describe("ShareCardImage_capture", () => {
  afterEach(() => sinon.restore());

  it("does one warm-up pass before the final PNG at the card size", async () => {
    let finishWarmup!: (value: string) => void;
    const png = sinon.stub(htmlToImage, "toPng");
    png.onFirstCall().returns(
      new Promise((resolve) => {
        finishWarmup = resolve;
      })
    );
    png.onSecondCall().resolves("final");
    const element = {} as HTMLElement;
    const result = ShareCardImage_capture(element);
    expect(png.callCount).to.equal(1);
    finishWarmup("warmup");
    expect(await result).to.equal("final");
    expect(png.callCount).to.equal(2);
    expect(png.alwaysCalledWithExactly(element, { pixelRatio: 3, width: 360, height: 640 })).to.equal(true);
  });
});

function allPicks(totalKg: number): ILiftEquivalent[] {
  return Array.from({ length: LiftEquivalents_count(totalKg) }, (_, i) => LiftEquivalents_pick(totalKg, i)!);
}

describe("LiftEquivalents_pick", () => {
  it("has only bear-world things, each with a unique plural and an emoji", () => {
    const things = LiftEquivalents_all();
    expect(things.length).to.be.at.least(15);
    expect(new Set(things.map((t) => t.many)).size).to.equal(things.length);
    expect(things.every((t) => t.kg > 0 && t.emoji !== "")).to.equal(true);
    expect(things.some((t) => t.many === "grizzly bears")).to.equal(true);
  });

  it("keeps counts between 2 and 999, except a swarm, which can reach millions", () => {
    for (const totalKg of [25, 300, 2438, 15000, 80000]) {
      const picks = allPicks(totalKg);
      expect(picks.length, `${totalKg} kg`).to.be.at.least(3);
      const swarm = new Set(
        LiftEquivalents_all()
          .filter((t) => t.swarm)
          .map((t) => t.many)
      );
      expect(picks.every((e) => e.count >= 2 && (swarm.has(e.noun) || e.count <= 999))).to.equal(true);
    }
    expect(allPicks(6000).some((e) => e.noun === "jars of honey")).to.equal(false);
    expect(allPicks(5000).find((e) => e.noun === "honeybees")?.number).to.equal("50 million");
  });

  it("shows every fitting thing once before it repeats", () => {
    const nouns = new Set(allPicks(2438).map((e) => e.noun));
    expect(nouns.size).to.equal(LiftEquivalents_count(2438));
  });

  it("changes both the thing and the phrase on each shuffle", () => {
    const a = LiftEquivalents_pick(2438, 10)!;
    const b = LiftEquivalents_pick(2438, 11)!;
    expect(a.noun).to.not.equal(b.noun);
    expect(a.lead + a.tail).to.not.equal(b.lead + b.tail);
  });

  it("builds the line from the phrase, the number and the noun", () => {
    const leads = new Set<string>();
    for (let seed = 0; seed < 30; seed += 1) {
      const e = LiftEquivalents_pick(1200, seed)!;
      leads.add(e.lead);
      expect(e.text).to.equal([e.lead, `${e.number} ${e.noun}`, e.tail].filter((s) => s !== "").join(" "));
    }
    expect(leads.size).to.be.at.least(4);
    const grizzly = allPicks(1200).find((e) => e.noun === "grizzly bears");
    expect(grizzly?.number).to.equal("4");
  });

  it("rounds under 10 to one decimal, adds commas from 1,000 and words from a million", () => {
    expect([2.04, 2.46, 9.96, 148.4, 1083.2, 2140000, 50000000].map(LiftEquivalents_formatCount)).to.deep.equal([
      "2",
      "2.5",
      "10",
      "148",
      "1,083",
      "2.1 million",
      "50 million",
    ]);
  });

  it("has nothing for an empty workout and handles a negative seed", () => {
    expect(LiftEquivalents_pick(0, 3)).to.equal(undefined);
    expect(LiftEquivalents_pick(2438, -1)).to.not.equal(undefined);
  });
});

describe("WorkoutStoryCard share data", () => {
  const prs: IPersonalRecords = {
    1: {
      benchPress_barbell: { maxWeightSet: set(10, 60), prevMaxWeightSet: set(5, 55) },
      squat_barbell: { maxWeightSet: set(5, 100) },
    },
  };

  it("counts only PRs that beat a previous best", () => {
    expect(WorkoutStoryCard_prCount(record, prs)).to.equal(1);
    expect(WorkoutStoryCard_prCount(record, {})).to.equal(0);
  });

  it("lists exercises with sets and volume that add up to the total, capped at 6 lines", () => {
    const receipt = WorkoutStoryCard_receipt(record, settings, prs);
    expect(receipt.lines.map((l) => l.detail)).to.deep.equal(["3 sets", "1×5"]);
    expect(receipt.lines.map((l) => l.volume)).to.deep.equal(["1,480", "500"]);
    expect(receipt.total).to.equal("1,980 kg");
    const many = { ...record, entries: Array.from({ length: 9 }, () => record.entries[1]) };
    const long = WorkoutStoryCard_receipt(many, settings, {});
    expect([long.lines.length, long.moreCount]).to.deep.equal([6, 3]);
  });

  it("says how far the next tier is, in the user's units", () => {
    const tier = BearTier_progress(0, 11420, "male");
    expect(WorkoutStoryCard_toNext(tier, settings)).to.equal("580 kg to Level 3 · Amateur");
    expect(WorkoutStoryCard_toNext(tier, { ...settings, units: "lb" })).to.equal("1,279 lb to Level 3 · Amateur");
    expect(WorkoutStoryCard_toNext(BearTier_progress(0, 9e6, "male"), settings, 9e6)).to.equal("9,000,000 kg lifetime");
  });

  it("draws between 1 and 24 icons", () => {
    expect([0, 3.4, 28, 5e7].map(WorkoutStoryCard_iconCount)).to.deep.equal([1, 3, 24, 24]);
  });

  it("builds the rank from the lifetime totals around this workout", () => {
    const achievements = { lifetimeKg: new Map([[1, { beforeKg: 11000, afterKg: 12980 }]]), badges: [] };
    const data = WorkoutStoryCard_build({ record, settings, prs, achievements, tierSet: "male", seed: 1 });
    expect([data.tier.tier.name, data.tier.isTierUp]).to.deep.equal(["Level 3 · Amateur", true]);
    expect(data.equivalent).to.not.equal(undefined);
  });

  it("ranks the same lifetime total by the women's numbers", () => {
    const achievements = { lifetimeKg: new Map([[1, { beforeKg: 21000, afterKg: 22980 }]]), badges: [] };
    const data = WorkoutStoryCard_build({ record, settings, prs, achievements, tierSet: "female", seed: 1 });
    expect([data.tier.tier.name, data.tier.isTierUp]).to.deep.equal(["Level 4 · Rookie", true]);
    expect(data.toNext).to.equal("25,020 kg to Level 5 · Regular");
  });

  it("renders a numbered level name on the shared rank card", () => {
    const achievements = { lifetimeKg: new Map([[1, { beforeKg: 24000, afterKg: 25980 }]]), badges: [] };
    const data = WorkoutStoryCard_build({ record, settings, prs, achievements, tierSet: "male", seed: 1 });
    const html = renderToStaticMarkup(createElement(WorkoutSharePage, { page: "rank", data }));
    expect(html).to.contain("LEVEL 3 · AMATEUR");
  });

  it("puts the bear of the level after this workout and the chosen line on the card", () => {
    const achievements = { lifetimeKg: new Map([[1, { beforeKg: 24000, afterKg: 25980 }]]), badges: [] };
    const male = WorkoutStoryCard_build({ record, settings, prs, achievements, tierSet: "male", seed: 1 });
    expect(male.bear).to.deep.equal({ sprite: "/images/bear/male/lift-small.webp", fur: "brown", size: "small" });
    const female = WorkoutStoryCard_build({
      record,
      settings,
      prs,
      achievements,
      tierSet: "male",
      line: "female",
      seed: 1,
    });
    expect(female.bear.sprite).to.equal("/images/bear/female/lift-small.webp");
  });

  it("draws the chosen fur on the card sprite", () => {
    const achievements = { lifetimeKg: new Map([[1, { beforeKg: 24000, afterKg: 25980 }]]), badges: [] };
    const polar = WorkoutStoryCard_build({
      record,
      settings,
      prs,
      achievements,
      tierSet: "male",
      line: "female",
      fur: "polar",
      seed: 1,
    });
    expect(polar.bear).to.deep.equal({
      sprite: "/images/bear/female-polar/lift-small.webp",
      fur: "polar",
      size: "small",
    });
  });

  it("draws the bear on every card the export captures, and four times on the collage", () => {
    const achievements = { lifetimeKg: new Map([[1, { beforeKg: 24000, afterKg: 25980 }]]), badges: [] };
    const data = WorkoutStoryCard_build({ record, settings, prs, achievements, tierSet: "male", seed: 1 });
    const bears = WorkoutStoryCard_pages.map(
      (page) =>
        renderToStaticMarkup(createElement(WorkoutSharePage, { page, data })).split('data-testid="share-card-bear"')
          .length - 1
    );
    expect(bears).to.deep.equal([1, 1, 1, 1, 4]);
  });

  it("makes the export wait for the bear, and for the photo only on cards that show it", () => {
    const achievements = { lifetimeKg: new Map(), badges: [] };
    const data = WorkoutStoryCard_build({ record, settings, prs, achievements, tierSet: "male", seed: 1 });
    expect(WorkoutStoryCard_exportImages(data, ["rank"], "p")).to.deep.equal([data.bear.sprite]);
    expect(WorkoutStoryCard_exportImages(data, ["receipt", "collage"], "p")).to.deep.equal([data.bear.sprite, "p"]);
    expect(WorkoutStoryCard_exportImages(data, ["photo"])).to.deep.equal([data.bear.sprite]);
  });

  it("shows the lifetime total when the final level has no countdown", () => {
    const achievements = { lifetimeKg: new Map([[1, { beforeKg: 6998020, afterKg: 7000000 }]]), badges: [] };
    const data = WorkoutStoryCard_build({ record, settings, prs, achievements, tierSet: "male", seed: 1 });
    expect(data.tier.next).to.equal(undefined);
    expect(data.toNext).to.equal("7,000,000 kg lifetime");
  });
});
