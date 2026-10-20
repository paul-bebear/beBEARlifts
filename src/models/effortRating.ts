import { ISet, ISettings } from "../types";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";

export type IEffort = "easy" | "right" | "hard";

export interface IEffortOption {
  effort: IEffort;
  label: string;
  detail: string;
  rpe: number;
}

// Stored as RPE (10 minus reps in reserve), so Liftoscript progressions and graphs can read it.
export const EffortRating_options: IEffortOption[] = [
  { effort: "easy", label: "Too easy", detail: "4+ reps left", rpe: 6 },
  { effort: "right", label: "Just right", detail: "1–3 reps left", rpe: 8 },
  { effort: "hard", label: "Too hard", detail: "0 reps left", rpe: 10 },
];

export function EffortRating_fromRpe(rpe: number | undefined): IEffort | undefined {
  if (rpe == null) {
    return undefined;
  }
  if (rpe >= 10) {
    return "hard";
  }
  return rpe >= 7 ? "right" : "easy";
}

// On by default in this fork's offline build only, so upstream's build and tests keep completing sets in one tap.
export function EffortRating_isEnabled(settings: ISettings): boolean {
  return settings.rateEachSet ?? OfflineOnly_isEnabled();
}

// Timed sets finish through the set-timer flow, and a program's own logRpe already asks for a number.
export function EffortRating_shouldAsk(set: ISet | undefined, settings: ISettings, isPlayground: boolean): boolean {
  return (
    set != null &&
    !isPlayground &&
    EffortRating_isEnabled(settings) &&
    !set.isCompleted &&
    set.setTimer == null &&
    !set.logRpe
  );
}

// Green is the 1–3 reps-in-reserve target. Both too easy and too hard are yellow. Missed reps stay red upstream.
export function EffortRating_color(sets: ISet[]): "green" | "yellow" | undefined {
  const efforts = sets.filter((s) => s.isCompleted).map((s) => EffortRating_fromRpe(s.completedRpe));
  const rated = efforts.filter((e): e is IEffort => e != null);
  if (rated.length === 0) {
    return undefined;
  }
  return rated.every((e) => e === "right") ? "green" : "yellow";
}
