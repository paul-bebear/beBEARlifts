import "mocha";
import { expect } from "chai";
import {
  CloudBackup_isAutoDue,
  CloudBackup_isCatchUpDue,
  CloudBackup_isCode,
  CloudBackup_isEmail,
  CloudBackup_needsRefresh,
  CloudBackup_olderCopies,
  CloudBackup_parse,
  CloudBackup_path,
  CloudBackup_paths,
  CloudBackup_workoutsMark,
  CloudBackup_sessionFromAuth,
  CloudBackup_storesMark,
  CloudBackup_ownerCheck,
  CloudBackup_ownerAnswer,
  CloudBackup_afterSignOut,
  CloudBackup_afterSignIn,
  CloudBackup_canSyncPhotos,
  ICloudSession,
  ICloudState,
  ICloudStoresInput,
} from "../src/models/cloudBackup";

const now = Date.UTC(2026, 9, 20, 18);
const session: ICloudSession = { email: "a@b.co", userId: "u1", accessToken: "a", refreshToken: "r", expiresAt: now };
const none: ICloudStoresInput = { food: [], notes: [], runs: [], scans: [], checkIns: [], photos: [] };

describe("CloudBackup", () => {
  it("reads a Supabase Auth answer into a session", () => {
    const auth = { access_token: "a", refresh_token: "r", expires_in: 3600, user: { id: "u1", email: "a@b.co" } };
    expect(CloudBackup_sessionFromAuth(auth, now)).to.deep.equal({ ...session, expiresAt: now + 3600 * 1000 });
    expect(CloudBackup_sessionFromAuth({ error: "bad code" }, now)).to.equal(undefined);
  });

  it("refreshes a minute before the token runs out", () => {
    expect(CloudBackup_needsRefresh({ ...session, expiresAt: now + 30 * 1000 }, now)).to.equal(true);
    expect(CloudBackup_needsRefresh({ ...session, expiresAt: now + 10 * 60 * 1000 }, now)).to.equal(false);
  });

  it("backs up after a workout newer than the last backup, never with nothing to back up", () => {
    const history = [{ id: 1, startTime: now - 10, endTime: now }];
    const marked = {
      version: 1 as const,
      session,
      backedUpWorkouts: CloudBackup_workoutsMark(history),
      backedUpStores: CloudBackup_storesMark(none),
    };
    expect(CloudBackup_isAutoDue({ version: 1, session }, history, none)).to.equal(true);
    expect(CloudBackup_isAutoDue({ ...marked, lastBackupAt: now + 1 }, history, none)).to.equal(false);
    expect(CloudBackup_isAutoDue({ ...marked, lastBackupAt: now - 1 }, history, none)).to.equal(true);
    expect(CloudBackup_isAutoDue({ version: 1, session }, [], none)).to.equal(false);
    expect(CloudBackup_isAutoDue({ version: 1 }, history, none)).to.equal(false);
  });

  it("backs up a new workout after the clock was ahead at the last upload", () => {
    const before = [{ id: 1, startTime: now - 10, endTime: now }];
    const state = {
      version: 1 as const,
      session,
      lastBackupAt: now + 86400000,
      backedUpWorkouts: CloudBackup_workoutsMark(before),
      backedUpStores: CloudBackup_storesMark(none),
    };
    expect(CloudBackup_isAutoDue(state, before, none)).to.equal(false);
    const after = [{ id: 2, startTime: now + 5, endTime: now + 9 }, ...before];
    expect(CloudBackup_isAutoDue(state, after, none)).to.equal(true);
  });

  it("backs up a note, a meal, a run, a scan, a check-in or a photo with no new workout", () => {
    const history = [{ id: 1, startTime: now - 10, endTime: now }];
    const state = {
      version: 1 as const,
      session,
      lastBackupAt: now + 1,
      backedUpWorkouts: CloudBackup_workoutsMark(history),
      backedUpStores: CloudBackup_storesMark(none),
    };
    expect(CloudBackup_isAutoDue(state, history, none)).to.equal(false);
    const changes: ICloudStoresInput[] = [
      { ...none, notes: [{ updatedAt: now }] },
      { ...none, food: [{ createdAt: now }] },
      { ...none, runs: [{ endedAt: now }] },
      { ...none, scans: [{ timestamp: now }] },
      { ...none, checkIns: ["2026-10-20"] },
      { ...none, photos: [{ timestamp: now }] },
    ];
    for (const stores of changes) {
      expect(CloudBackup_isAutoDue(state, history, stores)).to.equal(true);
    }
    const noted = { ...none, notes: [{ updatedAt: now }] };
    const synced = { ...state, backedUpStores: CloudBackup_storesMark(noted) };
    expect(CloudBackup_isAutoDue(synced, history, noted)).to.equal(false);
    expect(CloudBackup_isAutoDue(synced, history, { ...none, notes: [{ updatedAt: now + 60000 }] })).to.equal(true);
    expect(CloudBackup_isAutoDue({ version: 1, session }, [], noted)).to.equal(true);
  });

  it("waits while the restore choice is open", () => {
    const offer = { cloud: { workouts: 80, foodDays: 3 }, phone: { workouts: 1, foodDays: 0 } };
    const history = [{ id: 1, startTime: now }];
    expect(CloudBackup_isAutoDue({ version: 1, session, restoreOffer: offer }, history, none)).to.equal(false);
  });

  it("keeps the owner through sign-out and asks before the first upload to another account", () => {
    const owned: ICloudState = { version: 1, session, ownerUserId: "u1", lastBackupAt: now, uploadedPhotos: [7] };
    expect(CloudBackup_ownerCheck(owned, false)).to.deep.equal({ kind: "upload" });
    expect(CloudBackup_ownerCheck({ version: 1, session }, false)).to.deep.equal({ kind: "upload" });

    const out = CloudBackup_afterSignOut(owned);
    expect(out).to.deep.equal({ version: 1, ownerUserId: "u1", uploadedPhotos: [7] });
    const other = { ...session, userId: "u2", email: "brother@b.co" };
    const signedIn = CloudBackup_afterSignIn(out, other);
    expect(signedIn).to.deep.equal({ version: 1, ownerUserId: "u1", session: other });
    const check = CloudBackup_ownerCheck(signedIn, false);
    expect(check.kind).to.equal("ask");
    expect(check.kind === "ask" && check.question.startsWith("Upload this phone's data to brother@b.co?")).to.equal(
      true
    );

    const declined = CloudBackup_ownerAnswer(signedIn, false);
    expect(CloudBackup_ownerCheck(declined, false)).to.deep.equal({ kind: "skip" });
    expect(CloudBackup_ownerCheck(declined, true).kind).to.equal("ask");
    expect(CloudBackup_isAutoDue(declined, [{ id: 1, startTime: now }], none)).to.equal(false);
    expect(CloudBackup_ownerCheck(CloudBackup_ownerAnswer(declined, true), false)).to.deep.equal({ kind: "upload" });

    expect(CloudBackup_afterSignIn(out, session)).to.deep.equal({ ...out, session });
    expect(CloudBackup_ownerCheck(CloudBackup_afterSignIn(out, session), false)).to.deep.equal({ kind: "upload" });
  });

  it("syncs photos only for the owner and never while a restore choice is open", () => {
    const offer = { cloud: { workouts: 1, foodDays: 0 }, phone: { workouts: 1, foodDays: 0 } };
    expect(CloudBackup_canSyncPhotos({ version: 1, session, ownerUserId: "u1" })).to.equal(true);
    expect(CloudBackup_canSyncPhotos({ version: 1, session })).to.equal(false);
    expect(CloudBackup_canSyncPhotos({ version: 1, session, ownerUserId: "u2" })).to.equal(false);
    expect(CloudBackup_canSyncPhotos({ version: 1, session, ownerUserId: "u1", restoreOffer: offer })).to.equal(false);
  });

  it("writes the latest file and one copy per weekday", () => {
    expect(CloudBackup_paths("u1", now)).to.deep.equal({ latest: "u1/latest.json", daily: "u1/day-2.json" });
    expect(CloudBackup_path("u1", "replaced")).to.equal("u1/replaced.json");
  });

  it("lists the weekday copies from today backwards, then the replaced copy", () => {
    const copies = CloudBackup_olderCopies(now);
    expect(copies.map((c) => c.copy)).to.deep.equal([
      "day-2",
      "day-1",
      "day-0",
      "day-6",
      "day-5",
      "day-4",
      "day-3",
      "replaced",
    ]);
    expect(copies[0].label).to.equal("Today's copy (Tuesday)");
    expect(copies[1].label).to.equal("Monday's copy");
  });

  it("catches up at most once per 30 seconds", () => {
    expect(CloudBackup_isCatchUpDue(undefined, now)).to.equal(true);
    expect(CloudBackup_isCatchUpDue(now - 29000, now)).to.equal(false);
    expect(CloudBackup_isCatchUpDue(now - 30000, now)).to.equal(true);
  });

  it("checks the email and the code", () => {
    expect(CloudBackup_isEmail(" paul@example.com ")).to.equal(true);
    expect(CloudBackup_isEmail("paul@")).to.equal(false);
    expect(CloudBackup_isCode("123456")).to.equal(true);
    expect(CloudBackup_isCode("12 34")).to.equal(false);
  });

  it("drops a broken stored session", () => {
    expect(CloudBackup_parse({ session: { email: "a@b.co" }, lastBackupAt: 5 })).to.deep.equal({
      version: 1,
      lastBackupAt: 5,
    });
    expect(CloudBackup_parse({ session }).session).to.deep.equal(session);
  });

  it("keeps the sync marks and a complete restore offer", () => {
    const offer = {
      cloud: { exportedAt: "2026-10-19T10:00:00.000Z", workouts: 80, foodDays: 3 },
      phone: { workouts: 1, foodDays: 0 },
    };
    const parsed = CloudBackup_parse({ syncedExportedAt: "x", backedUpWorkouts: "2:5", restoreOffer: offer });
    expect(parsed).to.deep.equal({
      version: 1,
      syncedExportedAt: "x",
      backedUpWorkouts: "2:5",
      restoreOffer: { cloud: offer.cloud, phone: { exportedAt: undefined, workouts: 1, foodDays: 0 } },
    });
    expect(CloudBackup_parse({ restoreOffer: { cloud: { workouts: 1 } } }).restoreOffer).to.equal(undefined);
  });

  it("keeps the owner, the store mark, the uploaded photos and the other-device flag", () => {
    const offer = { cloud: { workouts: 1, foodDays: 0 }, phone: { workouts: 1, foodDays: 0 }, otherDevice: true };
    const parsed = CloudBackup_parse({
      backedUpStores: "food:1:5",
      ownerUserId: "u1",
      uploadDeclinedFor: "u2",
      uploadedPhotos: [3, "x", 4],
      restoreOffer: offer,
    });
    expect(parsed.backedUpStores).to.equal("food:1:5");
    expect(parsed.ownerUserId).to.equal("u1");
    expect(parsed.uploadDeclinedFor).to.equal("u2");
    expect(parsed.uploadedPhotos).to.deep.equal([3, 4]);
    expect(parsed.restoreOffer?.otherDevice).to.equal(true);
  });

  it("keeps a pending Apple or Google sign-in and its last error", () => {
    const pending = { provider: "apple", verifier: "v1", startedAt: now };
    expect(CloudBackup_parse({ pending, signInError: "Sign-in was cancelled." })).to.deep.equal({
      version: 1,
      pending,
      signInError: "Sign-in was cancelled.",
    });
    expect(CloudBackup_parse({ pending: { provider: "apple" }, signInError: "" })).to.deep.equal({ version: 1 });
  });
});
