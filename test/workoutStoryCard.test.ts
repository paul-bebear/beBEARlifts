import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, Root } from "test-renderer";
import * as htmlToImage from "html-to-image";
import { StoryImage_render, useStoryImage } from "../src/utils/storyImage";
import * as storyImage from "../src/utils/storyImage";
import { WorkoutStoryCardSection } from "../src/components/workoutStoryCard";
import { RunShareCard } from "../src/components/runShareCard";
import * as foodUi from "../src/components/foodUi";
import { IRun } from "../src/models/runLog";
import {
  ILiftEquivalent,
  LiftEquivalents_all,
  LiftEquivalents_count,
  LiftEquivalents_formatCount,
  LiftEquivalents_pick,
} from "../src/models/liftEquivalents";
import {
  WorkoutStoryCard_duration,
  WorkoutStoryCard_muscles,
  WorkoutStoryCard_stats,
  WorkoutStoryCard_weightNumber,
} from "../src/models/workoutStoryCard";
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
      const bodyweight = {
        ...record,
        entries: [{ ...record.entries[0], exercise: { id: "pushUp" }, sets: [set(10, 0), set(8, 0)] }],
      };
      const html = renderToStaticMarkup(
        createElement(WorkoutStoryCardSection, { record: bodyweight, settings: { ...settings, units } })
      );
      expect(html).to.contain("TRAINED TODAY").and.not.to.contain("LIFTED TODAY");
      expect(html).to.not.contain(`>${units}<`);
      expect(html).to.contain("2");
      const empty = renderToStaticMarkup(
        createElement(WorkoutStoryCardSection, { record: { ...record, entries: [] }, settings: { ...settings, units } })
      );
      expect(empty).to.contain("TRAINED TODAY").and.not.to.contain(`>${units}<`);
    }
    const loaded = renderToStaticMarkup(createElement(WorkoutStoryCardSection, { record, settings }));
    expect(loaded).to.contain("LIFTED TODAY").and.to.contain(">kg<");
  });

  it("shares each prepared card on the tap without rendering another PNG", async () => {
    const png = sinon.stub(htmlToImage, "toPng").resolves("data:image/png;base64,AA==");
    sinon.stub(storyImage, "useStoryImage").returns({ dataUrl: "data:image/png;base64,AA==", retry: () => undefined });
    const share = sinon.stub().resolves();
    sinon.stub(globalThis, "navigator").value({ userAgent: "iPhone", canShare: () => true, share });
    const buttons = new Map<string, Parameters<typeof foodUi.FoodPrimaryButton>[0]>();
    sinon.stub(foodUi, "FoodPrimaryButton").callsFake((props) => {
      buttons.set(props.testID!, props);
      return createElement("button");
    });
    const run: IRun = {
      id: 1,
      startedAt: 1,
      endedAt: 2,
      distanceM: 1000,
      movingMs: 300000,
      elevationGainM: 0,
      route: [],
      splits: [],
    };
    renderToStaticMarkup(createElement(WorkoutStoryCardSection, { record, settings }));
    renderToStaticMarkup(createElement(RunShareCard, { run }));
    for (const id of ["workout-story-share", "run-share"]) {
      const button = buttons.get(id)!;
      expect(button.disabled).to.equal(false);
      button.onPress();
      expect(share.callCount).to.equal(id === "workout-story-share" ? 1 : 2);
    }
    await Promise.resolve();
    expect(png.called).to.equal(false);
    expect(share.firstCall.args[0].files[0].name).to.equal("workout-story.png");
    expect(share.secondCall.args[0].files[0].name).to.equal("run-story.png");
  });
});

