import "mocha";
import { expect } from "chai";
import {
  IInviteFlow,
  Invite_check,
  Invite_empty,
  Invite_fromUrl,
  Invite_isIos,
  Invite_link,
  Invite_parseHandle,
  Invite_reduce,
  Invite_surface,
} from "../src/models/invite";
import { Friends_empty, IFriendsState } from "../src/models/friends";

const paul = { handle: "paul", displayName: "Paul" };
const me = { userId: "u1", handle: "mine", displayName: "Mine" };

function friendsWith(links: IFriendsState["links"], withProfile = true): IFriendsState {
  return { ...Friends_empty(), userId: "u1", me: withProfile ? me : undefined, links };
}

function link(status: "pending" | "accepted", incoming: boolean): IFriendsState["links"][number] {
  return { other: { userId: "p1", ...paul }, status, incoming, createdAt: "" };
}

function signedInWith(handle: string): IInviteFlow {
  return Invite_reduce(Invite_empty(), { type: "pending", handle, signedIn: true });
}

describe("Invites", () => {
  it("accepts only exact lowercase handles with 3 to 20 characters", () => {
    expect(Invite_parseHandle("paul_123")).to.equal("paul_123");
    for (const raw of [undefined, {}, "ab", "a".repeat(21), "Paul", " paul", "<script>", "a-b"]) {
      expect(Invite_parseHandle(raw)).to.equal(undefined);
    }
  });
  it("reads one URL parameter and rejects ambiguous or malformed links", () => {
    expect(Invite_fromUrl("https://lifts.paulbebear.com/app/?invite=paul_123")).to.equal("paul_123");
    expect(Invite_fromUrl("https://host/app/?invite=paul&invite=someone")).to.equal(undefined);
    expect(Invite_fromUrl("https://host/app/?invite=%3Cscript%3E")).to.equal(undefined);
    expect(Invite_fromUrl("broken")).to.equal(undefined);
  });
  it("builds a share link that the URL reader accepts", () => {
    const url = Invite_link("https://lifts.paulbebear.com", "paul_123");
    expect(Invite_fromUrl(url)).to.equal("paul_123");
  });
  it("shows the install guide in any browser tab, with or without an invite", () => {
    const base = { offline: true, standalone: false, historyCount: 0, programCount: 0 };
    expect(Invite_surface({ ...base, handle: "paul", historyCount: 4 })).to.equal("guide");
    expect(Invite_surface(base)).to.equal("guide");
    expect(Invite_surface({ ...base, openHere: true })).to.equal("chat");
    expect(Invite_surface({ ...base, standalone: true, handle: "paul" })).to.equal("chat");
  });
  it("keeps returning users and online builds in the app", () => {
    expect(Invite_surface({ offline: true, standalone: true, historyCount: 1, programCount: 0 })).to.equal("app");
    expect(Invite_surface({ offline: true, standalone: true, historyCount: 0, programCount: 1 })).to.equal("app");
    expect(
      Invite_surface({ offline: false, standalone: false, handle: "paul", historyCount: 0, programCount: 0 })
    ).to.equal("app");
  });
  it("detects iPhones and iPads that report a desktop platform", () => {
    expect(Invite_isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone", 5)).to.equal(true);
    expect(Invite_isIos("Mozilla/5.0 (Macintosh)", "MacIntel", 5)).to.equal(true);
    expect(Invite_isIos("Mozilla/5.0 (Macintosh)", "MacIntel", 0)).to.equal(false);
    expect(Invite_isIos("Mozilla/5.0 (Linux; Android 15)", "Linux armv8l", 5)).to.equal(false);
  });

  describe("check", () => {
    it("never sends when the inviter already asked, so acceptance stays an explicit tap", () => {
      expect(Invite_check("paul", friendsWith([link("pending", true)]), paul)).to.deep.equal({
        kind: "incoming",
        inviter: { ...paul, userId: "p1" },
      });
    });
    it("asks a new account for its own handle before the request", () => {
      expect(Invite_check("paul", friendsWith([], false), paul).kind).to.equal("needsProfile");
      expect(Invite_check("paul", friendsWith([]), paul).kind).to.equal("confirm");
    });
    it("does nothing for friends, sent requests and the user's own handle", () => {
      expect(Invite_check("paul", friendsWith([link("accepted", false)]), paul).kind).to.equal("nothingToDo");
      expect(Invite_check("paul", friendsWith([link("pending", false)]), paul).kind).to.equal("nothingToDo");
      expect(Invite_check("mine", friendsWith([]), { handle: "mine", displayName: "Mine" }).kind).to.equal(
        "nothingToDo"
      );
      expect(Invite_check("pual", friendsWith([]), undefined).kind).to.equal("notFound");
    });
  });

  describe("flow", () => {
    it("waits for sign-in, then checks the pending handle", () => {
      let flow = Invite_reduce(Invite_empty(), { type: "pending", handle: "paul", signedIn: false });
      expect(flow.step).to.equal("idle");
      expect(flow.command).to.equal(undefined);
      flow = Invite_reduce(flow, { type: "pending", handle: "paul", signedIn: true });
      expect(flow.step).to.equal("checking");
      expect(flow.command).to.deep.equal({ type: "check", handle: "paul" });
    });
    it("asks for a handle, validates it, then confirms before sending", () => {
      let flow = Invite_reduce(signedInWith("paul"), {
        type: "checked",
        result: { kind: "needsProfile", inviter: paul },
      });
      expect(flow.step).to.equal("profile");
      flow = Invite_reduce(flow, { type: "send" });
      expect(flow.command).to.equal(undefined);
      flow = Invite_reduce(flow, { type: "myHandle", value: "a" });
      flow = Invite_reduce(flow, { type: "saveProfile" });
      expect(flow.error).to.equal("A handle has 3 to 20 characters.");
      flow = Invite_reduce(flow, { type: "myHandle", value: "@Anna_K" });
      flow = Invite_reduce(flow, { type: "saveProfile" });
      expect(flow.command).to.deep.equal({ type: "saveProfile", handle: "anna_k", displayName: "anna_k" });
      flow = Invite_reduce(flow, { type: "failed", error: "Someone already has that handle." });
      expect(flow).to.include({ step: "profile", error: "Someone already has that handle.", command: undefined });
      flow = Invite_reduce(flow, { type: "myName", value: "Anna" });
      flow = Invite_reduce(flow, { type: "saveProfile" });
      flow = Invite_reduce(flow, { type: "profileSaved" });
      expect(flow.step).to.equal("confirm");
      expect(flow.command).to.equal(undefined);
      flow = Invite_reduce(flow, { type: "send" });
      expect(flow.command).to.deep.equal({ type: "send", handle: "paul" });
      flow = Invite_reduce(flow, { type: "requested", status: "pending" });
      expect(flow).to.include({ step: "done", status: "pending" });
      expect(flow.command).to.deep.equal({ type: "forget", handle: "paul" });
    });
    it("accepts an incoming request only on the Accept event", () => {
      let flow = Invite_reduce(signedInWith("paul"), {
        type: "checked",
        result: { kind: "incoming", inviter: { ...paul, userId: "p1" } },
      });
      expect(flow.step).to.equal("incoming");
      expect(Invite_reduce(flow, { type: "send" }).command).to.equal(undefined);
      flow = Invite_reduce(flow, { type: "accept" });
      expect(flow.command).to.deep.equal({ type: "accept", userId: "p1" });
    });
    it("forgets the invite on Not now and on a handle no one has", () => {
      const confirm = Invite_reduce(signedInWith("paul"), {
        type: "checked",
        result: { kind: "confirm", inviter: paul },
      });
      expect(Invite_reduce(confirm, { type: "notNow" })).to.deep.include({
        step: "idle",
        command: { type: "forget", handle: "paul" },
      });
      const missing = Invite_reduce(signedInWith("pual"), { type: "checked", result: { kind: "notFound" } });
      expect(missing).to.deep.include({ step: "notFound", command: { type: "forget", handle: "pual" } });
      const closed = Invite_reduce(
        Invite_reduce(Invite_reduce(missing, { type: "forgotten" }), { type: "pending", signedIn: true }),
        { type: "close" }
      );
      expect(closed).to.include({ step: "idle", command: undefined });
    });
    it("keeps the invite when offline and drops it with a pointer to Friends on other errors", () => {
      const offline = Invite_reduce(signedInWith("paul"), { type: "failed", error: "No connection" });
      expect(offline).to.include({ step: "failed", canRetry: true, command: undefined });
      expect(Invite_reduce(offline, { type: "retry" }).command).to.deep.equal({ type: "check", handle: "paul" });
      expect(Invite_reduce(offline, { type: "later" })).to.include({ step: "idle", hidden: true });
      const rejected = Invite_reduce(signedInWith("paul"), { type: "failed", error: "Daily limit" });
      expect(rejected).to.deep.include({
        step: "failed",
        canRetry: false,
        command: { type: "forget", handle: "paul" },
      });
    });
    it("ignores taps while a command runs", () => {
      const checking = signedInWith("paul");
      expect(Invite_reduce(checking, { type: "notNow" })).to.equal(checking);
      expect(Invite_reduce(checking, { type: "myHandle", value: "x" })).to.equal(checking);
    });
  });
});
