import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { InviteClient_request, InviteClient_save, InviteStore } from "../src/utils/inviteClient";
import * as friends from "../src/utils/friendsClient";
import { Friends_empty } from "../src/models/friends";

describe("Invite client", () => {
  afterEach(() => sinon.restore());
  it("never saves the invite in a Safari tab for transfer to the Home Screen app", async () => {
    sinon.stub(globalThis, "navigator").value({ standalone: false });
    const update = sinon.stub(InviteStore, "update");
    await InviteClient_save("paul");
    expect(update.called).to.equal(false);
  });
  it("saves a validated handle in standalone storage", async () => {
    sinon.stub(globalThis, "navigator").value({ standalone: true });
    let saved: { handle?: string } = {};
    sinon.stub(InviteStore, "update").callsFake(async (fn) => {
      saved = fn(saved);
    });
    await InviteClient_save("paul");
    expect(saved.handle).to.equal("paul");
  });
  it("retains a failed request for retry and clears only the successfully sent handle", async () => {
    sinon.stub(friends, "FriendsClient_load").resolves({
      ok: true,
      value: {
        ...Friends_empty(),
        userId: "u1",
        me: { userId: "u1", handle: "mine", displayName: "Mine" },
      },
    });
    let pending: { handle?: string } = { handle: "paul" };
    const request = sinon.stub(friends, "FriendsClient_request").resolves({ ok: false, error: "No connection" });
    const update = sinon.stub(InviteStore, "update").callsFake(async (fn) => {
      pending = fn(pending);
    });
    expect(await InviteClient_request("paul")).to.include({ ok: false });
    expect(update.called).to.equal(false);
    request.resolves({ ok: true, value: "pending" });
    await InviteClient_request("paul");
    expect(pending.handle).to.equal(undefined);
    pending = { handle: "new_person" };
    await InviteClient_request("paul");
    expect(pending.handle).to.equal("new_person");
  });
  it("creates the required profile before requesting a friend for a new account", async () => {
    sinon
      .stub(friends, "FriendsClient_load")
      .resolves({ ok: true, value: { ...Friends_empty(), userId: "account-id" } });
    const save = sinon.stub(friends, "FriendsClient_saveProfile").resolves({ ok: true, value: undefined });
    const request = sinon.stub(friends, "FriendsClient_request").resolves({ ok: true, value: "pending" });
    sinon.stub(InviteStore, "update").resolves();
    expect(await InviteClient_request("paul")).to.include({ ok: true });
    expect(save.firstCall.args).to.deep.equal(["lifter_accountid", "Lifter", true]);
    expect(save.calledBefore(request)).to.equal(true);
  });
  it("keeps an invite pending when the new profile cannot be created", async () => {
    sinon
      .stub(friends, "FriendsClient_load")
      .resolves({ ok: true, value: { ...Friends_empty(), userId: "account-id" } });
    sinon.stub(friends, "FriendsClient_saveProfile").resolves({ ok: false, error: "No connection" });
    const request = sinon.stub(friends, "FriendsClient_request");
    const update = sinon.stub(InviteStore, "update");
    expect(await InviteClient_request("paul")).to.include({ ok: false });
    expect(request.called).to.equal(false);
    expect(update.called).to.equal(false);
  });
});
