import "mocha";
import { expect } from "chai";
import {
  FullBackup_build,
  FullBackup_filename,
  FullBackup_format,
  FullBackup_keepSpotifyLogin,
  FullBackup_unwrap,
} from "../src/models/fullBackup";
import { FoodLog_empty } from "../src/models/foodLog";
import { IMusicLog, MusicLog_empty } from "../src/models/musicLog";
import { Storage_getDefault } from "../src/models/storage";

const now = Date.UTC(2026, 9, 20, 18, 0, 0);
const tokens = { accessToken: "a", refreshToken: "r", expiresAt: now + 3600 * 1000 };

describe("FullBackup", () => {
  it("leaves the Spotify login out of the file", () => {
    const music: IMusicLog = { ...MusicLog_empty(), tokens, displayName: "Paul" };
    const backup = FullBackup_build(Storage_getDefault(), FoodLog_empty(), music, now);
    const text = JSON.stringify(backup);
    expect(text).to.not.include("refreshToken");
    expect(backup.music.displayName).to.equal("Paul");
    expect(backup.format).to.equal(FullBackup_format);
    expect(backup.exportedAt).to.equal("2026-10-20T18:00:00.000Z");
  });

  it("names the file by date", () => {
    expect(FullBackup_filename(now)).to.equal("bebearlifts-backup-2026-10-20.json");
  });

  it("unwraps a full backup after a JSON round trip", () => {
    const food = { ...FoodLog_empty(), goals: { ...FoodLog_empty().goals, calories: { min: 2600, max: 2700 } } };
    const backup = FullBackup_build(Storage_getDefault(), food, MusicLog_empty(), now);
    const contents = FullBackup_unwrap(JSON.parse(JSON.stringify(backup)));
    expect((contents.storage as { version: string }).version).to.equal(Storage_getDefault().version);
    expect(contents.food?.goals.calories).to.deep.equal({ min: 2600, max: 2700 });
    expect(contents.music?.sessions).to.deep.equal([]);
  });

  it("passes a plain Liftosaur export through as storage only", () => {
    const storage = { version: "x", history: [] };
    const contents = FullBackup_unwrap(storage);
    expect(contents.storage).to.equal(storage);
    expect(contents.food).to.equal(undefined);
    expect(contents.music).to.equal(undefined);
  });

  it("keeps the phone's Spotify login when restoring music", () => {
    const current: IMusicLog = { ...MusicLog_empty(), tokens, displayName: "Paul" };
    const restored = FullBackup_keepSpotifyLogin(MusicLog_empty(), current);
    expect(restored.tokens).to.equal(tokens);
    expect(restored.displayName).to.equal("Paul");
  });
});
