import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Thunk_pushScreen } from "../src/ducks/thunks";
import { IDispatch, IThunk } from "../src/ducks/types";
import { IEnv, IState } from "../src/models/state";
import { IScreen } from "../src/models/screen";
import { Storage_getDefault } from "../src/models/storage";
import * as navUtils from "../src/navigation/navUtils";
import * as trackedState from "../src/navigation/TrackedStateContext";
import { WorkoutReportView } from "../src/components/workoutReportCard";
import { IWorkoutReport } from "../src/models/workoutReport";
import { AiConsentStore } from "../src/utils/aiConsentClient";
import { HomeChecklist } from "../src/components/homeChecklist";
import * as checklistCard from "../src/components/dailyChecklistCard";
import * as foodStore from "../src/utils/foodLogStore";
import { FoodLog_empty } from "../src/models/foodLog";
import { ChecklistStore } from "../src/utils/checklistStore";
import { DailyChecklist_empty } from "../src/models/dailyChecklist";
import { ProgramGoalStore } from "../src/utils/programGoalStore";
import { ProgramGoal_empty } from "../src/models/programGoal";
import { Settings_build } from "../src/models/settings";
import { History_getPersonalRecords } from "../src/models/history";
import { IExerciseType, IHistoryEntry, IHistoryRecord, ISet } from "../src/types";
import {
  WorkoutPost_build,
  WorkoutPost_parse,
  WorkoutPost_setText,
  WorkoutPost_statsLine,
  WorkoutPost_hasEarlierExercise,
  IWorkoutPostSummary,
} from "../src/models/workoutPost";
import {
  Feed_ago,
  Feed_empty,
  Feed_itemKey,
  Feed_items,
  Feed_needsRefresh,
  Feed_parse,
  Feed_parseMeals,
  Feed_pendingOps,
  Feed_queue,
  Feed_reportTarget,
  Feed_screenView,
  Feed_sent,
  Feed_shareStatus,
  Feed_withServerMeals,
  Feed_withServerPosts,
  IFeedOp,
} from "../src/models/feed";
import { BearTv_box, BearTv_rect, BearTv_screen, BearTv_sprite } from "../src/models/bearTv";
import { IMealPostDraft } from "../src/models/mealPost";
import { Friends_fromServer } from "../src/models/friends";
import * as fs from "fs";
import * as path from "path";
import {
  PullToRefresh_end,
  PullToRefresh_move,
  PullToRefresh_start,
  PullToRefresh_threshold,
} from "../src/models/pullToRefresh";

const bench: IExerciseType = { id: "benchPress", equipment: "barbell" };
const squat: IExerciseType = { id: "squat", equipment: "barbell" };

function set(weight: number, reps: number): ISet {
  return {
    vtype: "set",
    index: 0,
    reps,
    weight: { value: weight, unit: "kg" },
    completedWeight: { value: weight, unit: "kg" },
    completedReps: reps,
    isCompleted: true,
  } as ISet;
}

function entry(exercise: IExerciseType, sets: ISet[]): IHistoryEntry {
  return { vtype: "history_entry", index: 0, id: exercise.id, exercise, sets, warmupSets: [] };
}

function record(id: number, entries: IHistoryEntry[]): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(id).toISOString(),
    programId: "p",
    programName: "Strong",
    day: 1,
    dayName: "Push",
    entries,
    startTime: id,
    endTime: id + 45 * 60000,
    id,
  };
}

const t0 = Date.UTC(2026, 9, 1);
const t1 = Date.UTC(2026, 9, 8);

