import { IHistoryRecord } from "../types";

export type IWorkoutShareRow = "shareCards" | "health" | "link" | "text";

export interface IWorkoutShareRowsInput {
  isMobile: boolean;
  healthEligible: boolean;
}

export function WorkoutShareMenu_rows(input: IWorkoutShareRowsInput): IWorkoutShareRow[] {
  const rows: IWorkoutShareRow[] = ["shareCards"];
  if (input.isMobile && input.healthEligible) {
    rows.push("health");
  }
  rows.push("link", "text");
  return rows;
}

export interface IWorkoutShareRecordInput {
  progressId?: number;
  historyRecordId?: number;
  history: IHistoryRecord[];
  storedProgress?: IHistoryRecord;
  progress: Partial<Record<number, IHistoryRecord>>;
}

export function WorkoutShareMenu_record(input: IWorkoutShareRecordInput): IHistoryRecord | undefined {
  if (input.historyRecordId != null) {
    return input.history.find((h) => h.id === input.historyRecordId);
  }
  if (input.progressId == null) {
    return input.history[0];
  }
  return input.progressId === 0 ? input.storedProgress : input.progress[input.progressId];
}
