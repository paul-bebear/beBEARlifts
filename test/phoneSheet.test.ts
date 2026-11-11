import "mocha";
import { expect } from "chai";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  IPhoneSheetInput,
  PhoneSheet_apps,
  PhoneSheet_colors,
  PhoneSheet_feedLabel,
  PhoneSheet_hasRestoreNotice,
  PhoneSheet_tileSize,
} from "../src/models/phoneSheet";

const root = join(__dirname, "..");

const none: IPhoneSheetInput = { friendCount: 0, pendingRequests: 0, isOffline: false, hasPendingRestore: false };

function feed(input: Partial<IPhoneSheetInput>): ReturnType<typeof PhoneSheet_apps>[number] {
  return PhoneSheet_apps({ ...none, ...input }).find((a) => a.id === "feed")!;
}

describe("PhoneSheet", () => {
  it("lists six apps in order", () => {
    const apps = PhoneSheet_apps(none);
    expect(apps.map((a) => [a.id, a.label])).to.deep.equal([
      ["feed", PhoneSheet_feedLabel],
      ["music", "Music"],
      ["photos", "Photos"],
      ["stats", "Stats"],
      ["badges", "Badges"],
      ["settings", "Settings"],
    ]);
  });

  it("gives each app its painted tile, and the file is on disk and bundled for native", () => {
    const native = readFileSync(join(root, "src/utils/bearImage.native.ts"), "utf8");
    const apps = PhoneSheet_apps(none);
    expect(apps.map((a) => a.image)).to.deep.equal([
      "/images/bear/phone/app-feed.webp",
      "/images/bear/phone/app-music.webp",
      "/images/bear/phone/app-photos.webp",
      "/images/bear/phone/app-stats.webp",
      "/images/bear/phone/app-badges.webp",
      "/images/bear/phone/app-settings.webp",
    ]);
    for (const app of apps) {
      expect(existsSync(join(root, app.image)), app.image).to.equal(true);
      expect(native.includes(`"${app.image}": require(`), app.image).to.equal(true);
    }
  });

  it("uses the cream screen, dark frame and brown label of the phone mockup", () => {
    expect(PhoneSheet_colors).to.deep.equal({ frame: "#282A2D", screen: "#FCE8BB", label: "#34251A" });
    expect(PhoneSheet_tileSize).to.equal(64);
  });

  it("opens the screens the boombox, mirror, shelf, reports hub and settings open", () => {
    const targets = PhoneSheet_apps(none).map((a) => a.target);
    expect(targets.slice(1)).to.deep.equal([
      { kind: "screen", screen: "music" },
      { kind: "screen", screen: "progressPhotos" },
      { kind: "screen", screen: "reportsHub", tab: "graphs" },
      { kind: "screen", screen: "streak" },
      { kind: "screen", screen: "settings", tab: "me" },
    ]);
  });

  it("opens the add-friend modal for a user with no friends and no requests", () => {
    expect(feed({}).target).to.deep.equal({ kind: "addFriend" });
  });

  it("opens the friends screen once there is a friend", () => {
    expect(feed({ friendCount: 2 }).target).to.deep.equal({ kind: "screen", screen: "friends", tab: "friends" });
  });

  it("opens the friends screen for a friend request, where the user can accept it", () => {
    expect(feed({ pendingRequests: 1 }).target).to.deep.equal({ kind: "screen", screen: "friends", tab: "friends" });
  });

  it("badges the feed with the pending request count and no other app", () => {
    expect(feed({ pendingRequests: 3, friendCount: 1 }).badge).to.equal(3);
    expect(feed({}).badge).to.equal(0);
    const others = PhoneSheet_apps({ ...none, pendingRequests: 3 }).filter((a) => a.id !== "feed");
    expect(others.every((a) => a.badge == null)).to.equal(true);
  });

  it("shows the cloud restore notice in the offline build only", () => {
    expect(PhoneSheet_hasRestoreNotice({ ...none, isOffline: true, hasPendingRestore: true })).to.equal(true);
    expect(PhoneSheet_hasRestoreNotice({ ...none, hasPendingRestore: true })).to.equal(false);
    expect(PhoneSheet_hasRestoreNotice({ ...none, isOffline: true })).to.equal(false);
  });
});
