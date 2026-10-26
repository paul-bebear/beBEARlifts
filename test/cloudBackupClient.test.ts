import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  CloudBackupClient_deleteAccount,
  CloudBackupClient_deletePhoto,
  CloudBackupClient_download,
  CloudBackupClient_getPhoto,
  CloudBackupClient_putPhoto,
  CloudBackupClient_saveReplaced,
  CloudBackupClient_sendCode,
  CloudBackupClient_signOut,
  CloudBackupClient_upload,
  CloudBackupClient_verify,
} from "../src/utils/cloudBackupClient";
import { CloudStore, Supabase_origin as CloudBackup_origin } from "../src/utils/supabaseClient";
import { ICloudState } from "../src/models/cloudBackup";
import { AccountDeletion_signInMessage } from "../src/models/accountDeletion";
import { FriendsStore } from "../src/utils/friendsClient";
import { BlocksStore } from "../src/utils/moderationStore";
import { FeedStore } from "../src/utils/feedClient";
import { InviteStore } from "../src/utils/inviteClient";
import { Feed_empty } from "../src/models/feed";

const now = Date.UTC(2026, 9, 20, 18);
const session = {
  email: "paul@example.com",
  userId: "u1",
  accessToken: "a",
  refreshToken: "r",
  expiresAt: now + 3600000,
};

const marks = { exportedAt: "2026-10-20T18:00:00.000Z", workouts: "3:7", stores: "food:1:9" };

