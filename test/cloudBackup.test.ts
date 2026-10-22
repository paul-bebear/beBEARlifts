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
  ICloudSession,
} from "../src/models/cloudBackup";

const now = Date.UTC(2026, 9, 20, 18);
const session: ICloudSession = { email: "a@b.co", userId: "u1", accessToken: "a", refreshToken: "r", expiresAt: now };

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

  it("backs up after a workout newer than the last backup, never with no workouts", () => {
    const history = [{ id: 1, startTime: now - 10, endTime: now }];
    const marked = { version: 1 as const, session, backedUpWorkouts: CloudBackup_workoutsMark(history) };
    expect(CloudBackup_isAutoDue({ version: 1, session }, history)).to.equal(true);
    expect(CloudBackup_isAutoDue({ ...marked, lastBackupAt: now + 1 }, history)).to.equal(false);
    expect(CloudBackup_isAutoDue({ ...marked, lastBackupAt: now - 1 }, history)).to.equal(true);
    expect(CloudBackup_isAutoDue({ version: 1, session }, [])).to.equal(false);
    expect(CloudBackup_isAutoDue({ version: 1 }, history)).to.equal(false);
  });

  it("backs up a new workout after the clock was ahead at the last upload", () => {
    const before = [{ id: 1, startTime: now - 10, endTime: now }];
    const state = {
      version: 1 as const,
      session,
      lastBackupAt: now + 86400000,
      backedUpWorkouts: CloudBackup_workoutsMark(before),
    };
    expect(CloudBackup_isAutoDue(state, before)).to.equal(false);
    expect(CloudBackup_isAutoDue(state, [{ id: 2, startTime: now + 5, endTime: now + 9 }, ...before])).to.equal(true);
  });

  it("waits while the restore choice is open", () => {
    const offer = { cloud: { workouts: 80, foodDays: 3 }, phone: { workouts: 1, foodDays: 0 } };
    const history = [{ id: 1, startTime: now }];
    expect(CloudBackup_isAutoDue({ version: 1, session, restoreOffer: offer }, history)).to.equal(false);
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
