import { ICustomExercise, IHistoryRecord } from "../types";
import { ImportUtils_findDuplicates } from "../utils/importTypes";

export interface IOnboardingHistory {
  records: IHistoryRecord[];
  customExercises: Record<string, ICustomExercise>;
  duplicates: number;
}

export function OnboardingHistory_build(
  records: IHistoryRecord[],
  customExercises: Record<string, ICustomExercise>,
  existing: IHistoryRecord[]
): IOnboardingHistory {
  const duplicateIds = ImportUtils_findDuplicates(records, existing);
  const fresh = records.filter((r) => !duplicateIds.has(r.id)).sort((a, b) => a.startTime - b.startTime);
  return { records: fresh, customExercises, duplicates: records.length - fresh.length };
}

function day(time: number): string {
  return new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function OnboardingHistory_summary(history: IOnboardingHistory): string {
  const count = history.records.length;
  const skipped =
    history.duplicates === 0
      ? ""
      : ` ${history.duplicates} more ${history.duplicates === 1 ? "is" : "are"} already in your history.`;
  if (count === 0) {
    return history.duplicates === 1
      ? "The workout the AI read is already in your history."
      : `The ${history.duplicates} workouts the AI read are already in your history.`;
  }
  const first = history.records[0].startTime;
  const last = history.records[count - 1].startTime;
  const range = day(first) === day(last) ? `on ${day(first)}` : `from ${day(first)} to ${day(last)}`;
  return `The AI read ${count} ${count === 1 ? "workout" : "workouts"} ${range}.${skipped}`;
}
