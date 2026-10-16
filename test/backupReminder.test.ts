import "mocha";
import { expect } from "chai";
import { BackupReminder_intervalMs, BackupReminder_isDue, BackupReminder_message } from "../src/models/backupReminder";

const day = 1000 * 60 * 60 * 24;
const now = Date.UTC(2026, 9, 16);

describe("BackupReminder_isDue", () => {
  it("stays quiet when there are no workouts to lose", () => {
    expect(BackupReminder_isDue({}, 0, now)).to.equal(false);
  });

  it("is due when there are workouts and no backup was ever made", () => {
    expect(BackupReminder_isDue({}, 1, now)).to.equal(true);
  });

  it("waits a full interval after the last backup", () => {
    expect(BackupReminder_isDue({ lastBackupAt: now - 6 * day }, 10, now)).to.equal(false);
    expect(BackupReminder_isDue({ lastBackupAt: now - BackupReminder_intervalMs }, 10, now)).to.equal(true);
  });

  it("waits a full interval after the last reminder, so a dismissed reminder does not come back next launch", () => {
    expect(BackupReminder_isDue({ lastBackupAt: now - 30 * day, lastRemindedAt: now - day }, 10, now)).to.equal(false);
  });
});

describe("BackupReminder_message", () => {
  it("says never when there is no backup", () => {
    expect(BackupReminder_message(undefined, now)).to.contain("Last backup: never.");
  });

  it("counts whole days since the last backup", () => {
    expect(BackupReminder_message(now - 9 * day - 1000, now)).to.contain("Last backup: 9 days ago.");
  });
});
