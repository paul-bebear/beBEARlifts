import { IBackupReminderMarks } from "../models/backupReminder";

const LAST_BACKUP_KEY = "bebear:lastBackupAt";
const LAST_REMINDED_KEY = "bebear:lastRemindedAt";

function readNumber(key: string): number | undefined {
  try {
    const value = Number(globalThis.localStorage?.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    globalThis.localStorage?.setItem(key, String(value));
  } catch {
    // Private mode or a full quota. The reminder then shows again next week, which is harmless.
  }
}

export function BackupReminderMarks_read(): IBackupReminderMarks {
  return { lastBackupAt: readNumber(LAST_BACKUP_KEY), lastRemindedAt: readNumber(LAST_REMINDED_KEY) };
}

export function BackupReminderMarks_recordBackup(now: number): void {
  writeNumber(LAST_BACKUP_KEY, now);
}

export function BackupReminderMarks_recordReminder(now: number): void {
  writeNumber(LAST_REMINDED_KEY, now);
}