describe("First-launch navigation", () => {
  let state: IState;
  let navigate: sinon.SinonStub;
  const dispatch = sinon.stub();

  beforeEach(() => {
    state = { storage: { ...Storage_getDefault(), currentProgramId: undefined } } as IState;
    navigate = sinon.stub();
    sinon
      .stub(navUtils, "getNavigationService")
      .resolves({ navigateTo: navigate } as unknown as Awaited<ReturnType<typeof navUtils.getNavigationService>>);
    dispatch.resetHistory();
  });

  afterEach(() => sinon.restore());

  it("opens food, friends, progress and their program-independent screens without a program", async () => {
    const screens: IScreen[] = [
      "food",
      "foodAdd",
      "friends",
      "progressDashboard",
      "settings",
      "stats",
      "measurements",
      "music",
      "reports",
      "bodyScans",
      "runs",
      "goalWizard",
      "steps",
      "progressPhotos",
      "streak",
      "account",
      "recentImports",
      "importPreview",
    ];
    for (const screen of screens) {
      await Thunk_pushScreen(screen)(dispatch, () => state, {} as IEnv);
      expect(navigate.lastCall.args[0], screen).to.equal(screen);
    }
    const params = { key: "weight" as const };
    const opts = { tab: "graphs" as const };
    await Thunk_pushScreen("measurements", params, opts)(dispatch, () => state, {} as IEnv);
    expect(navigate.lastCall.args).to.deep.equal(["measurements", params, opts]);
  });

  it("still redirects Home and Workout to program selection until a program is picked", async () => {
    for (const screen of ["main", "progress"] as const) {
      await Thunk_pushScreen(screen)(dispatch, () => state, {} as IEnv);
      expect(navigate.lastCall.args[0]).to.equal("programs");
      state.storage.currentProgramId = "chosen";
      await Thunk_pushScreen(screen)(dispatch, () => state, {} as IEnv);
      expect(navigate.lastCall.args[0]).to.equal(screen);
      state.storage.currentProgramId = undefined;
    }
  });

  it("routes the Home weight checklist item to stats on the Progress stack", async () => {
    sinon.stub(foodStore, "useFoodLog").returns(FoodLog_empty());
    sinon.stub(ChecklistStore, "use").returns(DailyChecklist_empty());
    sinon.stub(ProgramGoalStore, "use").returns(ProgramGoal_empty());
    let onItemPress!: Parameters<typeof checklistCard.DailyChecklistCard>[0]["onItemPress"];
    sinon.stub(checklistCard, "DailyChecklistCard").callsFake((props) => {
      onItemPress = props.onItemPress;
      return createElement("div");
    });
    renderToStaticMarkup(
      createElement(HomeChecklist, {
        stats: state.storage.stats,
        units: "kg",
        dispatch: dispatch as IDispatch,
        onTrain: () => undefined,
      })
    );
    onItemPress("weight");
    await (dispatch.lastCall.args[0] as IThunk)(dispatch, () => state, {} as IEnv);
    expect(navigate.lastCall.args).to.deep.equal(["stats", undefined, { tab: "graphs" }]);
  });
});

describe("Workout report empty state", () => {
  afterEach(() => sinon.restore());

  it("shows the first-workout message in finish and report views until an earlier exercise can be compared", () => {
    const first = record(t0, [entry(bench, [set(80, 5)])]);
    const next = record(t1, [entry(bench, [set(80, 5)])]);
    const state = { storage: { history: [next, first] } } as IState;
    sinon.stub(trackedState, "useTrackedState").returns(state);
    sinon.stub(AiConsentStore, "use").returns({ version: 1, choice: "declined" });
    const report: IWorkoutReport = { workoutId: first.id, timestamp: t0, dayName: "Push", items: [], answers: {} };
    const firstHtml = renderToStaticMarkup(createElement(WorkoutReportView, { report }));
    expect(firstHtml).to.contain("First workout logged. Reports compare from the second one.");
    const nextHtml = renderToStaticMarkup(
      createElement(WorkoutReportView, { report: { ...report, workoutId: next.id, timestamp: t1 } })
    );
    expect(nextHtml).to.contain("Same weights and effort as your last 4 weeks.");
  });
});