describe("CloudBackupClient", () => {
  let state: ICloudState;
  let fetchStub: sinon.SinonStub;
  let stores: Record<"friends" | "blocks" | "feed" | "invite", sinon.SinonStub>;

  beforeEach(() => {
    state = { version: 1, session };
    sinon.stub(Date, "now").returns(now);
    sinon.stub(CloudStore, "load").callsFake(async () => state);
    sinon.stub(CloudStore, "update").callsFake(async (update) => {
      state = update(state);
    });
    stores = {
      friends: sinon.stub(FriendsStore, "update").resolves(),
      blocks: sinon.stub(BlocksStore, "update").resolves(),
      feed: sinon.stub(FeedStore, "update").resolves(),
      invite: sinon.stub(InviteStore, "update").resolves(),
    };
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  it("sends email codes and explains the hourly email limit", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ msg: "Email rate limit exceeded" }), { status: 429 }));
    expect(await CloudBackupClient_sendCode(" paul@example.com ")).to.deep.equal({
      ok: false,
      error: "Too many sign-in emails went out this hour. Try again later.",
    });
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({
      email: "paul@example.com",
      create_user: true,
    });
    expect(fetchStub.firstCall.args[0]).to.equal(`${CloudBackup_origin}/auth/v1/otp`);
  });

  it("verifies email codes and clears another account's backup time", async () => {
    state = { ...state, lastBackupAt: now - 1000 };
    fetchStub.resolves(
      new Response(
        JSON.stringify({
          access_token: "new-a",
          refresh_token: "new-r",
          expires_in: 3600,
          user: { id: "u2", email: "other@example.com" },
        })
      )
    );
    const result = await CloudBackupClient_verify("other@example.com", " 123456 ");
    expect(result.ok).to.equal(true);
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({
      type: "email",
      email: "other@example.com",
      token: "123456",
    });
    expect(state.session?.userId).to.equal("u2");
    expect(state.lastBackupAt).to.equal(undefined);
  });

  it("uploads latest and weekday files with auth and marks success after both", async () => {
    state.restoreOffer = { cloud: { workouts: 2, foodDays: 0 }, phone: { workouts: 1, foodDays: 0 } };
    fetchStub.callsFake(async () => {
      expect(state.lastBackupAt).to.equal(undefined);
      return new Response("{}");
    });
    expect(await CloudBackupClient_upload("backup", marks)).to.deep.equal({ ok: true, value: now });
    expect(state.syncedExportedAt).to.equal(marks.exportedAt);
    expect(state.backedUpWorkouts).to.equal("3:7");
    expect(state.backedUpStores).to.equal("food:1:9");
    expect(state.ownerUserId).to.equal("u1");
    expect(state.restoreOffer).to.equal(undefined);
    expect(fetchStub.firstCall.args[0]).to.equal(`${CloudBackup_origin}/storage/v1/object/backups/u1/latest.json`);
    expect(fetchStub.secondCall.args[0]).to.match(/\/u1\/day-\d.json$/);
    const request = fetchStub.firstCall.args[1] as RequestInit;
    expect(request.body).to.equal("backup");
    expect(request.headers).to.include({
      Authorization: "Bearer a",
      "x-upsert": "true",
      "Content-Type": "application/json",
    });
    expect(state.lastBackupAt).to.equal(now);
  });

  it("leaves the last backup time unchanged when either upload fails", async () => {
    state.lastBackupAt = now - 1000;
    fetchStub.onFirstCall().resolves(new Response("{}"));
    fetchStub.onSecondCall().resolves(new Response(JSON.stringify({ message: "Quota exceeded" }), { status: 413 }));
    expect(await CloudBackupClient_upload("backup", marks)).to.deep.equal({ ok: false, error: "Quota exceeded" });
    expect(state.lastBackupAt).to.equal(now - 1000);
    fetchStub.reset();
    fetchStub.resolves(new Response(JSON.stringify({ message: "Permission denied" }), { status: 403 }));
    expect(await CloudBackupClient_upload("backup", marks)).to.deep.equal({ ok: false, error: "Permission denied" });
    expect(fetchStub.callCount).to.equal(1);
    expect(state.lastBackupAt).to.equal(now - 1000);
    expect(state.syncedExportedAt).to.equal(undefined);
  });

  it("saves the replaced backup and downloads an older copy by weekday", async () => {
    fetchStub.onFirstCall().resolves(new Response("{}"));
    fetchStub.onSecondCall().resolves(new Response("monday"));
    expect(await CloudBackupClient_saveReplaced("old")).to.deep.equal({ ok: true, value: undefined });
    expect(fetchStub.firstCall.args[0]).to.equal(`${CloudBackup_origin}/storage/v1/object/backups/u1/replaced.json`);
    expect(fetchStub.firstCall.args[1].body).to.equal("old");
    expect(await CloudBackupClient_download("day-1")).to.deep.equal({ ok: true, value: "monday" });
    expect(fetchStub.secondCall.args[0]).to.equal(
      `${CloudBackup_origin}/storage/v1/object/authenticated/backups/u1/day-1.json`
    );
  });

  it("refreshes expired tokens before downloading and keeps the backup time", async () => {
    state = { ...state, session: { ...session, expiresAt: now }, lastBackupAt: now - 1000 };
    fetchStub.onFirstCall().resolves(
      new Response(
        JSON.stringify({
          access_token: "refreshed",
          refresh_token: "next-r",
          expires_in: 3600,
          user: { id: "u1", email: session.email },
        })
      )
    );
    fetchStub.onSecondCall().resolves(new Response("backup"));
    expect(await CloudBackupClient_download()).to.deep.equal({ ok: true, value: "backup" });
    expect(fetchStub.firstCall.args[0]).to.include("grant_type=refresh_token");
    expect(fetchStub.secondCall.args[1].headers.Authorization).to.equal("Bearer refreshed");
    expect(state.session?.refreshToken).to.equal("next-r");
    expect(state.lastBackupAt).to.equal(now - 1000);
  });

  it("treats only the missing-object error as an absent backup", async () => {
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify({ message: "Object not found" }), { status: 400 }));
    fetchStub
      .onSecondCall()
      .resolves(new Response(JSON.stringify({ message: "Error 400: bad request" }), { status: 400 }));
    expect(await CloudBackupClient_download()).to.deep.equal({ ok: true, value: undefined });
    expect(await CloudBackupClient_download()).to.deep.equal({ ok: false, error: "Error 400: bad request" });
  });

  it("handles offline requests and refuses uploads after sign-out", async () => {
    fetchStub.rejects(new TypeError("Failed to fetch"));
    expect(await CloudBackupClient_download()).to.deep.equal({ ok: false, error: "No connection" });
    await CloudBackupClient_signOut();
    fetchStub.resetHistory();
    expect(await CloudBackupClient_upload("backup", marks)).to.deep.equal({ ok: false, error: "Not signed in" });
    expect(fetchStub.called).to.equal(false);
    expect(state).to.deep.equal({ version: 1 });
  });

  it("ends only this phone's session on sign-out and clears friends' cached posts", async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));
    await CloudBackupClient_signOut();
    expect(fetchStub.firstCall.args[0]).to.equal(`${CloudBackup_origin}/auth/v1/logout?scope=local`);
    expect(fetchStub.firstCall.args[1].headers.Authorization).to.equal("Bearer a");
    expect(state).to.deep.equal({ version: 1 });
    expect(stores.feed.firstCall.args[0]({ posts: [1] })).to.deep.equal(Feed_empty());
    expect(stores.invite.firstCall.args[0]({ handle: "x" })).to.deep.equal({});
    expect(stores.friends.calledOnce).to.equal(true);
    expect(stores.blocks.calledOnce).to.equal(true);
  });

  it("keeps the owner of this phone's data through sign-out", async () => {
    state = { ...state, ownerUserId: "u1", lastBackupAt: now, syncedExportedAt: "x", uploadedPhotos: [5] };
    fetchStub.resolves(new Response(null, { status: 204 }));
    await CloudBackupClient_signOut();
    expect(state).to.deep.equal({ version: 1, ownerUserId: "u1", uploadedPhotos: [5] });
  });

  it("uploads, downloads and deletes a progress photo under photos/", async () => {
    fetchStub.resolves(new Response("{}"));
    const bytes = new Uint8Array([255, 216, 255]);
    expect(await CloudBackupClient_putPhoto("u1", 42, bytes)).to.deep.equal({ ok: true, value: undefined });
    expect(fetchStub.firstCall.args[0]).to.equal(`${CloudBackup_origin}/storage/v1/object/backups/u1/photos/42.jpg`);
    expect(fetchStub.firstCall.args[1].headers).to.include({ "Content-Type": "image/jpeg", "x-upsert": "true" });
    expect(fetchStub.firstCall.args[1].body).to.equal(bytes);

    fetchStub.resolves(new Response(bytes));
    const got = await CloudBackupClient_getPhoto("u1", 42);
    expect(got.ok && Array.from(got.value ?? [])).to.deep.equal([255, 216, 255]);
    expect(fetchStub.secondCall.args[0]).to.equal(
      `${CloudBackup_origin}/storage/v1/object/authenticated/backups/u1/photos/42.jpg`
    );

    fetchStub.callsFake(async () => new Response(JSON.stringify({ message: "Object not found" }), { status: 400 }));
    expect(await CloudBackupClient_getPhoto("u1", 43)).to.deep.equal({ ok: true, value: undefined });
    expect(await CloudBackupClient_deletePhoto("u1", 43)).to.deep.equal({ ok: true, value: undefined });
    expect(fetchStub.lastCall.args[1].method).to.equal("DELETE");
  });

  it("deletes the account through the API and clears the cloud, friends and blocks caches only on success", async () => {
    const { friends, blocks, feed } = stores;
    fetchStub.resolves(new Response(JSON.stringify({ error: "Could not delete the account" }), { status: 502 }));
    expect(await CloudBackupClient_deleteAccount()).to.deep.equal({
      ok: false,
      error: "Could not delete the account",
    });
    expect(fetchStub.firstCall.args[0]).to.equal("/api/account/delete");
    expect(fetchStub.firstCall.args[1].headers.Authorization).to.equal("Bearer a");
    expect(state.session).to.deep.equal(session);
    expect(friends.called).to.equal(false);

    fetchStub.resolves(new Response(JSON.stringify({ deleted: true })));
    expect(await CloudBackupClient_deleteAccount()).to.deep.equal({ ok: true, value: undefined });
    expect(state).to.deep.equal({ version: 1 });
    expect(friends.calledOnce).to.equal(true);
    expect(blocks.calledOnce).to.equal(true);
    expect(feed.calledOnce).to.equal(true);

    fetchStub.resetHistory();
    expect(await CloudBackupClient_deleteAccount()).to.deep.equal({
      ok: false,
      error: AccountDeletion_signInMessage,
    });
    expect(fetchStub.called).to.equal(false);
  });
});
