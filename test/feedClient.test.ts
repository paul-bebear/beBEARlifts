import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  FeedClient_flush,
  FeedClient_refresh,
  FeedClient_setShared,
  FeedClient_shareOnFinish,
  FeedStore,
} from "../src/utils/feedClient";
import { CloudStore, Supabase_origin } from "../src/utils/supabaseClient";
import { Feed_empty, IFeedState } from "../src/models/feed";
import { IWorkoutPostSummary } from "../src/models/workoutPost";

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
};

describe("FeedClient", () => {
  let fetchStub: sinon.SinonStub;
  let feed: IFeedState;

  beforeEach(() => {
    feed = Feed_empty();
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

  it("upserts a shared workout, remembers the choice and shows it as the user's post", async () => {
    fetchStub.resolves(new Response(null, { status: 201 }));
    expect(await FeedClient_setShared(7, summary)).to.deep.equal({ ok: true, value: undefined });
    expect(url(0)).to.equal("/rest/v1/workout_posts?on_conflict=user_id,workout_id");
    const init = fetchStub.firstCall.args[1] as RequestInit;
    expect(JSON.parse(String(init.body))).to.deep.equal({ workout_id: 7, summary });
    expect((init.headers as Record<string, string>).Prefer).to.equal("resolution=merge-duplicates,return=minimal");
    expect(feed.shareByDefault).to.equal(true);
    expect(feed.outbox).to.deep.equal([]);
    expect(feed.posts.map((p) => [p.userId, p.workoutId])).to.deep.equal([["me", 7]]);
  });

  it("keeps the post queued offline and sends it on the next flush", async () => {
    fetchStub.rejects(new TypeError("offline"));
    expect(await FeedClient_setShared(7, summary)).to.deep.equal({ ok: false, error: "No connection" });
    expect(feed.outbox).to.have.length(1);
    fetchStub.reset();
    fetchStub.resolves(new Response(null, { status: 201 }));
    await Promise.all([FeedClient_flush(), FeedClient_flush()]);
    expect(fetchStub.callCount).to.equal(1);
    expect(feed.outbox).to.deep.equal([]);
  });

  it("deletes a post when the toggle goes off and remembers off", async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));
    await FeedClient_setShared(7, undefined);
    expect(url(0)).to.equal("/rest/v1/workout_posts?workout_id=eq.7");
    expect(fetchStub.firstCall.args[1].method).to.equal("DELETE");
    expect(feed.shareByDefault).to.equal(false);
  });

  it("shares on finish only when the user chose sharing before", async () => {
    fetchStub.resolves(new Response(null, { status: 201 }));
    const build = sinon.stub().resolves(summary);
    await FeedClient_shareOnFinish(7, build);
    expect(build.called).to.equal(false);
    feed = { ...feed, shareByDefault: true };
    await FeedClient_shareOnFinish(7, build);
    await FeedClient_shareOnFinish(7, build);
    expect(build.callCount).to.equal(1);
    expect(fetchStub.callCount).to.equal(1);
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
      "/rest/v1/workout_posts?select=user_id,workout_id,posted_at,summary&order=posted_at.desc&limit=50"
    );
    expect(feed.posts.map((p) => p.workoutId)).to.deep.equal([2, 1]);
    expect(feed).to.include({ userId: "me", loadedAt: now });
  });
});
