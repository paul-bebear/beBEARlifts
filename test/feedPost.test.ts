import "mocha";
import { expect } from "chai";
import {
  FeedPost_fromMeal,
  FeedPost_fromWorkout,
  FeedPost_mealKey,
  FeedPost_music,
  FeedPost_pageSize,
  FeedPost_parse,
  FeedPost_parsePage,
  FeedPost_trackUrl,
  FeedPost_withMusic,
  FeedPost_workoutKey,
  IFeedWorkoutPayload,
} from "../src/models/feedPost";
import { IMusicSession } from "../src/models/musicSession";
import { IFoodEntry } from "../src/models/foodLog";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { IHistoryEntry, IHistoryRecord, ISet } from "../src/types";

const settings = { ...Settings_build(), units: "kg" as const };
const trackId = "4uLU6hMCjMI75M1A2tKUQC";
const otherTrackId = "7GhIk7Il098yCjg4BQjzvb";
const playlistUrl = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M";

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

function entry(id: string, exerciseId: string, sets: ISet[]): IHistoryEntry {
  return {
    vtype: "history_entry",
    id,
    index: 0,
    exercise: { id: exerciseId, equipment: "barbell" },
    warmupSets: [],
    sets,
  } as IHistoryEntry;
}

function record(id: number, entries: IHistoryEntry[], startTime: number = 0): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(startTime).toISOString(),
    programId: "adhoc",
    programName: "Ad-Hoc",
    day: 1,
    dayName: "Push",
    id,
    startTime,
    endTime: startTime + 62 * 60 * 1000,
    entries,
  } as IHistoryRecord;
}

function session(overrides: Partial<IMusicSession> = {}): IMusicSession {
  const track = (id: string, uri: string): IMusicSession["plays"][number]["track"] => ({
    id,
    uri,
    name: `Song ${id}`,
    artists: "Artist",
    durationMs: 200000,
    imageUrl: "https://i.scdn.co/image/abc",
  });
  return {
    id: 5,
    startedAt: 0,
    plays: [
      { track: track(trackId, `spotify:track:${trackId}`), startedAt: 0, heardMs: 200000, source: "live", isKept: true },
      { track: track("local1", "spotify:local:a:b:c:1"), startedAt: 1, heardMs: 200000, source: "live", isKept: true },
      {
        track: track(otherTrackId, `spotify:track:${otherTrackId}`),
        startedAt: 2,
        heardMs: 1000,
        source: "live",
        isKept: false,
      },
    ],
    ...overrides,
  };
}

function workoutRow(payload: unknown, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "p1",
    author_id: "u1",
    kind: "workout",
    visibility: "friends",
    comment: "Felt strong",
    created_at: "2026-10-20T10:00:00.000Z",
    payload,
    profiles: { username: "anna" },
    ...overrides,
  };
}

const workout = record(5, [
  entry("bench", "benchPress", [set(10, 60), set(8, 60), set(5, 80, false)]),
  entry("squat", "squat", [set(5, 100)]),
  entry("skipped", "deadlift", [set(5, 120, false)]),
]);

