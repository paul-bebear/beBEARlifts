import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { InviteClient_run, InviteClient_save, InviteStore } from "../src/utils/inviteClient";
import * as friends from "../src/utils/friendsClient";
import { Friends_empty } from "../src/models/friends";
import { IInviteEvent } from "../src/models/invite";

async function run(command: Parameters<typeof InviteClient_run>[0]): Promise<IInviteEvent[]> {
  const events: IInviteEvent[] = [];
  await InviteClient_run(command, (e) => events.push(e));
  return events;
}

describe("Invite client", () => {
  afterEach(() => sinon.restore());
  it("saves a validated handle in every browser context and ignores an invalid one", async () => {
    let saved: { handle?: string } = {};
    const update = sinon.stub(InviteStore, "update").callsFake(async (fn) => {
      saved = fn(saved);
    });
    await InviteClient_save("bad handle");
    expect(update.called).to.equal(false);
    await InviteClient_save("paul");
    expect(saved.handle).to.equal("paul");
  });
  it("checks the friends list and the handle without creating a profile or sending a request", async () => {
    sinon.stub(friends, "FriendsClient_load").resolves({ ok: true, value: { ...Friends_empty(), userId: "u1" } });
    sinon.stub(friends, "FriendsClient_find").resolves({ ok: true, value: { handle: "paul", displayName: "Paul" } });
    const save = sinon.stub(friends, "FriendsClient_saveProfile");
    const request = sinon.stub(friends, "FriendsClient_request");
    expect(await run({ type: "check", handle: "paul" })).to.deep.equal([
      { type: "checked", result: { kind: "needsProfile", inviter: { handle: "paul", displayName: "Paul" } } },
    ]);
    expect(save.called).to.equal(false);
    expect(request.called).to.equal(false);
  });
  it("saves the handle the user picked and reports a taken handle in plain words", async () => {
    const save = sinon
      .stub(friends, "FriendsClient_saveProfile")
      .resolves({ ok: false, error: 'duplicate key value violates unique constraint "profiles_handle_key"' });
    expect(await run({ type: "saveProfile", handle: "anna", displayName: "Anna" })).to.deep.equal([
      { type: "failed", error: "Someone already has that handle." },
    ]);
    expect(save.firstCall.args).to.deep.equal(["anna", "Anna", true]);
  });
  it("clears only the handle it was asked to forget", async () => {
    let pending: { handle?: string } = { handle: "new_person" };
    sinon.stub(InviteStore, "update").callsFake(async (fn) => {
      pending = fn(pending);
    });
    await run({ type: "forget", handle: "paul" });
    expect(pending.handle).to.equal("new_person");
    await run({ type: "forget", handle: "new_person" });
    expect(pending.handle).to.equal(undefined);
  });
  it("passes the connection error through so the flow can offer Retry", async () => {
    sinon.stub(friends, "FriendsClient_request").resolves({ ok: false, error: "No connection" });
    expect(await run({ type: "send", handle: "paul" })).to.deep.equal([{ type: "failed", error: "No connection" }]);
  });
});
