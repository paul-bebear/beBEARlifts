import { IHistoryRecord } from "../types";
import { History_totalRecordSets, History_workoutTime, IPersonalRecords } from "./history";
import { Exercise_toKey } from "./exercise";
import { ObjectUtils_values } from "../utils/object";
import { Progress_isCurrent } from "./progress";
import { TimeUtils_formatHOrMin } from "../utils/time";

export type IExpandedHistoryIds = Partial<Record<number, boolean>>;

export interface IHistoryRecordSummary {
  exercises: number;
  sets: number;
  duration: string;
  hasPr: boolean;
}

export function HistoryCollapse_canCollapse(record: Pick<IHistoryRecord, "id">, isOngoing: boolean): boolean {
  return !(Progress_isCurrent(record) && isOngoing);
}

export function HistoryCollapse_isExpanded(
  record: IHistoryRecord,
  expanded: IExpandedHistoryIds,
  isOngoing: boolean
): boolean {
  return !HistoryCollapse_canCollapse(record, isOngoing) || !!expanded[record.id];
}

export function HistoryCollapse_toggle(expanded: IExpandedHistoryIds, recordId: number): IExpandedHistoryIds {
  return { ...expanded, [recordId]: !expanded[recordId] };
}

export function HistoryCollapse_expand(expanded: IExpandedHistoryIds, recordId?: number): IExpandedHistoryIds {
  if (recordId == null || expanded[recordId]) {
    return expanded;
  }
  return { ...expanded, [recordId]: true };
}

export function HistoryCollapse_summary(record: IHistoryRecord, prs?: IPersonalRecords): IHistoryRecordSummary {
  const recordPrs = prs?.[record.id] || {};
  const hasPr = record.entries.some((entry) =>
    ObjectUtils_values(recordPrs[Exercise_toKey(entry.exercise)] || {}).some((v) => v)
  );
  const { value, unit } = TimeUtils_formatHOrMin(History_workoutTime(record));
  return {
    exercises: record.entries.length,
    sets: History_totalRecordSets(record),
    duration: `${value} ${unit}`,
    hasPr,
  };
}