describe("WorkoutPost", () => {
  const settings = { ...Settings_build(), units: "kg" as const };
  const first = record(t0, [entry(bench, [set(80, 5)]), entry(squat, [set(100, 5)])]);
  const second = record(t1, [entry(bench, [set(85, 5), set(80, 8)]), entry(squat, [set(90, 5)]), entry(bench, [])]);
  const history = [second, first];

  it("summarizes totals, top sets and only the records that beat an earlier set", () => {
    const summary = WorkoutPost_build(second, settings, History_getPersonalRecords(history), { keptSongs: 4 });
    expect(summary).to.deep.include({ dayName: "Push", programName: "Strong", startedAt: t1, sets: 3, keptSongs: 4 });
    expect(summary.durationMs).to.equal(45 * 60000);
    expect(summary.volume).to.deep.equal({ value: 85 * 5 + 80 * 8 + 90 * 5, unit: "kg" });
    expect(summary.topSets.map(WorkoutPost_setText)).to.deep.equal(["Bench Press 85 kg × 5", "Squat 90 kg × 5"]);
    expect(summary.prs.map(WorkoutPost_setText)).to.deep.equal(["Bench Press 85 kg × 5"]);
    const firstPost = WorkoutPost_build(first, settings, History_getPersonalRecords(history), { keptSongs: 0 });
    expect(firstPost.prs).to.deep.equal([]);
    expect(firstPost.keptSongs).to.equal(undefined);
  });

  it("formats the stats line and bodyweight sets", () => {
    const summary = WorkoutPost_build(second, settings, {}, undefined);
    expect(WorkoutPost_statsLine(summary)).to.equal("45 min · 1,515 kg · 3 sets");
    expect(WorkoutPost_statsLine({ ...summary, durationMs: 75 * 60000, sets: 1 })).to.equal(
      "1 h 15 min · 1,515 kg · 1 set"
    );
    expect(WorkoutPost_setText({ name: "Pull Up", weight: { value: 0, unit: "kg" }, reps: 10 })).to.equal(
      "Pull Up × 10"
    );
  });

  it("checks a friend's summary field by field", () => {
    const summary = WorkoutPost_build(second, settings, {}, { keptSongs: 2 });
    expect(WorkoutPost_parse(JSON.parse(JSON.stringify(summary)))).to.deep.equal(summary);
    expect(WorkoutPost_parse({ dayName: "Push", startedAt: 1 })).to.equal(undefined);
    const odd = WorkoutPost_parse({
      dayName: "x".repeat(500),
      startedAt: 1,
      volume: { value: 1, unit: "stone" },
    });
    expect(odd).to.equal(undefined);
    const partial = WorkoutPost_parse({
      dayName: "Pull",
      startedAt: 1,
      volume: { value: 1, unit: "lb" },
      topSets: [{ name: "Row", weight: { value: 50, unit: "lb" }, reps: 8 }, { name: 5 }],
    });
    expect(partial?.topSets).to.have.length(1);
    expect(partial?.prs).to.deep.equal([]);
  });

  it("omits zero volume from bodyweight and empty workouts in either unit", () => {
    for (const unit of ["kg", "lb"] as const) {
      const bodyweight = record(t0, [entry({ id: "pullUp" }, [set(0, 10), set(0, 8)])]);
      const summary = WorkoutPost_build(bodyweight, { ...settings, units: unit }, {}, undefined);
      expect(WorkoutPost_statsLine(summary)).to.equal("45 min · 2 sets");
      expect(WorkoutPost_statsLine({ ...summary, sets: 1, durationMs: 60000 })).to.equal("1 min · 1 set");
      expect(WorkoutPost_statsLine({ ...summary, sets: 0, durationMs: 0 })).to.equal("0 min · 0 sets");
    }
  });

  it("compares only earlier completed sessions of the same exercise and equipment within four weeks", () => {
    expect(WorkoutPost_hasEarlierExercise(second.id, history)).to.equal(true);
    expect(WorkoutPost_hasEarlierExercise(first.id, history)).to.equal(false);
    expect(WorkoutPost_hasEarlierExercise(0, history)).to.equal(false);
    expect(WorkoutPost_hasEarlierExercise(second.id, [second, { ...first, startTime: second.startTime }])).to.equal(
      false
    );
    expect(WorkoutPost_hasEarlierExercise(second.id, [second, { ...first, startTime: t1 - 29 * 86400000 }])).to.equal(
      false
    );
    expect(
      WorkoutPost_hasEarlierExercise(second.id, [second, record(t0, [entry({ id: "pullUp" }, [set(0, 10)])])])
    ).to.equal(false);
    expect(
      WorkoutPost_hasEarlierExercise(second.id, [
        second,
        record(t0, [entry({ ...bench, equipment: "dumbbell" }, [set(30, 10)])]),
      ])
    ).to.equal(false);
    expect(
      WorkoutPost_hasEarlierExercise(second.id, [
        second,
        record(t0, [entry(bench, [{ ...set(80, 5), isCompleted: false }])]),
      ])
    ).to.equal(false);
    expect(WorkoutPost_hasEarlierExercise(second.id, [record(t1, [entry(bench, [])]), first])).to.equal(false);
  });
});

