import { IEffort, IHistoryRecord, ISet, ISettings } from "../types";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";

export interface IEffortOption {
  effort: IEffort;
  label: string;
  detail: string;
}

export const EffortRating_options: IEffortOption[] = [
  { effort: "easy", label: "Too easy", detail: "4+ reps left" },
  { effort: "right", label: "Just right", detail: "1–3 reps left" },
  { effort: "hard", label: "Too hard", detail: "0 reps left" },
];

// PR #18 stored the rating as completedRpe 6, 8 or 10. It shipped on this day, so older RPE values are real logged RPE.
const legacyRatingSince = Date.UTC(2026, 9, 20);
const legacyRpeToEffort: Partial<Record<number, IEffort>> = { 6: "easy", 8: "right", 10: "hard" };

// On by default in this fork's offline build only, so upstream's build and tests keep completing sets in one tap.
export function EffortRating_isEnabled(settings: ISettings): boolean {
  return settings.rateEachSet ?? OfflineOnly_isEnabled();
}

// Timed sets have no reps in reserve, and a program's own logRpe already asks for a number.
export function EffortRating_canRate(set: ISet): boolean {
  return !!set.isCompleted && set.setTimer == null && !set.logRpe;
}

export function EffortRating_lastTickedSetIndex(sets: ISet[]): number | undefined {
  let latest: number | undefined;
  sets.forEach((set, index) => {
    if (set.isCompleted && (latest == null || (set.timestamp ?? 0) >= (sets[latest].timestamp ?? 0))) {
      latest = index;
    }
  });
  return latest;
}

export function EffortRating_stripSetIndex(
  sets: ISet[],
  settings: ISettings,
  isCurrentProgress: boolean,
  isPlayground: boolean
): number | undefined {
  if (!isCurrentProgress || isPlayground || !EffortRating_isEnabled(settings)) {
    return undefined;
  }
  const index = EffortRating_lastTickedSetIndex(sets);
  return index != null && EffortRating_canRate(sets[index]) ? index : undefined;
}

// Tapping the chosen button again clears it, so a mis-tap can be undone from the strip.
export function EffortRating_rate(set: ISet, effort: IEffort): ISet {
  return { ...set, completedEffort: set.completedEffort === effort ? undefined : effort };
}

// Green is the 1–3 reps-in-reserve target. Both too easy and too hard are yellow. Missed reps stay red upstream.
export function EffortRating_color(sets: ISet[]): "green" | "yellow" | undefined {
  const rated = EffortRating_efforts(sets);
  if (rated.length === 0) {
    return undefined;
  }
  return rated.every((e) => e === "right") ? "green" : "yellow";
}

export function EffortRating_efforts(sets: ISet[]): IEffort[] {
  return sets.filter((s) => s.isCompleted && s.completedEffort != null).map((s) => s.completedEffort as IEffort);
}

export function EffortRating_moveLegacyRating(set: ISet, recordStartTime: number): ISet {
  const effort = set.completedRpe != null ? legacyRpeToEffort[set.completedRpe] : undefined;
  if (effort == null || set.logRpe || set.completedEffort != null || recordStartTime < legacyRatingSince) {
    return set;
  }
  return { ...set, completedRpe: undefined, completedEffort: effort };
}

export function EffortRating_moveLegacyRatings(record: IHistoryRecord): IHistoryRecord {
  const amrapModal = record.amrapModal as (IHistoryRecord["amrapModal"] & { rateEffort?: boolean }) | undefined;
  const isEffortOnlyModal =
    amrapModal?.rateEffort &&
    !amrapModal.isAmrap &&
    !amrapModal.logRpe &&
    !amrapModal.askWeight &&
    !amrapModal.userVars;
  return {
    ...record,
    amrapModal: isEffortOnlyModal ? undefined : record.amrapModal,
    entries: record.entries.map((entry) => ({
      ...entry,
      sets: entry.sets.map((set) => EffortRating_moveLegacyRating(set, record.startTime)),
    })),
  };
}