describe("StoryImage", () => {
  let root: Root;
  let latest: ReturnType<typeof useStoryImage>;
  const ref = { current: {} as HTMLElement };
  const size = { width: 360, height: 640 };
  const actGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  let previousActEnvironment: boolean | undefined;

  function Harness(props: { source: object }): ReturnType<typeof createElement> {
    latest = useStoryImage(ref, props.source, size);
    return createElement("div");
  }

  beforeEach(() => {
    previousActEnvironment = actGlobal.IS_REACT_ACT_ENVIRONMENT;
    actGlobal.IS_REACT_ACT_ENVIRONMENT = true;
    root = createRoot();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    actGlobal.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    sinon.restore();
  });

  it("does one warm-up pass before the final PNG at the supplied size", async () => {
    let finishWarmup!: (value: string) => void;
    const png = sinon.stub(htmlToImage, "toPng");
    png.onFirstCall().returns(
      new Promise((resolve) => {
        finishWarmup = resolve;
      })
    );
    png.onSecondCall().resolves("final");
    const result = StoryImage_render(ref.current, { width: 200, height: 300 });
    expect(png.callCount).to.equal(1);
    finishWarmup("warmup");
    expect(await result).to.equal("final");
    expect(png.callCount).to.equal(2);
    expect(png.alwaysCalledWithExactly(ref.current, { pixelRatio: 3, width: 200, height: 300 })).to.equal(true);
  });

  it("invalidates a prepared image immediately when the photo or seed changes", async () => {
    const png = sinon.stub(htmlToImage, "toPng").resolves("old");
    await act(async () => root.render(createElement(Harness, { source: { photo: "one", seed: 1 } })));
    expect(latest.dataUrl).to.equal("old");
    let finish!: (value: string) => void;
    png.returns(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await act(async () => root.render(createElement(Harness, { source: { photo: "two", seed: 2 } })));
    expect(latest.dataUrl).to.equal(undefined);
    png.resolves("new");
    await act(async () => finish("warmup"));
    expect(latest.dataUrl).to.equal("new");
  });

  it("ignores an older render that completes after a new source", async () => {
    let finishOld!: (value: string) => void;
    const png = sinon.stub(htmlToImage, "toPng").resolves("new");
    png.onFirstCall().returns(
      new Promise((resolve) => {
        finishOld = resolve;
      })
    );
    await act(async () => root.render(createElement(Harness, { source: { seed: 1 } })));
    await act(async () => root.render(createElement(Harness, { source: { seed: 2 } })));
    expect(latest.dataUrl).to.equal("new");
    png.resolves("old");
    await act(async () => finishOld("warmup"));
    expect(latest.dataUrl).to.equal("new");
  });

  it("offers a retry after a render fails and clears the error when it succeeds", async () => {
    const png = sinon.stub(htmlToImage, "toPng").rejects(new Error("render failed"));
    await act(async () => root.render(createElement(Harness, { source: {} })));
    expect(latest.dataUrl).to.equal(undefined);
    expect(latest.error).to.contain("story card");
    png.resolves("recovered");
    await act(async () => latest.retry());
    expect(latest.error).to.equal(undefined);
    expect(latest.dataUrl).to.equal("recovered");
  });
});

function allPicks(totalKg: number): ILiftEquivalent[] {
  return Array.from({ length: LiftEquivalents_count(totalKg) }, (_, i) => LiftEquivalents_pick(totalKg, i)!);
}

describe("LiftEquivalents_pick", () => {
  it("has at least 40 things, each with a plural name and an emoji", () => {
    const things = LiftEquivalents_all();
    expect(things.length).to.be.at.least(40);
    expect(new Set(things.map((t) => t.many)).size).to.equal(things.length);
    expect(things.every((t) => t.kg > 0 && t.emoji !== "" && t.many !== t.one)).to.equal(true);
  });

  it("keeps every count between 2 and 999, so there is never 0.3 elephants or 48,000 bananas", () => {
    for (const totalKg of [1, 25, 300, 2438, 15000, 80000, 600000]) {
      const picks = allPicks(totalKg);
      expect(picks.length, `${totalKg} kg`).to.be.at.least(3);
      expect(picks.every((e) => e.count >= 2 && e.count <= 999)).to.equal(true);
    }
    expect(allPicks(500).some((e) => e.noun === "African elephants")).to.equal(false);
    expect(allPicks(6000).some((e) => e.noun === "bananas")).to.equal(false);
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
    const piano = allPicks(1200).find((e) => e.noun === "grand pianos");
    expect(piano?.number).to.equal("3");
  });

  it("rounds under 10 to one decimal and adds commas from 1,000", () => {
    expect([2.04, 2.46, 9.96, 148.4, 1083.2].map(LiftEquivalents_formatCount)).to.deep.equal([
      "2",
      "2.5",
      "10",
      "148",
      "1,083",
    ]);
  });

  it("has nothing for an empty workout and handles a negative seed", () => {
    expect(LiftEquivalents_pick(0, 3)).to.equal(undefined);
    expect(LiftEquivalents_pick(2438, -1)).to.not.equal(undefined);
  });
});
