import "mocha";
import { expect } from "chai";
import {
  Friends_errorText,
  Friends_forUser,
  Friends_fromServer,
  Friends_handleError,
  Friends_lists,
  Friends_normalizeHandle,
  Friends_parse,
} from "../src/models/friends";
import { FriendsForm_empty, FriendsForm_reduce, IFriendsForm } from "../src/models/friendsForm";

const profiles = [
  { user_id: "me", handle: "paul", display_name: "Paul" },
  { user_id: "a", handle: "anna", display_name: "Anna" },
  { user_id: "b", handle: "ben", display_name: "Ben" },
  { user_id: "c", handle: "cara", display_name: "Cara" },
];
const friendships = [
  { requester: "me", addressee: "b", status: "accepted", created_at: "2026-10-01" },
  { requester: "a", addressee: "me", status: "accepted", created_at: "2026-10-02" },
  { requester: "c", addressee: "me", status: "pending", created_at: "2026-10-03" },
  { requester: "me", addressee: "x", status: "pending", created_at: "2026-10-04" },
  { requester: "q", addressee: "r", status: "accepted" },
];

describe("Friends", () => {
  it("normalizes and checks handles", () => {
    expect(Friends_normalizeHandle("  @Paul_B ")).to.equal("paul_b");
    expect(Friends_handleError("pa")).to.equal("A handle has 3 to 20 characters.");
    expect(Friends_handleError("paul bear")).to.equal("Use only letters, numbers and _ in a handle.");
    expect(Friends_handleError("@Paul_Bear")).to.equal(undefined);
  });

  it("names a taken handle in plain words", () => {
    expect(Friends_errorText('duplicate key value violates unique constraint "profiles_handle_key"')).to.equal(
      "Someone already has that handle."
    );
    expect(Friends_errorText("No connection")).to.equal("No connection");
  });

  it("joins rows into friends, incoming and outgoing, skipping rows without a readable profile", () => {
    const state = Friends_fromServer("me", profiles, friendships);
    expect(state.me).to.deep.equal({ userId: "me", handle: "paul", displayName: "Paul" });
    const lists = Friends_lists(state);
    expect(lists.friends.map((l) => l.other.handle)).to.deep.equal(["anna", "ben"]);
    expect(lists.incoming.map((l) => l.other.handle)).to.deep.equal(["cara"]);
    expect(lists.outgoing).to.deep.equal([]);
    expect(state.links).to.have.length(3);
  });

  it("round-trips the cache and hides another account's cache", () => {
    const state = Friends_fromServer("me", profiles, friendships);
    const parsed = Friends_parse(JSON.parse(JSON.stringify(state)));
    expect(parsed).to.deep.equal(state);
    expect(Friends_forUser(parsed, "someone-else").links).to.deep.equal([]);
    expect(Friends_forUser(parsed, undefined).userId).to.equal(undefined);
    expect(Friends_parse({ links: [{}] })).to.deep.equal({ version: 1, links: [] });
  });
});

describe("FriendsForm", () => {
  function typed(fields: Partial<IFriendsForm>): IFriendsForm {
    return { ...FriendsForm_empty(), ...fields };
  }

  it("checks the handle before saving and falls back to the handle for the name", () => {
    expect(FriendsForm_reduce(typed({ handle: "a b" }), { type: "saveProfile", isNew: true }).command).to.equal(
      undefined
    );
    const next = FriendsForm_reduce(typed({ handle: " @Paul " }), { type: "saveProfile", isNew: true });
    expect(next.command).to.deep.equal({ type: "saveProfile", handle: "paul", displayName: "paul", isNew: true });
    expect(FriendsForm_reduce(next, { type: "done", message: "Profile saved." }).editingProfile).to.equal(false);
  });

  it("finds, then requests the handle the server returned", () => {
    let form = FriendsForm_reduce(typed({ search: "@Anna" }), { type: "find" });
    expect(form.command).to.deep.equal({ type: "find", handle: "anna" });
    form = FriendsForm_reduce(form, { type: "found", profile: { handle: "anna", displayName: "Anna" } });
    form = FriendsForm_reduce(form, { type: "request" });
    expect(form.command).to.deep.equal({ type: "request", handle: "anna" });
    form = FriendsForm_reduce(form, { type: "requested", status: "accepted" });
    expect(form).to.include({ search: "", found: undefined, message: "You are now friends." });
  });

  it("reports a missing handle and ignores input while a command runs", () => {
    const missing = FriendsForm_reduce(typed({ command: { type: "find", handle: "zed" } }), { type: "found" });
    expect(missing.error).to.equal("No one has that handle.");
    const running = typed({ command: { type: "load" } });
    expect(FriendsForm_reduce(running, { type: "accept", userId: "a" })).to.equal(running);
    expect(FriendsForm_reduce(running, { type: "search", value: "x" })).to.equal(running);
  });

  it("drops a found profile when the search text changes", () => {
    const form = typed({ found: { handle: "anna", displayName: "Anna" } });
    expect(FriendsForm_reduce(form, { type: "search", value: "ann" }).found).to.equal(undefined);
    expect(FriendsForm_reduce(typed({}), { type: "request" }).command).to.equal(undefined);
  });
});
