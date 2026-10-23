import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  FeedClient_flush,
  FeedClient_refresh,
  FeedClient_report,
  FeedClient_setShared,
  FeedClient_shareMeal,
  FeedStore,
} from "../src/utils/feedClient";
import { CloudStore, Supabase_origin } from "../src/utils/supabaseClient";
import { Feed_empty, IFeedState } from "../src/models/feed";
import { IWorkoutPostSummary } from "../src/models/workoutPost";
import { IMealPostDraft } from "../src/models/mealPost";
import { BearStore } from "../src/utils/bearStore";
import { BearStoreData_empty, IBearStoreData } from "../src/models/bearStoreData";
import { BearHoney_share } from "../src/models/bearHoney";

const now = Date.UTC(2026, 9, 21, 18);
const session = {
  email: "paul@example.com",
  userId: "me",
  accessToken: "a",
  refreshToken: "r",
  expiresAt: now + 3600000,
};
const summary: IWorkoutPostSummary = {
  version: 1,
  dayName: "Push",
  startedAt: now - 3600000,
  durationMs: 3000000,
  volume: { value: 5000, unit: "kg" },
  sets: 12,
  topSets: [],
  prs: [],
  songs: [],
};
const mealId = "0f8fad5b-d9cb-469f-a165-70867728950e";
const meal: IMealPostDraft = { id: mealId, description: "Oats", macros: { kcal: 400, protein: 20, carbs: 60, fat: 8 } };
const photo = "data:image/jpeg;base64,/9j/";

