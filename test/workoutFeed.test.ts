import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { History_getPersonalRecords } from "../src/models/history";
import { IExerciseType, IHistoryEntry, IHistoryRecord, ISet } from "../src/types";
import {
  WorkoutPost_build,
  WorkoutPost_parse,
  WorkoutPost_setText,
  WorkoutPost_statsLine,
  IWorkoutPostSummary,
} from "../src/models/workoutPost";
import {
  Feed_ago,
  Feed_empty,
  Feed_items,
  Feed_nextOp,
  Feed_parse,
  Feed_queue,
  Feed_sent,
  Feed_setShareByDefault,
  Feed_shareStatus,
  Feed_shouldShareOnFinish,
  Feed_withServerPosts,
  IFeedOp,
} from "../src/models/feed";
import { Friends_fromServer } from "../src/models/friends";
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

describe("WorkoutPost", () => {
  const settings = { ...Settings_build(), units: "kg" as const };
  const first = record(t0, [entry(bench, [set(80, 5)]), entry(squat, [set(100, 5)])]);
  const second = record(t1, [entry(bench, [set(85, 5), set(80, 8)]), entry(squat, [set(90, 5)]), entry(bench, [])]);
  const history = [second, first];

  it("summarizes totals, top sets and only the records that beat an earlier set", () => {
    const summary = WorkoutPost_build(second, settings, History_getPersonalRecords(history), 4);
    expect(summary).to.deep.include({ dayName: "Push", programName: "Strong", startedAt: t1, sets: 3, keptSongs: 4 });
    expect(summary.durationMs).to.equal(45 * 60000);
    expect(summary.volume).to.deep.equal({ value: 85 * 5 + 80 * 8 + 90 * 5, unit: "kg" });
    expect(summary.topSets.map(WorkoutPost_setText)).to.deep.equal(["Bench Press 85 kg × 5", "Squat 90 kg × 5"]);
    expect(summary.prs.map(WorkoutPost_setText)).to.deep.equal(["Bench Press 85 kg × 5"]);
    const firstPost = WorkoutPost_build(first, settings, History_getPersonalRecords(history), 0);
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
    const summary = WorkoutPost_build(second, settings, {}, 2);
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
});

describe("Feed", () => {
  const settings = Settings_build();
  const summary: IWorkoutPostSummary = WorkoutPost_build(record(t1, [entry(bench, [set(85, 5)])]), settings, {}, 0);
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
    expect(Feed_nextOp(state, "other")).to.equal(undefined);
    const op = Feed_nextOp(state, "me")!;
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

  it("shares on finish only after the user chose sharing once, and never twice", () => {
    expect(Feed_shouldShareOnFinish(Feed_empty(), "me", 7)).to.equal(false);
    const on = Feed_setShareByDefault(Feed_empty(), true);
    expect(Feed_shouldShareOnFinish(on, "me", 7)).to.equal(true);
    const sent = Feed_sent(on, { type: "post", userId: "me", workoutId: 7, queuedAt: 1, summary }, t1);
    expect(Feed_shouldShareOnFinish(sent, "me", 7)).to.equal(false);
    expect(Feed_parse(JSON.parse(JSON.stringify(sent))).shareByDefault).to.equal(true);
  });

  it("says how long ago in plain words", () => {
    expect(Feed_ago(t1, t1 + 20000)).to.equal("just now");
    expect(Feed_ago(t1, t1 + 5 * 60000)).to.equal("5 min ago");
    expect(Feed_ago(t1, t1 + 3 * 3600000)).to.equal("3 h ago");
    expect(Feed_ago(t1, t1 + 30 * 3600000)).to.equal("yesterday");
    expect(Feed_ago(t1, t1 + 72 * 3600000)).to.equal("3 days ago");
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