describe("Feed", () => {
  const settings = Settings_build();
  const summary: IWorkoutPostSummary = WorkoutPost_build(
    record(t1, [entry(bench, [set(85, 5)])]),
    settings,
    {},
    undefined
  );
  const friends = Friends_fromServer(
    "me",
    [
      { user_id: "me", handle: "paul", display_name: "Paul" },
      { user_id: "a", handle: "anna", display_name: "Anna" },
      { user_id: "c", handle: "cara", display_name: "Cara" },
    ],
    [
      { requester: "me", addressee: "a", status: "accepted" },
      { requester: "c", addressee: "me", status: "pending" },
    ]
  );
  const row = (userId: string, workoutId: number, postedAt: string): object => ({
    user_id: userId,
    workout_id: workoutId,
    posted_at: postedAt,
    summary,
  });

  it("sorts server posts newest first and names only the user and accepted friends", () => {
    const state = Feed_withServerPosts(
      Feed_empty(),
      "me",
      [
        row("a", 1, "2026-10-08T10:00:00Z"),
        row("me", 2, "2026-10-09T10:00:00Z"),
        row("c", 3, "2026-10-10T10:00:00Z"),
        { user_id: "a", workout_id: 4, posted_at: "2026-10-11T10:00:00Z", summary: { bad: true } },
      ],
      t1
    );
    expect(state.posts.map((p) => p.workoutId)).to.deep.equal([3, 2, 1]);
    const items = Feed_items(state, friends);
    expect(items.map((i) => [i.author.handle, i.isMine])).to.deep.equal([
      ["paul", true],
      ["anna", false],
    ]);
    expect(Feed_items(state, Friends_fromServer("other", [], []))).to.deep.equal([]);
    expect(Feed_parse(JSON.parse(JSON.stringify(state)))).to.deep.equal(state);
  });

  it("keeps one pending change per workout and sends ops only for the account that queued them", () => {
    const post: IFeedOp = { type: "post", userId: "me", workoutId: 7, queuedAt: 1, summary };
    const remove: IFeedOp = { type: "remove", userId: "me", workoutId: 7, queuedAt: 2 };
    let state = Feed_queue(Feed_queue(Feed_empty(), post), remove);
    expect(state.outbox).to.deep.equal([remove]);
    expect(Feed_shareStatus(state, "me", 7)).to.equal("notShared");
    state = Feed_queue(state, { ...post, queuedAt: 3 });
    expect(Feed_shareStatus(state, "me", 7)).to.equal("sending");
    expect(Feed_pendingOps(state, "other")).to.deep.equal([]);
    const op = Feed_pendingOps(state, "me")[0];
    state = Feed_sent(state, op, t1);
    expect(state.outbox).to.deep.equal([]);
    expect(Feed_shareStatus(state, "me", 7)).to.equal("shared");
    state = Feed_sent(Feed_queue(state, { ...remove, queuedAt: 4 }), { ...remove, queuedAt: 4 }, t1);
    expect(Feed_shareStatus(state, "me", 7)).to.equal("notShared");
    expect(Feed_parse(JSON.parse(JSON.stringify(Feed_queue(state, post)))).outbox).to.deep.equal([post]);
  });

  it("keeps a newer toggle queued when an older op finishes sending", () => {
    const older: IFeedOp = { type: "post", userId: "me", workoutId: 7, queuedAt: 1, summary };
    const newer: IFeedOp = { type: "remove", userId: "me", workoutId: 7, queuedAt: 2 };
    const state = Feed_sent(Feed_queue(Feed_empty(), newer), older, t1);
    expect(state.outbox).to.deep.equal([newer]);
  });

  const mealId = "0f8fad5b-d9cb-469f-a165-70867728950e";
  const meal: IMealPostDraft = {
    id: mealId,
    description: "Oats",
    macros: { kcal: 400, protein: 20, carbs: 60, fat: 8 },
  };
  const mealRow = (userId: string, id: string, postedAt: string): object => ({
    id,
    user_id: userId,
    posted_at: postedAt,
    description: "Oats",
    macros: meal.macros,
  });

  it("merges lifts and meals newest first, and gives a meal the author's newest bear", () => {
    const bearSummary = { ...summary, bear: { level: 5, mood: "normal" as const, countedKg: 900 } };
    let state = Feed_withServerPosts(
      Feed_empty(),
      "me",
      [{ ...row("a", 1, "2026-10-08T10:00:00Z"), summary: bearSummary }, row("me", 2, "2026-10-10T10:00:00Z")],
      t1
    );
    state = Feed_withServerMeals(
      state,
      "me",
      Feed_parseMeals([
        mealRow("a", mealId, "2026-10-09T10:00:00Z"),
        mealRow("c", "1f8fad5b-d9cb-469f-a165-70867728950e", "2026-10-11T10:00:00Z"),
      ])
    );
    const items = Feed_items(state, friends);
    expect(items.map((i) => [i.kind, i.author.handle])).to.deep.equal([
      ["workout", "paul"],
      ["meal", "anna"],
      ["workout", "anna"],
    ]);
    expect(items[1].bear).to.deep.equal(bearSummary.bear);
    expect(items.map(Feed_itemKey)).to.deep.equal(["me-2", `meal-${mealId}`, "a-1"]);
    expect(Feed_parse(JSON.parse(JSON.stringify(state)))).to.deep.equal(state);
    expect(Feed_withServerMeals(state, "other", []).meals).to.have.length(2);
    expect(Feed_withServerPosts(state, "other", [], t1).meals).to.deep.equal([]);
  });

  it("queues a meal with its photo, keeps it apart from workout ops, and caches it once sent", () => {
    const photo = "data:image/jpeg;base64,/9j/";
    const op: IFeedOp = { type: "meal", userId: "me", queuedAt: 5, meal, photo };
    const post: IFeedOp = { type: "post", userId: "me", workoutId: 7, queuedAt: 1, summary };
    let state = Feed_queue(Feed_queue(Feed_empty(), post), op);
    expect(Feed_pendingOps(state, "me")).to.deep.equal([post, op]);
    expect(Feed_shareStatus(state, "me", 7)).to.equal("sending");
    expect(Feed_parse(JSON.parse(JSON.stringify(state))).outbox).to.deep.equal([post, op]);
    expect(Feed_parse({ outbox: [{ ...op, photo: "javascript:alert(1)" }] }).outbox).to.deep.equal([
      { type: "meal", userId: "me", queuedAt: 5, meal },
    ]);
    state = Feed_sent(state, op, t1);
    expect(Feed_pendingOps(state, "me")).to.deep.equal([post]);
    expect(state.meals).to.deep.equal([{ ...meal, userId: "me", postedAt: t1, photoPath: `me/${mealId}.jpg` }]);
  });

  it("names the right table when reporting each kind of post", () => {
    const state = Feed_withServerMeals(
      Feed_withServerPosts(Feed_empty(), "me", [{ ...row("a", 1, "2026-10-08T10:00:00Z"), id: 12 }], t1),
      "me",
      Feed_parseMeals([mealRow("a", mealId, "2026-10-09T10:00:00Z")])
    );
    expect(Feed_items(state, friends).map(Feed_reportTarget)).to.deep.equal([
      { kind: "meal", id: mealId },
      { kind: "workout", id: 12 },
    ]);
    const cached = Feed_sent(Feed_empty(), { type: "post", userId: "me", workoutId: 3, queuedAt: 1, summary }, t1);
    expect(Feed_items(cached, friends).map(Feed_reportTarget)).to.deep.equal([undefined]);
  });

  it("refreshes for the TV only when signed in and the cache is old or another account's", () => {
    const loaded = Feed_withServerPosts(Feed_empty(), "me", [], t1);
    expect(Feed_needsRefresh(loaded, undefined, t1)).to.equal(false);
    expect(Feed_needsRefresh(loaded, "me", t1 + 60000)).to.equal(false);
    expect(Feed_needsRefresh(loaded, "me", t1 + 11 * 60000)).to.equal(true);
    expect(Feed_needsRefresh(loaded, "other", t1)).to.equal(true);
    expect(Feed_needsRefresh(Feed_empty(), "me", t1)).to.equal(true);
  });

  it("opens on the friends list until there is a friend, then on the feed", () => {
    expect(Feed_screenView(undefined, 0)).to.equal("people");
    expect(Feed_screenView(undefined, 2)).to.equal("feed");
    expect(Feed_screenView("people", 2)).to.equal("people");
    expect(Feed_screenView("feed", 0)).to.equal("feed");
  });

  it("says how long ago in plain words", () => {
    expect(Feed_ago(t1, t1 + 20000)).to.equal("just now");
    expect(Feed_ago(t1, t1 + 5 * 60000)).to.equal("5 min ago");
    expect(Feed_ago(t1, t1 + 3 * 3600000)).to.equal("3 h ago");
    expect(Feed_ago(t1, t1 + 30 * 3600000)).to.equal("yesterday");
    expect(Feed_ago(t1, t1 + 72 * 3600000)).to.equal("3 days ago");
  });
});

