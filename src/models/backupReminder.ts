export const BackupReminder_intervalMs = 1000 * 60 * 60 * 24 * 7;

export interface IBackupReminderMarks {
  lastBackupAt?: number;
  lastRemindedAt?: number;
}

export function BackupReminder_isDue(marks: IBackupReminderMarks, workoutCount: number, now: number): boolean {
  if (workoutCount === 0) {
    return false;
  }
  const lastEvent = Math.max(marks.lastBackupAt ?? 0, marks.lastRemindedAt ?? 0);
  return now - lastEvent >= BackupReminder_intervalMs;
}

export function BackupReminder_message(lastBackupAt: number | undefined, now: number): string {
  const lastBackup =
    lastBackupAt == null ? "never" : `${Math.floor((now - lastBackupAt) / (1000 * 60 * 60 * 24))} days ago`;
  return (
    "Your workouts are stored only on this phone. If iOS clears website data or you lose the phone, they are gone.\n\n" +
    `Last backup: ${lastBackup}.\n\n` +
    'Open Settings now? Tap "Export data to JSON file", then "Save to Files" or iCloud Drive.'
  );
}
