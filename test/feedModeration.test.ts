import "mocha";
import { expect } from "chai";
import {
  FeedModeration_empty,
  FeedModeration_alreadyReportedText,
  FeedModeration_filter,
  FeedModeration_items,
  FeedModeration_fromServer,
  FeedModeration_menu,
  FeedModeration_parse,
  FeedModeration_reasons,
  FeedModeration_reportError,
  FeedModeration_users,
  FeedModeration_reportOutcome,
} from "../src/models/feedModeration";
import { IFeedItem } from "../src/models/feed";

describe("Feed moderation", () => {
  it("offers no moderation on your own post, and Remove only on your own meal", () => {
    expect(FeedModeration_menu({ isMine: true, kind: "workout" })).to.deep.equal([]);
    expect(FeedModeration_menu({ isMine: true, kind: "meal" })).to.deep.equal(["Remove post"]);
    expect(FeedModeration_menu({ isMine: false, kind: "meal" })).to.deep.equal(["Report post", "Block user"]);
    expect(FeedModeration_menu({ isMine: false, kind: "workout" })).to.deep.equal(["Report post", "Block user"]);
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

  it("hides posts of blocked users and keeps item order", () => {
    const author = { userId: "a", handle: "a", displayName: "A" };
    const mine = { userId: "me", handle: "me", displayName: "Me" };
    const item = (userId: string, workoutId: number): IFeedItem =>
      ({
        kind: "workout",
        author: userId === "a" ? author : mine,
        isMine: userId === "me",
        post: { userId, workoutId, postedAt: 1 },
      }) as unknown as IFeedItem;
    const items = [item("a", 1), item("me", 2), item("a", 3)];
    expect(FeedModeration_items(items, [{ userId: "a", displayName: "A" }])).to.deep.equal([items[1]]);
    expect(FeedModeration_items(items, [])).to.deep.equal(items);
    const copied = [items[0], { ...items[1], post: { ...items[1].post } } as IFeedItem];
    expect(FeedModeration_items(copied, [{ userId: "a", displayName: "A" }])).to.deep.equal([copied[1]]);
  });

  it("says a second report of the same post was already sent", () => {
    const duplicate = 'duplicate key value violates unique constraint "post_reports_reporter_post"';
    expect(FeedModeration_alreadyReportedText(duplicate)).to.equal("You already reported this post");
    expect(
      FeedModeration_alreadyReportedText(
        'duplicate key value violates unique constraint "post_reports_reporter_meal_post"'
      )
    ).to.equal("You already reported this post");
    expect(FeedModeration_alreadyReportedText("No connection")).to.equal("No connection");
    expect(FeedModeration_reportOutcome({ ok: false, error: duplicate })).to.deep.equal({
      message: "You already reported this post",
      keepOpen: true,
    });
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
