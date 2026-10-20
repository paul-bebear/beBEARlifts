import "mocha";
import { expect } from "chai";
import { FeedList_empty, FeedList_fail, FeedList_receive, FeedList_remove, FeedList_start } from "../src/models/feedList";
import { IFeedPost } from "../src/models/feedPost";

function post(id: string): IFeedPost {
  return {
    id,
    authorId: "u1",
    username: "anna",
    createdAt: "2026-10-20T10:00:00.000Z",
    audience: "friends",
    content: {
      kind: "meal",
      payload: {
        v: 1,
        day: "2026-10-20",
        meal: "lunch",
        items: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      },
    },
  };
}

const cursor = { createdAt: "2026-10-20T09:00:00.000Z", id: "b" };

describe("FeedList", () => {
  it("refreshes, then loads more from the cursor and skips duplicates", () => {
    const first = FeedList_start(FeedList_empty(), "refresh");
    expect(first.cursor).to.equal(undefined);
    expect(first.state.status).to.equal("loading");
    const loaded = FeedList_receive(first.state, first.requestId!, { posts: [post("a"), post("b")], next: cursor }, "refresh");
    expect(loaded.isEnd).to.equal(false);

    const more = FeedList_start(loaded, "more");
    expect(more.cursor).to.deep.equal(cursor);
    const all = FeedList_receive(more.state, more.requestId!, { posts: [post("b"), post("c")] }, "more");
    expect(all.posts.map((p) => p.id)).to.deep.equal(["a", "b", "c"]);
    expect(all.isEnd).to.equal(true);
  });

  it("does nothing on load more while loading or at the end", () => {
    const loading = FeedList_start(FeedList_empty(), "refresh").state;
    expect(FeedList_start(loading, "more").requestId).to.equal(undefined);
    const ended = { ...FeedList_empty(), isEnd: true };
    expect(FeedList_start(ended, "more").requestId).to.equal(undefined);
  });

  it("drops a reply for an older request", () => {
    const first = FeedList_start(FeedList_empty(), "refresh");
    const second = FeedList_start(first.state, "refresh");
    const stale = FeedList_receive(second.state, first.requestId!, { posts: [post("old")] }, "refresh");
    expect(stale).to.equal(second.state);
    expect(FeedList_fail(second.state, first.requestId!, "No connection")).to.equal(second.state);
    expect(FeedList_fail(second.state, second.requestId!, "No connection").status).to.equal("error");
  });

  it("removes a deleted post", () => {
    const first = FeedList_start(FeedList_empty(), "refresh");
    const loaded = FeedList_receive(first.state, first.requestId!, { posts: [post("a"), post("b")] }, "refresh");
    expect(FeedList_remove(loaded, "a").posts.map((p) => p.id)).to.deep.equal(["b"]);
  });
});
