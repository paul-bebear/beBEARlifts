import "mocha";
import { expect } from "chai";
import { PhoneSheet_rows } from "../src/models/phoneSheet";

describe("PhoneSheet", () => {
  it("lists Settings, More and Add a friend for a user with no friends", () => {
    const rows = PhoneSheet_rows({ friendCount: 0, isOffline: false, hasPendingRestore: false });
    expect(rows.map((r) => [r.id, r.title])).to.deep.equal([
      ["settings", "Settings"],
      ["more", "More"],
      ["friends", "Friends"],
    ]);
    expect(rows.map((r) => r.target)).to.deep.equal([
      { kind: "screen", screen: "settings", tab: "me" },
      { kind: "screen", screen: "reportsHub", tab: "graphs" },
      { kind: "addFriend" },
    ]);
    expect(rows[2].subtitle).to.equal("Add a friend to see their workouts");
  });

  it("opens the friends screen once there is a friend", () => {
    const rows = PhoneSheet_rows({ friendCount: 2, isOffline: true, hasPendingRestore: false });
    const friends = rows.find((r) => r.id === "friends")!;
    expect(friends.target).to.deep.equal({ kind: "screen", screen: "friends", tab: "friends" });
    expect(friends.subtitle).to.equal("2 friends");
    expect(PhoneSheet_rows({ friendCount: 1, isOffline: true, hasPendingRestore: false })[2].subtitle).to.equal(
      "1 friend"
    );
    expect(rows.some((r) => r.id === "restore")).to.equal(false);
  });

  it("puts a pending cloud restore first, in the offline build only", () => {
    const rows = PhoneSheet_rows({ friendCount: 0, isOffline: true, hasPendingRestore: true });
    expect(rows.map((r) => r.id)).to.deep.equal(["restore", "settings", "more", "friends"]);
    expect(rows[0].target).to.deep.equal({ kind: "restore" });
    const online = PhoneSheet_rows({ friendCount: 0, isOffline: false, hasPendingRestore: true });
    expect(online.map((r) => r.id)).to.deep.equal(["settings", "more", "friends"]);
  });
});