describe("FeedPost builders", () => {
  it("builds the client keys", () => {
    expect(FeedPost_workoutKey(5)).to.equal("workout:5");
    expect(FeedPost_mealKey("2026-10-20", "lunch")).to.equal("meal:2026-10-20:lunch");
    expect(FeedPost_trackUrl(`spotify:track:${trackId}`)).to.equal(`https://open.spotify.com/track/${trackId}`);
  });

  it("summarizes a workout with its exercises, PRs and kept songs", () => {
    const draft = FeedPost_fromWorkout(workout, [workout], settings, session({ playlistUrl }));
    expect(draft.kind).to.equal("workout");
    expect(draft.clientKey).to.equal("workout:5");
    const payload = draft.payload as IFeedWorkoutPayload;
    expect(payload.dayName).to.equal("Push");
    expect(payload.durationMs).to.equal(62 * 60 * 1000);
    expect(payload.sets).to.equal(3);
    expect(payload.volume).to.deep.equal({ value: 1580, unit: "kg" });
    expect(payload.exercises.map((e) => [e.name, e.sets])).to.deep.equal([
      ["Bench Press", 2],
      ["Squat", 1],
    ]);
    expect(payload.exercises[0].best).to.deep.equal({ weight: { value: 60, unit: "kg" }, reps: 10 });
    expect(payload.prs.filter((p) => p.kind === "weight").map((p) => p.exercise)).to.have.members([
      "Bench Press",
      "Squat",
    ]);
    expect(payload.music?.tracks.map((t) => t.uri)).to.deep.equal([`spotify:track:${trackId}`]);
    expect(payload.music?.playlistUrl).to.equal(playlistUrl);
  });

  it("counts only this workout's PRs and leaves music out when nothing was kept", () => {
    const earlier = record(4, [entry("bench", "benchPress", [set(10, 100)])], -1000000);
    const draft = FeedPost_fromWorkout(workout, [workout, earlier], settings, undefined);
    const payload = draft.payload as IFeedWorkoutPayload;
    expect(payload.prs.map((p) => p.exercise)).to.deep.equal(["Squat", "Squat"]);
    expect(payload.music).to.equal(undefined);
  });

  it("keeps the 5 exercises with the most sets", () => {
    const many = record(
      9,
      [1, 2, 3, 4, 5, 6].map((n) =>
        entry(`e${n}`, "benchPress", Array.from({ length: n }, () => set(5, 50)))
      )
    );
    const payload = FeedPost_fromWorkout(many, [many], settings, undefined).payload as IFeedWorkoutPayload;
    expect(payload.exercises.map((e) => e.sets)).to.deep.equal([6, 5, 4, 3, 2]);
  });

  it("drops a playlist link that is not a Spotify playlist", () => {
    expect(FeedPost_music(session({ playlistUrl: "https://evil.example/playlist" }))?.playlistUrl).to.equal(undefined);
    expect(FeedPost_music(session({ plays: [] }))).to.equal(undefined);
    expect(FeedPost_music(session({ plays: [], playlistUrl }))).to.deep.equal({ tracks: [], playlistUrl });
  });

  it("builds a meal post with optional grams and returns nothing for an empty meal", () => {
    const entries: IFoodEntry[] = [
      {
        id: "1",
        day: "2026-10-20",
        meal: "lunch",
        name: "Rice",
        source: "manual",
        grams: 150.4,
        nutrients: { calories: 195, protein: 4, carbs: 42, fat: 0.4 },
        createdAt: 0,
      },
      {
        id: "2",
        day: "2026-10-20",
        meal: "lunch",
        name: "Apple",
        source: "manual",
        nutrients: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
        createdAt: 0,
      },
      {
        id: "3",
        day: "2026-10-20",
        meal: "dinner",
        name: "Steak",
        source: "manual",
        nutrients: { calories: 500, protein: 50, carbs: 0, fat: 30 },
        createdAt: 0,
      },
    ];
    const draft = FeedPost_fromMeal("2026-10-20", "lunch", entries);
    expect(draft?.clientKey).to.equal("meal:2026-10-20:lunch");
    expect(draft?.payload).to.deep.include({ day: "2026-10-20", meal: "lunch" });
    expect(draft?.kind === "meal" ? draft.payload.items : []).to.deep.equal([
      { name: "Rice", grams: 150, calories: 195 },
      { name: "Apple", calories: 95 },
    ]);
    expect(draft?.kind === "meal" ? draft.payload.totals.calories : 0).to.equal(290);
    expect(FeedPost_fromMeal("2026-10-20", "breakfast", entries)).to.equal(undefined);
  });
});