describe("BearTv", () => {
  it("uses the friend's equipped outfit in feed rows and the TV, with mood and space fallbacks", () => {
    const bear = { level: 4, mood: "normal" as const, countedKg: 100, line: "female" as const, equipped: "fitted" };
    expect(BearTv_sprite(bear)).to.equal("/images/bear/female/outfit-mid-fitted.webp");
    expect(BearTv_sprite({ ...bear, mood: "pumped" })).to.equal("/images/bear/female/mood-medium-pumped.webp");
    expect(BearTv_sprite({ ...bear, level: 10 })).to.equal("/images/bear/female/level-10.webp");
    const item = {
      kind: "workout" as const,
      isMine: false,
      bear,
      author: { userId: "friend", handle: "friend", displayName: "Friend" },
      post: {
        userId: "friend",
        workoutId: t0,
        postedAt: t0,
        summary: WorkoutPost_build(record(t0, []), Settings_build(), {}, undefined),
      },
    };
    const screen = BearTv_screen({ signedIn: true, friendCount: 1, items: [item], now: t1 });
    expect(screen.kind).to.equal("post");
    if (screen.kind === "post") {
      expect(screen.sprite).to.equal(BearTv_sprite(bear));
    }
  });
  const settings = Settings_build();
  const summary = {
    ...WorkoutPost_build(record(t1, [entry(bench, [set(85, 5)])]), settings, {}, undefined),
    bear: { level: 4, mood: "hungry" as const, countedKg: 425, line: "female" as const },
  };
  const friends = Friends_fromServer(
    "me",
    [
      { user_id: "me", handle: "paul", display_name: "Paul" },
      { user_id: "a", handle: "victor", display_name: "victor" },
    ],
    [{ requester: "me", addressee: "a", status: "accepted" }]
  );
  const state = Feed_withServerPosts(
    Feed_empty(),
    "me",
    [
      { user_id: "a", workout_id: 1, posted_at: "2026-10-08T10:00:00Z", summary },
      { user_id: "me", workout_id: 2, posted_at: "2026-10-09T10:00:00Z", summary },
    ],
    t1
  );

  it("sits on the TV screen from the gym manifest", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../images/bear/male/manifest.json"), "utf8")
    ) as Record<string, unknown>;
    expect(manifest.tv_safe_rect).to.deep.equal(BearTv_rect);
    expect(BearTv_box(512)).to.deep.equal({ left: 437.5, top: 172.5, width: 62.5, height: 92.5 });
  });

  it("says no friends yet when signed out or alone, and shows the newest friend post otherwise", () => {
    const items = Feed_items(state, friends);
    expect(BearTv_screen({ signedIn: false, friendCount: 1, items, now: t1 }).text).to.equal("No friends yet");
    expect(BearTv_screen({ signedIn: true, friendCount: 0, items: [], now: t1 }).text).to.equal("No friends yet");
    expect(BearTv_screen({ signedIn: true, friendCount: 1, items: items.slice(0, 1), now: t1 }).text).to.equal(
      "No posts yet"
    );
    const screen = BearTv_screen({ signedIn: true, friendCount: 1, items, now: Date.parse("2026-10-08T12:00:00Z") });
    expect(screen).to.deep.equal({
      kind: "post",
      sprite: "/images/bear/female/mood-medium-hungry.webp",
      text: "\u{1F3CB} victor",
      label: "victor lifted: Push · 45 min · 1 set · +425 kg, 2 h ago. Open the feed.",
    });
    expect(BearTv_sprite(undefined)).to.equal("/images/bear/male/level-01.webp");
  });
});

describe("PullToRefresh", () => {
  it("refreshes after a long enough pull that starts at the top", () => {
    let state = PullToRefresh_start(0, 100);
    state = PullToRefresh_move(state, 100 + PullToRefresh_threshold);
    expect(PullToRefresh_end(state).refresh).to.equal(true);
    expect(PullToRefresh_end(PullToRefresh_move(PullToRefresh_start(0, 100), 130)).refresh).to.equal(false);
  });

  it("ignores a pull that starts below the top or moves up", () => {
    expect(PullToRefresh_end(PullToRefresh_move(PullToRefresh_start(40, 100), 400)).refresh).to.equal(false);
    expect(PullToRefresh_move(PullToRefresh_start(0, 300), 100).distance).to.equal(0);
  });
});
