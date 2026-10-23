import { Friends_forUser, Friends_lists, IFriendsState } from "./friends";
import { IHistoryRecord, ISettings } from "../types";
import {
  IReportLog,
  WorkoutReport_build,
  WorkoutReport_find,
  WorkoutReport_previous,
  WorkoutReport_put,
} from "./workoutReport";

export type IFinishDayAction =
  | "cloudBackup"
  | "bear"
  | "workout"
  | "share"
  | "feedShare"
  | "totals"
  | "exercises"
  | "muscleGroups"
  | "personalRecords";

export interface IFinishDayActionsInput {
  hasFriends: boolean;
  isOfflineBuild: boolean;
  exportAvailable: boolean;
  hasExercises: boolean;
}

export function FinishDayActions_hasFriends(friends: IFriendsState, userId: string | undefined): boolean {
  return Friends_lists(Friends_forUser(friends, userId)).friends.length > 0;
}

export function FinishDayActions_saveReport(
  log: IReportLog,
  record: IHistoryRecord | undefined,
  history: IHistoryRecord[],
  settings: ISettings,
  isOfflineBuild: boolean
): IReportLog {
  if (!isOfflineBuild || record == null || WorkoutReport_find(log, record.id) != null) {
    return log;
  }
  const previous = WorkoutReport_previous(log, record.startTime);
  return WorkoutReport_put(log, WorkoutReport_build(record, history, previous, settings));
}

export function FinishDayActions_list(input: IFinishDayActionsInput): IFinishDayAction[] {
  const actions: IFinishDayAction[] = [];
  if (input.isOfflineBuild) {
    actions.push("cloudBackup");
  }
  actions.push("bear", "workout");
  if (input.isOfflineBuild && input.exportAvailable) {
    actions.push("share");
  }
  if (input.isOfflineBuild && input.hasFriends) {
    actions.push("feedShare");
  }
  actions.push("totals");
  if (input.hasExercises) {
    actions.push("exercises");
  }
  actions.push("muscleGroups", "personalRecords");
  return actions;
}
