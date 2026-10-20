import "mocha";
import { expect } from "chai";
import {
  CloudBackup_isAutoDue,
  CloudBackup_isCode,
  CloudBackup_isEmail,
  CloudBackup_needsRefresh,
  CloudBackup_parse,
  CloudBackup_paths,
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
    expect(CloudBackup_isAutoDue({ version: 1, session }, now)).to.equal(true);
    expect(CloudBackup_isAutoDue({ version: 1, session, lastBackupAt: now + 1 }, now)).to.equal(false);
    expect(CloudBackup_isAutoDue({ version: 1, session }, undefined)).to.equal(false);
    expect(CloudBackup_isAutoDue({ version: 1 }, now)).to.equal(false);
  });

  it("writes the latest file and one copy per weekday", () => {
    expect(CloudBackup_paths("u1", now)).to.deep.equal({ latest: "u1/latest.json", daily: "u1/day-2.json" });
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
});