describe("FeedClient", () => {
  let fetchStub: sinon.SinonStub;
  let feed: IFeedState;
  let bear: IBearStoreData;
  let bearUpdate: sinon.SinonStub;

  beforeEach(() => {
    feed = Feed_empty();
    bear = BearStoreData_empty();
    bearUpdate = sinon.stub(BearStore, "update").callsFake(async (fn) => {
      bear = fn(bear);
    });
    sinon.stub(Date, "now").returns(now);
    sinon.stub(CloudStore, "load").resolves({ version: 1, session });
    sinon.stub(FeedStore, "load").callsFake(async () => feed);
    sinon.stub(FeedStore, "update").callsFake(async (fn) => {
      feed = fn(feed);
    });
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  function url(i: number): string {
    return String(fetchStub.getCall(i).args[0]).replace(Supabase_origin, "");
  }

  it("upserts a shared workout and shows it as the user's post", async () => {
    fetchStub.resolves(new Response(null, { status: 201 }));
    expect(await FeedClient_setShared(7, summary)).to.deep.equal({ ok: true, value: undefined });
    expect(url(0)).to.equal("/rest/v1/workout_posts?on_conflict=user_id,workout_id");
    const init = fetchStub.firstCall.args[1] as RequestInit;
    expect(JSON.parse(String(init.body))).to.deep.equal({ workout_id: 7, summary });
    expect((init.headers as Record<string, string>).Prefer).to.equal("resolution=merge-duplicates,return=minimal");
    expect(feed.outbox).to.deep.equal([]);
    expect(feed.posts.map((p) => [p.userId, p.workoutId])).to.deep.equal([["me", 7]]);
    expect(bear.sharedPosts).to.deep.equal([BearHoney_share("workout", "me", 7, now)]);
  });

  it("reports by the server post id and trims the optional note", async () => {
    fetchStub.resolves(new Response(null, { status: 201 }));
    const target = { kind: "workout" as const, id: 42 };
    expect(await FeedClient_report(target, "abuse", "  note  ")).to.deep.equal({ ok: true, value: undefined });
    expect(url(0)).to.equal("/rest/v1/post_reports");
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({ post_id: 42, reason: "abuse", note: "note" });
    expect(fetchStub.firstCall.args[1].headers.Prefer).to.equal("return=minimal");
  });

  it("reports a meal by its meal post id", async () => {
    fetchStub.resolves(new Response(null, { status: 201 }));
    await FeedClient_report({ kind: "meal", id: mealId }, "spam", "");
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({
      meal_post_id: mealId,
      reason: "spam",
      note: null,
    });
  });

  it("does not acknowledge an unsent report", async () => {
    expect((await FeedClient_report(undefined, "spam", "")).ok).to.equal(false);
    expect(fetchStub.called).to.equal(false);
    fetchStub.rejects(new TypeError("offline"));
    expect(await FeedClient_report({ kind: "workout", id: 42 }, "spam", "")).to.deep.equal({
      ok: false,
      error: "No connection",
    });
  });

  it("uploads the meal photo to the owner's folder, then inserts the row", async () => {
    fetchStub.callsFake(async () => new Response(null, { status: 201 }));
    await FeedClient_shareMeal(meal, photo);
    await FeedClient_flush();
    expect(url(0)).to.equal(`/storage/v1/object/meal-photos/me/${mealId}.jpg`);
    const upload = fetchStub.firstCall.args[1];
    expect(upload.headers["Content-Type"]).to.equal("image/jpeg");
    expect(upload.headers["x-upsert"]).to.equal("true");
    expect(Array.from(upload.body as Uint8Array)).to.deep.equal([255, 216, 255]);
    expect(url(1)).to.equal("/rest/v1/meal_posts?on_conflict=id");
    expect(JSON.parse(fetchStub.secondCall.args[1].body)).to.deep.equal({
      ...meal,
      photo_path: `me/${mealId}.jpg`,
    });
    expect(fetchStub.secondCall.args[1].headers.Prefer).to.equal("resolution=ignore-duplicates,return=minimal");
    expect(feed.outbox).to.deep.equal([]);
    expect(feed.meals.map((m) => m.id)).to.deep.equal([mealId]);
    expect(bear.sharedPosts).to.deep.equal([BearHoney_share("meal", "me", mealId, now)]);
  });

  it("posts a meal without a photo with no upload", async () => {
    fetchStub.callsFake(async () => new Response(null, { status: 201 }));
    await FeedClient_shareMeal(meal, undefined);
    await FeedClient_flush();
    expect(fetchStub.callCount).to.equal(1);
    expect(JSON.parse(fetchStub.firstCall.args[1].body).photo_path).to.equal(null);
  });

  it("keeps a refused meal queued without holding back a workout post", async () => {
    fetchStub.callsFake(async (input: string) =>
      String(input).includes("meal_posts")
        ? new Response(JSON.stringify({ message: "relation does not exist" }), { status: 404 })
        : new Response(null, { status: 201 })
    );
    feed = { ...feed, outbox: [{ type: "meal", userId: "me", queuedAt: 1, meal }] };
    await FeedClient_setShared(7, summary);
    expect(feed.outbox.map((o) => o.type)).to.deep.equal(["meal"]);
    expect(feed.posts.map((p) => p.workoutId)).to.deep.equal([7]);
    expect(bear.sharedPosts).to.deep.equal([BearHoney_share("workout", "me", 7, now)]);
  });

  it("keeps the post queued offline and sends it on the next flush", async () => {
    fetchStub.rejects(new TypeError("offline"));
    expect(await FeedClient_setShared(7, summary)).to.deep.equal({ ok: false, error: "No connection" });
    expect(feed.outbox).to.have.length(1);
    expect(bear.sharedPosts).to.equal(undefined);
    fetchStub.reset();
    fetchStub.resolves(new Response(null, { status: 201 }));
    await Promise.all([FeedClient_flush(), FeedClient_flush()]);
    expect(fetchStub.callCount).to.equal(1);
    expect(feed.outbox).to.deep.equal([]);
    expect(bear.sharedPosts).to.deep.equal([BearHoney_share("workout", "me", 7, now)]);
  });

  it("deletes a post when the toggle goes off", async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));
    await FeedClient_setShared(7, undefined);
    expect(url(0)).to.equal("/rest/v1/workout_posts?workout_id=eq.7");
    expect(fetchStub.firstCall.args[1].method).to.equal("DELETE");
  });

  it("records old own shares before refresh drops them and excludes friends", async () => {
    feed = {
      ...feed,
      userId: "me",
      posts: [
        { userId: "me", workoutId: 7, postedAt: now, summary },
        { userId: "friend", workoutId: 8, postedAt: now, summary },
      ],
      meals: [{ ...meal, userId: "me", postedAt: now }],
    };
    fetchStub.callsFake(async () => new Response("[]"));
    await FeedClient_refresh();
    expect(feed.posts).to.deep.equal([]);
    expect(feed.meals).to.deep.equal([]);
    expect(bear.sharedPosts).to.deep.equal([
      BearHoney_share("workout", "me", 7, now),
      BearHoney_share("meal", "me", mealId, now),
    ]);
  });

  it("keeps one reward when a workout is removed and then shared again", async () => {
    fetchStub.callsFake(async () => new Response(null, { status: 201 }));
    await FeedClient_setShared(7, summary);
    await FeedClient_setShared(7, undefined);
    expect(feed.posts).to.deep.equal([]);
    await FeedClient_setShared(7, summary);
    expect(bear.sharedPosts).to.deep.equal([BearHoney_share("workout", "me", 7, now)]);
  });

  it("keeps a sent post queued when saving its honey fails, so retry saves the reward once", async () => {
    fetchStub.callsFake(async () => new Response(null, { status: 201 }));
    bearUpdate.onSecondCall().rejects(new Error("full"));
    expect(await FeedClient_setShared(7, summary).catch((error) => error.message)).to.equal("full");
    expect(feed.outbox).to.have.length(1);
    expect(feed.posts).to.deep.equal([]);
    await FeedClient_flush();
    expect(feed.outbox).to.deep.equal([]);
    expect(bear.sharedPosts).to.deep.equal([BearHoney_share("workout", "me", 7, now)]);
  });

  it("loads meals with signed photo URLs after the workouts", async () => {
    const mealRow = {
      id: mealId,
      user_id: "a",
      posted_at: "2026-10-21T09:00:00Z",
      description: "Oats",
      macros: meal.macros,
      photo_path: `a/${mealId}.jpg`,
    };
    const signedURL = `/object/sign/meal-photos/a/${mealId}.jpg?token=t`;
    fetchStub.callsFake(async (input: string) => {
      const u = String(input);
      return new Response(
        JSON.stringify(
          u.includes("workout_posts")
            ? []
            : u.includes("meal_posts")
              ? [mealRow]
              : [{ path: mealRow.photo_path, signedURL }]
        )
      );
    });
    await FeedClient_refresh();
    expect(url(1)).to.equal(
      "/rest/v1/meal_posts?select=id,user_id,posted_at,description,macros,photo_path&order=posted_at.desc&limit=50"
    );
    expect(url(2)).to.equal("/storage/v1/object/sign/meal-photos");
    expect(JSON.parse(fetchStub.thirdCall.args[1].body)).to.deep.equal({
      expiresIn: 21600,
      paths: [`a/${mealId}.jpg`],
    });
    expect(feed.meals.map((m) => m.photoUrl)).to.deep.equal([`${Supabase_origin}/storage/v1${signedURL}`]);
  });

  it("keeps the workout feed when the meal table is missing", async () => {
    fetchStub.callsFake(async (input: string) =>
      String(input).includes("meal_posts")
        ? new Response(JSON.stringify({ message: "relation does not exist" }), { status: 404 })
        : new Response(JSON.stringify([{ user_id: "a", workout_id: 1, posted_at: "2026-10-20T10:00:00Z", summary }]))
    );
    expect(await FeedClient_refresh()).to.deep.equal({ ok: true, value: undefined });
    expect(feed.posts.map((p) => p.workoutId)).to.deep.equal([1]);
    expect(feed.meals).to.deep.equal([]);
  });

  it("refreshes the feed newest first after sending the outbox", async () => {
    fetchStub.resolves(
      new Response(
        JSON.stringify([
          { user_id: "a", workout_id: 1, posted_at: "2026-10-20T10:00:00Z", summary },
          { user_id: "me", workout_id: 2, posted_at: "2026-10-21T10:00:00Z", summary },
        ])
      )
    );
    expect(await FeedClient_refresh()).to.deep.equal({ ok: true, value: undefined });
    expect(url(0)).to.equal(
      "/rest/v1/workout_posts?select=id,user_id,workout_id,posted_at,summary&order=posted_at.desc&limit=50"
    );
    expect(feed.posts.map((p) => p.workoutId)).to.deep.equal([2, 1]);
    expect(feed).to.include({ userId: "me", loadedAt: now });
  });
});
