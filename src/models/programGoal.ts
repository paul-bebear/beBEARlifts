import type { IUnit, IWeight } from "../types";
import {
  FoodTargets_fromCalories,
  FoodTargets_maintenance,
  IFoodActivity,
  IFoodBody,
  IFoodGoalKind,
  IFoodProfile,
  IFoodSex,
  IFoodTargetsResult,
} from "./foodTargets";

export type IProgramGoalKind = "buildMuscle" | "loseFat" | "maintain";
export type IProgramGoalPace = "slow" | "moderate" | "fast";
export type IStepsBand = "under5k" | "5to10k" | "10to15k" | "over15k";
export type IBodyFatMethod = "visual" | "measure";

export interface IProgramGoal {
  kind: IProgramGoalKind;
  pace?: IProgramGoalPace;
  activity: IStepsBand;
  bodyFatPct?: number;
  bodyFatMethod?: IBodyFatMethod;
  startedAt: number;
  startWeight?: IWeight;
}

export interface IProgramGoalLog {
  version: 1;
  current?: IProgramGoal;
  past: IProgramGoal[];
}

export interface IProgramGoalRecommendation {
  pace?: IProgramGoalPace;
  note?: string;
}

export const ProgramGoal_kinds: { key: IProgramGoalKind; label: string; detail: string }[] = [
  { key: "buildMuscle", label: "Build muscle", detail: "Eat a little above maintenance and push your lifts up" },
  { key: "loseFat", label: "Lose fat", detail: "Eat below maintenance and keep your strength" },
  { key: "maintain", label: "Maintain", detail: "Keep your weight and get stronger slowly" },
];

// The food formula counts exercise days, and every user of this app lifts, so each band sits one level higher.
export const ProgramGoal_stepsBands: { key: IStepsBand; label: string; detail: string; activity: IFoodActivity }[] = [
  { key: "under5k", label: "Under 5,000 steps", detail: "Mostly sitting", activity: "light" },
  { key: "5to10k", label: "5,000 to 10,000 steps", detail: "Some walking", activity: "moderate" },
  { key: "10to15k", label: "10,000 to 15,000 steps", detail: "On your feet a lot", activity: "active" },
  { key: "over15k", label: "Over 15,000 steps", detail: "Physical job or lots of walking", activity: "veryActive" },
];

const weeklyPercent: Record<"buildMuscle" | "loseFat", Record<IProgramGoalPace, number>> = {
  loseFat: { slow: 0.25, moderate: 0.5, fast: 1 },
  buildMuscle: { slow: 0.1, moderate: 0.25, fast: 0.5 },
};

const paceLabels: Record<IProgramGoalPace, string> = { slow: "Slow", moderate: "Moderate", fast: "Fast" };
const paces: IProgramGoalPace[] = ["slow", "moderate", "fast"];
const kcalPerKgTissue = 7700;
const maxPastGoals = 50;
const kgPerLb = 0.45359237;

// Lean and high cut-offs for body fat, from the ACE ranges ("fitness" upper bound, "average" upper bound).
const bodyFatBands: Record<IFoodSex | "unknown", { lean: number; high: number }> = {
  male: { lean: 15, high: 25 },
  female: { lean: 23, high: 32 },
  unknown: { lean: 19, high: 28 },
};

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

function parseWeight(raw: unknown): IWeight | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.value !== "number" || !isFinite(r.value) || r.value <= 0 || (r.unit !== "kg" && r.unit !== "lb")) {
    return undefined;
  }
  return { value: r.value, unit: r.unit };
}

function parseGoal(raw: unknown): IProgramGoal | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kinds = ProgramGoal_kinds.map((k) => k.key);
  const bands = ProgramGoal_stepsBands.map((b) => b.key);
  if (!isOneOf(r.kind, kinds) || typeof r.startedAt !== "number" || !isFinite(r.startedAt)) {
    return undefined;
  }
  const goal: IProgramGoal = {
    kind: r.kind,
    activity: isOneOf(r.activity, bands) ? r.activity : "5to10k",
    startedAt: r.startedAt,
  };
  if (r.kind !== "maintain") {
    goal.pace = isOneOf(r.pace, paces) ? r.pace : "moderate";
  }
  if (typeof r.bodyFatPct === "number" && r.bodyFatPct > 0 && r.bodyFatPct < 100) {
    goal.bodyFatPct = r.bodyFatPct;
  }
  if (isOneOf(r.bodyFatMethod, ["visual", "measure"] as const)) {
    goal.bodyFatMethod = r.bodyFatMethod;
  }
  const startWeight = parseWeight(r.startWeight);
  if (startWeight != null) {
    goal.startWeight = startWeight;
  }
  return goal;
}

export function ProgramGoal_empty(): IProgramGoalLog {
  return { version: 1, past: [] };
}

export function ProgramGoal_parse(raw: unknown): IProgramGoalLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const past = Array.isArray(r.past) ? r.past.map(parseGoal).filter((g): g is IProgramGoal => g != null) : [];
  const current = parseGoal(r.current);
  return { version: 1, ...(current != null ? { current } : {}), past: past.slice(0, maxPastGoals) };
}

export function ProgramGoal_set(log: IProgramGoalLog, goal: IProgramGoal): IProgramGoalLog {
  const past = log.current != null ? [log.current, ...log.past] : log.past;
  return { ...log, current: goal, past: past.slice(0, maxPastGoals) };
}

