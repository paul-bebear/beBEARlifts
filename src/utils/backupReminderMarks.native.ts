import { createMMKV } from "react-native-mmkv";
import { IBackupReminderMarks } from "../models/backupReminder";

const LAST_BACKUP_KEY = "bebear:lastBackupAt";
const LAST_REMINDED_KEY = "bebear:lastRemindedAt";

const mmkv = createMMKV({ id: "bebear.backupReminder" });

function readNumber(key: string): number | undefined {
  const value = mmkv.getNumber(key);
  return value != null && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function BackupReminderMarks_read(): IBackupReminderMarks {
  return { lastBackupAt: readNumber(LAST_BACKUP_KEY), lastRemindedAt: readNumber(LAST_REMINDED_KEY) };
}

export function BackupReminderMarks_recordBackup(now: number): void {
  mmkv.set(LAST_BACKUP_KEY, now);
}

export function BackupReminderMarks_recordReminder(now: number): void {
  mmkv.set(LAST_REMINDED_KEY, now);
}
