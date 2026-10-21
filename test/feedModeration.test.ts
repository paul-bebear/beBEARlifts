import "mocha";
import { expect } from "chai";
import {
  FeedModeration_empty,
  FeedModeration_filter,
  FeedModeration_fromServer,
  FeedModeration_menu,
  FeedModeration_parse,
  FeedModeration_reasons,
  FeedModeration_reportError,
  FeedModeration_users,
  FeedModeration_reportOutcome,
} from "../src/models/feedModeration";

describe("Feed moderation", () => {
  it("offers no moderation menu on your own post", () => {
    expect(FeedModeration_menu({ isMine: true })).to.deep.equal([]);
    expect(FeedModeration_menu({ isMine: false })).to.deep.equal(["Report post", "Block user"]);
  });

  it("filters every cached post from blocked users without changing the cache", () => {
    const posts = [
      { userId: "a", workoutId: 1 },
      { userId: "me", workoutId: 2 },
      { userId: "a", workoutId: 3 },
    ];
    expect(FeedModeration_filter(posts, [{ userId: "a", displayName: "A" }])).to.deep.equal([posts[1]]);
    expect(posts).to.have.length(3);
    expect(FeedModeration_filter(posts, [])).to.deep.equal(posts);
  });

  it("keeps block lists scoped to the signed-in account", () => {
    const state = FeedModeration_fromServer("me", [{ blocked_id: "a", blocked: { display_name: "Anna" } }, null]);
    expect(FeedModeration_users(state, "me")).to.deep.equal([{ userId: "a", displayName: "Anna" }]);
    expect(FeedModeration_users(state, "other")).to.deep.equal([]);
    expect(FeedModeration_users(state)).to.deep.equal([]);
    expect(FeedModeration_parse(JSON.parse(JSON.stringify(state)))).to.deep.equal(state);
    expect(FeedModeration_parse({ users: [null] })).to.deep.equal(FeedModeration_empty());
    expect(FeedModeration_parse({ version: 1, userId: "me", users: [null, {}, "bad"] }).users).to.deep.equal([]);
  });

  it("validates the reason and optional note", () => {
    expect(FeedModeration_reasons).to.deep.equal(["spam", "abuse", "other"]);
    for (const reason of FeedModeration_reasons) {
      expect(FeedModeration_reportError(reason, "")).to.equal(undefined);
    }
    expect(FeedModeration_reportError("invalid", "")).to.be.a("string");
    expect(FeedModeration_reportError("spam", "x".repeat(2001))).to.be.a("string");
  });

  it("closes a sent report and keeps a failed report open for retry", () => {
    expect(FeedModeration_reportOutcome({ ok: true })).to.deep.equal({
      message: "Thanks, we'll review it",
      keepOpen: false,
    });
    expect(FeedModeration_reportOutcome({ ok: false, error: "Offline" })).to.deep.equal({
      message: "Offline",
      keepOpen: true,
    });
  });
});
