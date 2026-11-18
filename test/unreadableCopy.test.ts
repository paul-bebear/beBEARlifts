import "mocha";
import { expect } from "chai";
import {
  UnreadableCopy_keep,
  UnreadableCopy_key,
  UnreadableCopy_maxCopies,
  UnreadableCopy_screen,
} from "../src/models/unreadableCopy";

describe("UnreadableCopy_key", () => {
  it("names the copy by time with a prefix the account list does not read", () => {
    expect(UnreadableCopy_key(1700000000000)).to.equal("bebear_unreadable_1700000000000");
    expect(UnreadableCopy_key(1).startsWith("liftosaur_")).to.equal(false);
  });
});

describe("UnreadableCopy_keep", () => {
  it("keeps the new copy and removes nothing when there are no old copies", () => {
    expect(UnreadableCopy_keep(["liftosaur", "current_account"], 500)).to.deep.equal({
      key: "bebear_unreadable_500",
      remove: [],
    });
  });

  it("keeps at most 3 copies and removes the oldest", () => {
    const keys = ["bebear_unreadable_100", "bebear_unreadable_300", "bebear_unreadable_200", "liftosaur"];
    expect(UnreadableCopy_maxCopies).to.equal(3);
    expect(UnreadableCopy_keep(keys, 400).remove).to.deep.equal(["bebear_unreadable_100"]);
  });

  it("orders copies by number, not by text", () => {
    const keys = ["bebear_unreadable_9", "bebear_unreadable_10", "bebear_unreadable_11"];
    expect(UnreadableCopy_keep(keys, 12).remove).to.deep.equal(["bebear_unreadable_9"]);
  });
});

describe("UnreadableCopy_screen", () => {
  it("offers to save the copy and says the reset keeps it", () => {
    const screen = UnreadableCopy_screen({ local: true, copyKey: "bebear_unreadable_500" });
    expect(screen.canSave).to.equal(true);
    expect(screen.filename).to.equal("bebear_unreadable_500.json");
    expect(screen.resetText).to.contain("Save the damaged data");
    expect(screen.resetText).not.to.contain("will be gone");
  });

  it("warns that history goes when no copy was kept", () => {
    const screen = UnreadableCopy_screen({ local: true, copyKey: undefined });
    expect(screen.canSave).to.equal(false);
    expect(screen.resetText).to.contain("will be gone");
  });
});