export function ProgramGoal_paces(kind: IProgramGoalKind): IProgramGoalPace[] {
  return kind === "maintain" ? [] : paces;
}

export function ProgramGoal_kindLabel(kind: IProgramGoalKind): string {
  return ProgramGoal_kinds.find((k) => k.key === kind)?.label ?? "";
}

export function ProgramGoal_paceLabel(kind: IProgramGoalKind, pace: IProgramGoalPace | undefined): string {
  if (kind === "maintain" || pace == null) {
    return "Steady";
  }
  return paceLabels[pace];
}

export function ProgramGoal_weeklyPercent(kind: IProgramGoalKind, pace: IProgramGoalPace | undefined): number {
  if (kind === "maintain" || pace == null) {
    return 0;
  }
  const sign = kind === "loseFat" ? -1 : 1;
  return sign * weeklyPercent[kind][pace];
}

export function ProgramGoal_weeklyChangeKg(
  kind: IProgramGoalKind,
  pace: IProgramGoalPace | undefined,
  weightKg: number
): number {
  return (weightKg * ProgramGoal_weeklyPercent(kind, pace)) / 100;
}

export function ProgramGoal_paceDetail(kind: IProgramGoalKind, pace: IProgramGoalPace, weight?: IWeight): string {
  const pct = Math.abs(ProgramGoal_weeklyPercent(kind, pace));
  const verb = kind === "loseFat" ? "Lose" : "Gain";
  if (weight == null) {
    return `${verb} about ${pct}% of your weight a week`;
  }
  const amount = Math.round(((weight.value * pct) / 100) * 100) / 100;
  return `${verb} about ${amount} ${weight.unit} a week`;
}

export function ProgramGoal_dailyCalorieOffset(
  kind: IProgramGoalKind,
  pace: IProgramGoalPace | undefined,
  weightKg: number
): number {
  return Math.round((ProgramGoal_weeklyChangeKg(kind, pace, weightKg) * kcalPerKgTissue) / 7);
}

export function ProgramGoal_recommend(
  kind: IProgramGoalKind,
  bodyFatPct: number | undefined,
  sex: IFoodSex | undefined
): IProgramGoalRecommendation {
  if (kind === "maintain") {
    return {};
  }
  const bands = bodyFatBands[sex ?? "unknown"];
  const isLean = bodyFatPct != null && bodyFatPct < bands.lean;
  const isHigh = bodyFatPct != null && bodyFatPct > bands.high;
  if (kind === "loseFat") {
    if (isHigh) {
      return { pace: "fast" };
    }
    if (isLean) {
      return { pace: "slow", note: "You are already lean. A slow cut keeps more muscle." };
    }
    return { pace: "moderate" };
  }
  if (isHigh) {
    return {
      pace: "slow",
      note: `At ${Math.round(bodyFatPct ?? 0)}% body fat, losing some fat first often makes new muscle easier to see.`,
    };
  }
  return { pace: isLean ? "moderate" : "slow" };
}

export function ProgramGoal_foodGoalKind(kind: IProgramGoalKind): IFoodGoalKind {
  return kind === "loseFat" ? "lose" : kind === "buildMuscle" ? "gain" : "maintain";
}

export function ProgramGoal_foodActivity(band: IStepsBand): IFoodActivity {
  return ProgramGoal_stepsBands.find((b) => b.key === band)?.activity ?? "moderate";
}

export function ProgramGoal_weightKg(weight: IWeight): number {
  return weight.unit === "kg" ? weight.value : weight.value * kgPerLb;
}

export function ProgramGoal_body(
  profile: IFoodProfile,
  weight: IWeight | undefined,
  year: number
): IFoodBody | undefined {
  if (weight == null || profile.heightCm == null || profile.sex == null || profile.birthYear == null) {
    return undefined;
  }
  return {
    weightKg: ProgramGoal_weightKg(weight),
    heightCm: profile.heightCm,
    sex: profile.sex,
    age: year - profile.birthYear,
  };
}

export function ProgramGoal_foodTargets(
  goal: Pick<IProgramGoal, "kind" | "pace" | "activity">,
  body: IFoodBody
): IFoodTargetsResult {
  const maintenance = FoodTargets_maintenance(body, ProgramGoal_foodActivity(goal.activity));
  const offset = ProgramGoal_dailyCalorieOffset(goal.kind, goal.pace, body.weightKg);
  return FoodTargets_fromCalories(body, maintenance, maintenance + offset);
}

export function ProgramGoal_toFoodProfile(
  profile: IFoodProfile,
  goal: Pick<IProgramGoal, "kind" | "activity">
): IFoodProfile {
  return { ...profile, goal: ProgramGoal_foodGoalKind(goal.kind), activity: ProgramGoal_foodActivity(goal.activity) };
}

export function ProgramGoal_weightIn(weight: IWeight, units: IUnit): number {
  return weight.unit === units ? weight.value : units === "kg" ? weight.value * kgPerLb : weight.value / kgPerLb;
}

export function ProgramGoal_formatWeight(weight: IWeight, units: IUnit): string {
  return `${Math.round(ProgramGoal_weightIn(weight, units) * 10) / 10} ${units}`;
}
