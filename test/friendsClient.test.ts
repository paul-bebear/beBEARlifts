import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  FriendsClient_accept,
  FriendsClient_find,
  FriendsClient_load,
  FriendsClient_remove,
  FriendsClient_request,
  FriendsClient_saveProfile,
  FriendsStore,
} from "../src/utils/friendsClient";
import { CloudStore, Supabase_origin } from "../src/utils/supabaseClient";
import { Friends_empty, IFriendsState } from "../src/models/friends";

const now = Date.UTC(2026, 9, 21, 18);
const session = {
  email: "paul@example.com",
  userId: "me",
  accessToken: "a",
  refreshToken: "r",
  expiresAt: now + 3600000,
};

describe("FriendsClient", () => {
  let fetchStub: sinon.SinonStub;
  let saved: IFriendsState;

  beforeEach(() => {
    saved = Friends_empty();
    sinon.stub(Date, "now").returns(now);
    sinon.stub(CloudStore, "load").resolves({ version: 1, session });
    sinon.stub(FriendsStore, "update").callsFake(async (fn) => {
      saved = fn(saved);
    });
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  function call(i: number): { url: string; init: RequestInit } {
    const [url, init] = fetchStub.getCall(i).args;
    return { url: String(url).replace(Supabase_origin, ""), init };
  }

  it("loads profiles and friendships with the user's token and caches the joined lists", async () => {
    fetchStub
      .onFirstCall()
      .resolves(new Response(JSON.stringify([{ user_id: "me", handle: "paul", display_name: "P" }])));
    fetchStub.onSecondCall().resolves(new Response("[]"));
    const result = await FriendsClient_load();
    expect(result.ok).to.equal(true);
    expect(call(0).url).to.equal("/rest/v1/profiles?select=user_id,handle,display_name");
    expect(call(1).url).to.equal("/rest/v1/friendships?select=requester,addressee,status,created_at");
    expect((call(0).init.headers as Record<string, string>).Authorization).to.equal("Bearer a");
    expect(saved.me?.handle).to.equal("paul");
  });

  it("keeps the cache when a read fails", async () => {
    fetchStub.rejects(new TypeError("offline"));
    expect(await FriendsClient_load()).to.deep.equal({ ok: false, error: "No connection" });
    expect(saved).to.deep.equal(Friends_empty());
  });

  it("creates a profile, then edits only the user's own row", async () => {
    fetchStub.resolves(new Response(null, { status: 201 }));
    await FriendsClient_saveProfile("paul", "Paul", true);
    expect(call(0).url).to.equal("/rest/v1/profiles");
    expect(call(0).init.method).to.equal("POST");
    expect(JSON.parse(String(call(0).init.body))).to.deep.equal({ handle: "paul", display_name: "Paul" });
    await FriendsClient_saveProfile("paul2", "Paul", false);
    expect(call(1).url).to.equal("/rest/v1/profiles?user_id=eq.me");
    expect(call(1).init.method).to.equal("PATCH");
  });

  it("finds and requests through the two functions, never a profile select", async () => {
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify([{ handle: "anna", display_name: "Anna" }])));
    fetchStub.onSecondCall().resolves(new Response("[]"));
    fetchStub.onThirdCall().resolves(new Response(JSON.stringify("accepted")));
    expect(await FriendsClient_find("anna")).to.deep.equal({
      ok: true,
      value: { handle: "anna", displayName: "Anna" },
    });
    expect(await FriendsClient_find("zed")).to.deep.equal({ ok: true, value: undefined });
    expect(await FriendsClient_request("anna")).to.deep.equal({ ok: true, value: "accepted" });
    expect(call(0).url).to.equal("/rest/v1/rpc/find_profile");
    expect(call(2).url).to.equal("/rest/v1/rpc/request_friend");
    expect(JSON.parse(String(call(2).init.body))).to.deep.equal({ p_handle: "anna" });
  });

  it("shows the server's reason when a request fails", async () => {
    fetchStub.resolves(
      new Response(JSON.stringify({ code: "P0001", message: "Pick a handle first" }), { status: 400 })
    );
    expect(await FriendsClient_request("anna")).to.deep.equal({ ok: false, error: "Pick a handle first" });
  });

  it("accepts and removes by the other user's id", async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));
    await FriendsClient_accept("a");
    await FriendsClient_remove("a");
    expect(call(0).url).to.equal("/rest/v1/friendships?requester=eq.a");
    expect(JSON.parse(String(call(0).init.body))).to.deep.equal({ status: "accepted" });
    expect(call(1).url).to.equal("/rest/v1/friendships?or=(requester.eq.a,addressee.eq.a)");
    expect(call(1).init.method).to.equal("DELETE");
  });
});
