import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import * as dialog from "../src/utils/dialog";
import * as feedClient from "../src/utils/feedClient";
import * as friendsClient from "../src/utils/friendsClient";
import {
  ModerationCommand_block,
  ModerationCommand_report,
  ModerationCommand_unblock,
} from "../src/utils/moderationCommand";

const user = { userId: "u1", displayName: "Anna" };

describe("ModerationCommand", () => {
  let confirm: sinon.SinonStub;
  let alert: sinon.SinonStub;

  beforeEach(() => {
    confirm = sinon.stub(dialog, "Dialog_confirm").resolves(true);
    alert = sinon.stub(dialog, "Dialog_alert");
  });
  afterEach(() => sinon.restore());

  describe("report", () => {
    it("closes the sheet with a thank you when the report is sent", async () => {
      const report = sinon.stub(feedClient, "FeedClient_report").resolves({ ok: true, value: undefined });
      const outcome = await ModerationCommand_report({ kind: "workout", id: 4 }, "spam", "note");
      expect(outcome).to.deep.equal({ message: "Thanks, we'll review it", keepOpen: false });
      expect(report.firstCall.args).to.deep.equal([{ kind: "workout", id: 4 }, "spam", "note"]);
    });

    it("keeps the sheet open with the server error", async () => {
      sinon.stub(feedClient, "FeedClient_report").resolves({ ok: false, error: "No connection" });
      expect(await ModerationCommand_report({ kind: "meal", id: "m" }, "abuse", "")).to.deep.equal({
        message: "No connection",
        keepOpen: true,
      });
    });

    it("says so when the post was reported before", async () => {
      sinon.stub(feedClient, "FeedClient_report").resolves({
        ok: false,
        error: 'duplicate key value violates unique constraint "post_reports_reporter_post"',
      });
      expect((await ModerationCommand_report({ kind: "workout", id: 4 }, "spam", "")).message).to.equal(
        "You already reported this post"
      );
    });

    it("turns a thrown error into a retry message", async () => {
      sinon.stub(feedClient, "FeedClient_report").rejects(new Error("boom"));
      expect(await ModerationCommand_report(undefined, "spam", "")).to.deep.equal({
        message: "Could not send the report. Try again.",
        keepOpen: true,
      });
    });
  });

  describe("block", () => {
    it("asks first and does nothing when the user cancels", async () => {
      confirm.resolves(false);
      const block = sinon.stub(friendsClient, "FriendsClient_block");
      await ModerationCommand_block(user);
      expect(confirm.firstCall.args[0]).to.equal(
        "Block Anna? Their posts will disappear and your friendship will be removed."
      );
      expect(block.called).to.equal(false);
      expect(alert.called).to.equal(false);
    });

    it("blocks after a yes without an alert", async () => {
      const block = sinon.stub(friendsClient, "FriendsClient_block").resolves({ ok: true, value: undefined });
      await ModerationCommand_block(user);
      expect(block.firstCall.args).to.deep.equal([user]);
      expect(alert.called).to.equal(false);
    });

    it("alerts the server error", async () => {
      sinon.stub(friendsClient, "FriendsClient_block").resolves({ ok: false, error: "No connection" });
      await ModerationCommand_block(user);
      expect(alert.firstCall.args).to.deep.equal(["No connection"]);
    });

    it("alerts a retry message when the call throws", async () => {
      sinon.stub(friendsClient, "FriendsClient_block").rejects(new Error("boom"));
      await ModerationCommand_block(user);
      expect(alert.firstCall.args).to.deep.equal(["Could not block this user. Try again."]);
    });
  });

  describe("unblock", () => {
    it("does nothing when the user cancels", async () => {
      confirm.resolves(false);
      const unblock = sinon.stub(friendsClient, "FriendsClient_unblock");
      await ModerationCommand_unblock(user);
      expect(confirm.firstCall.args[0]).to.equal("Unblock Anna? Add each other as friends again to see their posts.");
      expect(unblock.called).to.equal(false);
    });

    it("unblocks by user id after a yes", async () => {
      const unblock = sinon.stub(friendsClient, "FriendsClient_unblock").resolves({ ok: true, value: undefined });
      await ModerationCommand_unblock(user);
      expect(unblock.firstCall.args).to.deep.equal(["u1"]);
      expect(alert.called).to.equal(false);
    });

    it("alerts the server error", async () => {
      sinon.stub(friendsClient, "FriendsClient_unblock").resolves({ ok: false, error: "No connection" });
      await ModerationCommand_unblock(user);
      expect(alert.firstCall.args).to.deep.equal(["No connection"]);
    });

    it("alerts a retry message when the call throws", async () => {
      sinon.stub(friendsClient, "FriendsClient_unblock").rejects(new Error("boom"));
      await ModerationCommand_unblock(user);
      expect(alert.firstCall.args).to.deep.equal(["Could not unblock this user. Try again."]);
    });
  });
});
