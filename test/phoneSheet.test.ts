import "mocha";
import { expect } from "chai";
import { IPhoneSheetInput, PhoneSheet_rows } from "../src/models/phoneSheet";

const none: IPhoneSheetInput = { friendCount: 0, pendingRequests: 0, isOffline: false, hasPendingRestore: false };

function friendsRow(input: Partial<IPhoneSheetInput>): ReturnType<typeof PhoneSheet_rows>[number] {
  return PhoneSheet_rows({ ...none, ...input }).find((r) => r.id === "friends")!;
}

describe("PhoneSheet", () => {
  it("lists Settings, More and Add a friend for a user with no friends", () => {
    const rows = PhoneSheet_rows(none);
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
    const rows = PhoneSheet_rows({ ...none, friendCount: 2, isOffline: true });
    const friends = rows.find((r) => r.id === "friends")!;
    expect(friends.target).to.deep.equal({ kind: "screen", screen: "friends", tab: "friends" });
    expect(friends.subtitle).to.equal("2 friends");
    expect(friendsRow({ friendCount: 1 }).subtitle).to.equal("1 friend");
    expect(rows.some((r) => r.id === "restore")).to.equal(false);
  });

  it("opens the friends screen for a friend request, where the user can accept it", () => {
    const request = friendsRow({ pendingRequests: 1 });
    expect(request.target).to.deep.equal({ kind: "screen", screen: "friends", tab: "friends" });
    expect(request.subtitle).to.equal("1 friend request");
    expect(friendsRow({ friendCount: 3, pendingRequests: 2 }).subtitle).to.equal("3 friends · 2 friend requests");
  });

  it("puts a pending cloud restore first, in the offline build only", () => {
    const rows = PhoneSheet_rows({ ...none, isOffline: true, hasPendingRestore: true });
    expect(rows.map((r) => r.id)).to.deep.equal(["restore", "settings", "more", "friends"]);
    expect(rows[0].target).to.deep.equal({ kind: "restore" });
    const online = PhoneSheet_rows({ ...none, hasPendingRestore: true });
    expect(online.map((r) => r.id)).to.deep.equal(["settings", "more", "friends"]);
  });
});
