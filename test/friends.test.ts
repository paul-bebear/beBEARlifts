import "mocha";
import { expect } from "chai";
import {
  Friends_feedAuthorIds,
  Friends_normalizeUsername,
  Friends_pair,
  Friends_parseRows,
  Friends_requestAction,
  Friends_usernameError,
} from "../src/models/friends";

const me = "22222222-0000-0000-0000-000000000000";
const low = "11111111-0000-0000-0000-000000000000";
const high = "33333333-0000-0000-0000-000000000000";
const higher = "44444444-0000-0000-0000-000000000000";

function row(
  a: [string, string],
  b: [string, string],
  requestedBy: string,
  status: string
): Record<string, unknown> {
  return {
    user_a: a[0],
    user_b: b[0],
    requested_by: requestedBy,
    status,
    a: { username: a[1] },
    b: { username: b[1] },
  };
}

describe("Friends", () => {
  it("normalizes and checks usernames", () => {
    expect(Friends_normalizeUsername("  Big_Bear ")).to.equal("big_bear");
    expect(Friends_usernameError("big_bear")).to.equal(undefined);
    expect(Friends_usernameError("ab")).to.equal("Use 3 to 20 characters.");
    expect(Friends_usernameError("a".repeat(21))).to.equal("Use 3 to 20 characters.");
    expect(Friends_usernameError("big-bear")).to.equal("Use only letters, numbers and _.");
    expect(Friends_usernameError("BigBear")).to.equal("Use only letters, numbers and _.");
  });

  it("orders the pair so the smaller id is user_a", () => {
    expect(Friends_pair(me, low)).to.deep.equal({ user_a: low, user_b: me });
    expect(Friends_pair(me, high)).to.deep.equal({ user_a: me, user_b: high });
  });

  it("splits rows into incoming, outgoing and accepted, by the other person's name", () => {
    const lists = Friends_parseRows(
      [
        row([low, "zed"], [me, "me"], low, "pending"),
        row([me, "me"], [high, "bob"], me, "pending"),
        row([me, "me"], [higher, "amy"], higher, "accepted"),
        row([low, "x"], [high, "y"], low, "accepted"),
        { user_a: me, user_b: high, status: "accepted" },
      ],
      me
    );
    expect(lists.incoming.map((p) => [p.userId, p.username])).to.deep.equal([[low, "zed"]]);
    expect(lists.outgoing.map((p) => [p.userId, p.username])).to.deep.equal([[high, "bob"]]);
    expect(lists.accepted.map((p) => [p.userId, p.username])).to.deep.equal([[higher, "amy"]]);
    expect(lists.incoming[0].key).to.deep.equal({ user_a: low, user_b: me });
    expect(Friends_parseRows(undefined, me)).to.deep.equal({ incoming: [], outgoing: [], accepted: [] });
  });

  it("accepts an incoming request instead of sending a second one", () => {
    const lists = Friends_parseRows(
      [row([low, "zed"], [me, "me"], low, "pending"), row([me, "me"], [high, "bob"], me, "pending")],
      me
    );
    expect(Friends_requestAction(lists, low, me)).to.equal("accept");
    expect(Friends_requestAction(lists, high, me)).to.equal("already");
    expect(Friends_requestAction(lists, higher, me)).to.equal("request");
    expect(Friends_requestAction(lists, me, me)).to.equal("self");
  });

  it("puts me and my accepted friends in the feed", () => {
    const lists = Friends_parseRows(
      [row([me, "me"], [higher, "amy"], higher, "accepted"), row([low, "zed"], [me, "me"], low, "pending")],
      me
    );
    expect(Friends_feedAuthorIds(lists, me)).to.deep.equal([me, higher]);
  });
});