describe("FeedPost_parse", () => {
  const payload = FeedPost_fromWorkout(workout, [workout], settings, session({ playlistUrl })).payload;

  it("round-trips a workout post built by this app", () => {
    const post = FeedPost_parse(workoutRow(payload));
    expect(post?.username).to.equal("anna");
    expect(post?.audience).to.equal("friends");
    expect(post?.comment).to.equal("Felt strong");
    expect(post?.content).to.deep.equal({ kind: "workout", payload });
  });

  it("round-trips a meal post", () => {
    const meal = {
      v: 1,
      day: "2026-10-20",
      meal: "lunch",
      items: [{ name: "Rice", calories: 195 }],
      totals: { calories: 195, protein: 4, carbs: 42, fat: 0.4 },
    };
    expect(FeedPost_parse(workoutRow(meal, { kind: "meal", visibility: "public" }))?.content).to.deep.equal({
      kind: "meal",
      payload: meal,
    });
  });

  it("drops rows with an unknown kind, version, audience or a missing username", () => {
    expect(FeedPost_parse(workoutRow(payload, { kind: "music" }))).to.equal(undefined);
    expect(FeedPost_parse(workoutRow({ ...payload, v: 2 }))).to.equal(undefined);
    expect(FeedPost_parse(workoutRow(payload, { visibility: "everyone" }))).to.equal(undefined);
    expect(FeedPost_parse(workoutRow(payload, { profiles: null }))).to.equal(undefined);
    expect(FeedPost_parse(workoutRow([payload]))).to.equal(undefined);
  });

  it("drops rows whose songs or images point outside Spotify", () => {
    const music = (track: Record<string, unknown>): unknown => ({ ...payload, music: { tracks: [track] } });
    const good = { uri: `spotify:track:${trackId}`, name: "Song", artists: "Artist" };
    expect(FeedPost_parse(workoutRow(music(good)))).to.not.equal(undefined);
    expect(FeedPost_parse(workoutRow(music({ ...good, uri: "spotify:track:short" })))).to.equal(undefined);
    expect(FeedPost_parse(workoutRow(music({ ...good, uri: `https://evil.example/${trackId}` })))).to.equal(
      undefined
    );
    expect(FeedPost_parse(workoutRow(music({ ...good, imageUrl: "https://evil.example/a.png" })))).to.equal(
      undefined
    );
    expect(
      FeedPost_parse(workoutRow({ ...payload, music: { tracks: [], playlistUrl: "javascript:alert(1)" } }))
    ).to.equal(undefined);
  });

  it("drops a comment over 500 characters but keeps the post", () => {
    const post = FeedPost_parse(workoutRow(payload, { comment: "x".repeat(501) }));
    expect(post).to.not.equal(undefined);
    expect(post?.comment).to.equal(undefined);
  });

  it("adds music to an existing workout payload", () => {
    const music = { tracks: [], playlistUrl };
    expect(FeedPost_withMusic(payload, music)?.music).to.deep.equal(music);
    expect(FeedPost_withMusic({ v: 1 }, music)).to.equal(undefined);
  });
});

describe("FeedPost_parsePage", () => {
  const payload = FeedPost_fromWorkout(workout, [workout], settings, undefined).payload;
  const rows = Array.from({ length: FeedPost_pageSize }, (_, i) =>
    workoutRow(payload, { id: `p${i}`, created_at: `2026-10-20T10:00:${String(59 - i).padStart(2, "0")}.000Z` })
  );

  it("moves the cursor past a last row that failed to parse", () => {
    const broken = [...rows.slice(0, -1), { ...rows[rows.length - 1], kind: "future" }];
    const page = FeedPost_parsePage(broken);
    expect(page.posts).to.have.length(FeedPost_pageSize - 1);
    expect(page.next).to.deep.equal({ id: `p${FeedPost_pageSize - 1}`, createdAt: "2026-10-20T10:00:40.000Z" });
  });

  it("has no next cursor on a short page", () => {
    expect(FeedPost_parsePage(rows.slice(0, 3)).next).to.equal(undefined);
  });
});
