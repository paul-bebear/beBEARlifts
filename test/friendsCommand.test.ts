import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import * as feedClient from "../src/utils/feedClient";
import * as friendsClient from "../src/utils/friendsClient";
import { FriendsCommand_run } from "../src/utils/friendsCommand";
import { IFriendsCommand, IFriendsFormEvent } from "../src/models/friendsForm";
import { Friends_empty } from "../src/models/friends";

const done = { ok: true as const, value: undefined };

async function run(command: IFriendsCommand): Promise<IFriendsFormEvent[]> {
  const events: IFriendsFormEvent[] = [];
  await FriendsCommand_run(command, (e) => events.push(e));
  return events;
}

describe("FriendsCommand_run", () => {
  let load: sinon.SinonStub;

  beforeEach(() => {
    load = sinon.stub(friendsClient, "FriendsClient_load").resolves({ ok: true, value: Friends_empty() });
  });
  afterEach(() => sinon.restore());

  describe("load", () => {
    it("loads blocks, then friends, then the feed, and ends done", async () => {
      const blocks = sinon.stub(friendsClient, "FriendsClient_loadBlocks").resolves(done);
      const refresh = sinon.stub(feedClient, "FeedClient_refresh").resolves(done);
      expect(await run({ type: "load" })).to.deep.equal([{ type: "done" }]);
      sinon.assert.callOrder(blocks, load, refresh);
    });

    it("stops at the first failing step", async () => {
      sinon.stub(friendsClient, "FriendsClient_loadBlocks").resolves({ ok: false, error: "No connection" });
      const refresh = sinon.stub(feedClient, "FeedClient_refresh").resolves(done);
      expect(await run({ type: "load" })).to.deep.equal([{ type: "failed", error: "No connection" }]);
      expect(load.called).to.equal(false);
      expect(refresh.called).to.equal(false);
    });

    it("reports a feed failure", async () => {
      sinon.stub(friendsClient, "FriendsClient_loadBlocks").resolves(done);
      sinon.stub(feedClient, "FeedClient_refresh").resolves({ ok: false, error: "Feed down" });
      expect(await run({ type: "load" })).to.deep.equal([{ type: "failed", error: "Feed down" }]);
    });
  });

  it("saves the profile, reloads the lists and says so", async () => {
    const save = sinon.stub(friendsClient, "FriendsClient_saveProfile").resolves(done);
    const events = await run({ type: "saveProfile", handle: "paul", displayName: "Paul", isNew: true });
    expect(events).to.deep.equal([{ type: "done", message: "Profile saved." }]);
    expect(save.firstCall.args).to.deep.equal(["paul", "Paul", true]);
    expect(load.calledOnce).to.equal(true);
  });

  it("shows a taken handle in plain words and skips the reload", async () => {
    sinon.stub(friendsClient, "FriendsClient_saveProfile").resolves({
      ok: false,
      error: 'duplicate key value violates unique constraint "profiles_handle_key"',
    });
    expect(await run({ type: "saveProfile", handle: "paul", displayName: "P", isNew: false })).to.deep.equal([
      { type: "failed", error: "Someone already has that handle." },
    ]);
    expect(load.called).to.equal(false);
  });

  it("reports a failed reload after a save", async () => {
    sinon.stub(friendsClient, "FriendsClient_saveProfile").resolves(done);
    load.resolves({ ok: false, error: "No connection" });
    expect(await run({ type: "saveProfile", handle: "p", displayName: "P", isNew: false })).to.deep.equal([
      { type: "failed", error: "No connection" },
    ]);
  });

  describe("find", () => {
    it("emits the found profile, or none", async () => {
      const find = sinon.stub(friendsClient, "FriendsClient_find");
      find.onFirstCall().resolves({ ok: true, value: { handle: "anna", displayName: "Anna" } });
      find.onSecondCall().resolves({ ok: true, value: undefined });
      expect(await run({ type: "find", handle: "anna" })).to.deep.equal([
        { type: "found", profile: { handle: "anna", displayName: "Anna" } },
      ]);
      expect(await run({ type: "find", handle: "nobody" })).to.deep.equal([{ type: "found", profile: undefined }]);
      expect(load.called).to.equal(false);
    });

    it("emits the failure", async () => {
      sinon.stub(friendsClient, "FriendsClient_find").resolves({ ok: false, error: "No connection" });
      expect(await run({ type: "find", handle: "x" })).to.deep.equal([{ type: "failed", error: "No connection" }]);
    });
  });

  describe("request", () => {
    it("reloads and passes the new status on", async () => {
      const request = sinon.stub(friendsClient, "FriendsClient_request").resolves({ ok: true, value: "pending" });
      expect(await run({ type: "request", handle: "anna" })).to.deep.equal([{ type: "requested", status: "pending" }]);
      expect(request.firstCall.args).to.deep.equal(["anna"]);
      expect(load.calledOnce).to.equal(true);
    });

    it("emits the failure and skips the reload", async () => {
      sinon.stub(friendsClient, "FriendsClient_request").resolves({ ok: false, error: "Too many requests" });
      expect(await run({ type: "request", handle: "anna" })).to.deep.equal([
        { type: "failed", error: "Too many requests" },
      ]);
      expect(load.called).to.equal(false);
    });
  });

  it("accepts and removes by user id, then reloads", async () => {
    const accept = sinon.stub(friendsClient, "FriendsClient_accept").resolves(done);
    const remove = sinon.stub(friendsClient, "FriendsClient_remove").resolves(done);
    expect(await run({ type: "accept", userId: "u1" })).to.deep.equal([{ type: "done", message: undefined }]);
    expect(await run({ type: "remove", userId: "u2" })).to.deep.equal([{ type: "done", message: undefined }]);
    expect(accept.firstCall.args).to.deep.equal(["u1"]);
    expect(remove.firstCall.args).to.deep.equal(["u2"]);
    expect(load.calledTwice).to.equal(true);
  });

  it("turns a thrown error into a failed event", async () => {
    sinon.stub(friendsClient, "FriendsClient_accept").rejects(new Error("boom"));
    expect(await run({ type: "accept", userId: "u1" })).to.deep.equal([{ type: "failed", error: "boom" }]);
    sinon.restore();
    sinon.stub(friendsClient, "FriendsClient_remove").callsFake(() => Promise.reject("text"));
    expect(await run({ type: "remove", userId: "u1" })).to.deep.equal([
      { type: "failed", error: "Friends request failed" },
    ]);
  });
});
