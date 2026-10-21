import "mocha";
import { expect } from "chai";
import {
  FullBackup_build,
  FullBackup_filename,
  FullBackup_format,
  FullBackup_keepSpotifyLogin,
  FullBackup_unwrap,
  IFullBackupParts,
} from "../src/models/fullBackup";
import { WarmupPlan_empty } from "../src/models/warmupPlan";
import { WorkoutReport_empty } from "../src/models/workoutReport";
import { FoodLog_empty } from "../src/models/foodLog";
import { IMusicLog, MusicLog_empty } from "../src/models/musicLog";
import { Storage_getDefault } from "../src/models/storage";
import { BodyScans_empty } from "../src/models/bodyScans";
import { SetClips_empty } from "../src/models/setClips";
import { RunLog_empty } from "../src/models/runLog";

const now = Date.UTC(2026, 9, 20, 18, 0, 0);

function parts(overrides: Partial<IFullBackupParts>): IFullBackupParts {
  return {
    storage: Storage_getDefault(),
    food: FoodLog_empty(),
    music: MusicLog_empty(),
    body: BodyScans_empty(),
    warmups: WarmupPlan_empty(),
    reports: WorkoutReport_empty(),
    clips: SetClips_empty(),
    runs: RunLog_empty(),
    ...overrides,
  };
}
const tokens = { accessToken: "a", refreshToken: "r", expiresAt: now + 3600 * 1000 };

describe("FullBackup", () => {
  it("leaves the Spotify login out of the file", () => {
    const music: IMusicLog = { ...MusicLog_empty(), tokens, displayName: "Paul" };
    const backup = FullBackup_build(parts({ music }), now);
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
    const body = { version: 1 as const, scans: [{ id: 1, timestamp: now, unit: "kg" as const, weight: 82 }] };
    const backup = FullBackup_build(parts({ food, body }), now);
    const contents = FullBackup_unwrap(JSON.parse(JSON.stringify(backup)));
    expect((contents.storage as { version: string }).version).to.equal(Storage_getDefault().version);
    expect(contents.food?.goals.calories).to.deep.equal({ min: 2600, max: 2700 });
    expect(contents.music?.sessions).to.deep.equal([]);
    expect(contents.body).to.deep.equal(body);
    expect(contents.reports).to.deep.equal(WorkoutReport_empty());
    expect(contents.clips).to.deep.equal(SetClips_empty());
  });

  it("round trips clip metadata and thumbnails without video data", () => {
    const clips = {
      version: 1 as const,
      clips: [
        {
          workoutId: now,
          setId: "set-1",
          exerciseId: "squat",
          timestamp: now,
          size: 200000000,
          duration: 5,
          thumbnail: "data:image/jpeg;base64,YWJj",
          savedVia: "share" as const,
        },
      ],
    };
    const backup = FullBackup_build(parts({ clips }), now);
    expect(FullBackup_unwrap(JSON.parse(JSON.stringify(backup))).clips).to.deep.equal(clips);
    expect(backup.readme).to.include("video files stay in Photos or downloads");
  });

  it("leaves existing clips untouched when an older backup has no clips", () => {
    const backup = FullBackup_build(parts({}), now);
    const { clips, ...older } = backup;
    expect(clips.clips).to.deep.equal([]);
    expect(FullBackup_unwrap(older).clips).to.equal(undefined);
  });

  it("passes a plain Liftosaur export through as storage only", () => {
    const storage = { version: "x", history: [] };
    const contents = FullBackup_unwrap(storage);
    expect(contents.storage).to.equal(storage);
    expect(contents.food).to.equal(undefined);
    expect(contents.music).to.equal(undefined);
  });

  it("round trips runs and leaves runs untouched for older backups", () => {
    const runs = {
      version: 1 as const,
      runs: [
        {
          id: now,
          startedAt: now,
          endedAt: now + 600000,
          distanceM: 2000,
          movingMs: 600000,
          elevationGainM: 12,
          splits: [{ km: 1, ms: 300000 }],
          route: [[[40, -3] as [number, number], [40.01, -3] as [number, number]]],
        },
      ],
    };
    const backup = FullBackup_build(parts({ runs }), now);
    expect(FullBackup_unwrap(JSON.parse(JSON.stringify(backup))).runs).to.deep.equal(runs);
    const { runs: omitted, ...older } = backup;
    expect(omitted).to.deep.equal(runs);
    expect(FullBackup_unwrap(older).runs).to.equal(undefined);
  });

  it("keeps the phone's Spotify login when restoring music", () => {
    const current: IMusicLog = { ...MusicLog_empty(), tokens, displayName: "Paul" };
    const restored = FullBackup_keepSpotifyLogin(MusicLog_empty(), current);
    expect(restored.tokens).to.equal(tokens);
    expect(restored.displayName).to.equal("Paul");
  });
});
