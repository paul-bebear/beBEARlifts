import type { ILength, ILengthUnit, IStats, IStatsLengthValue, IWeight } from "../types";
import type { IFoodGoals } from "./foodLog";
import type { IFoodBody, IFoodProfile, IFoodSex, IFoodTargetsResult } from "./foodTargets";
import { BodyFat_clamp, BodyFat_navy, BodyFat_range } from "./bodyFatEstimate";
import {
  IBodyFatMethod,
  IProgramGoal,
  IProgramGoalKind,
  IProgramGoalPace,
  IStepsBand,
  ProgramGoal_body,
  ProgramGoal_foodTargets,
  ProgramGoal_paceDetail,
  ProgramGoal_paceLabel,
  ProgramGoal_paces,
  ProgramGoal_recommend,
  ProgramGoal_toFoodProfile,
} from "./programGoal";

export type IGoalWizardStep =
  | "intro"
  | "goal"
  | "activity"
  | "bodyFatMethod"
  | "bodyFatVisual"
  | "bodyFatMeasure"
  | "result";
export type IGoalWizardMode = "goal" | "pace";
export type IGoalWizardMeasureKey = "height" | "waist" | "neck" | "hips";

export type IGoalWizardMeasure = Record<IGoalWizardMeasureKey, string> & { unit: ILengthUnit };

export interface IGoalWizard {
  mode: IGoalWizardMode;
  step: IGoalWizardStep;
  kind?: IProgramGoalKind;
  activity?: IStepsBand;
  method?: IBodyFatMethod;
  sex?: IFoodSex;
  visualPct: number;
  measure: IGoalWizardMeasure;
  pace?: IProgramGoalPace;
  keptBodyFatPct?: number;
  updateTargets: boolean;
}

export interface IGoalWizardStartInput {
  mode: IGoalWizardMode;
  current?: IProgramGoal;
  profile: IFoodProfile;
  lengthUnit: ILengthUnit;
  latest: Partial<Record<"waist" | "neck" | "hips", ILength>>;
}

export interface IGoalWizardContext {
  now: number;
  year: number;
  current?: IProgramGoal;
  profile: IFoodProfile;
  latestWeight?: IWeight;
}

export interface IGoalWizardPaceOption {
  pace: IProgramGoalPace;
  label: string;
  detail: string;
  isRecommended: boolean;
}

export interface IGoalWizardPreview {
  paceOptions: IGoalWizardPaceOption[];
  note?: string;
  targets?: IFoodTargetsResult;
}

export interface IGoalWizardSave {
  goal: IProgramGoal;
  food?: { goals: IFoodGoals; profile: IFoodProfile };
  bodyFatPct?: number;
}

const cmPerInch = 2.54;

function lengthIn(length: ILength | undefined, unit: ILengthUnit): string {
  if (length == null) {
    return "";
  }
  const value =
    length.unit === unit ? length.value : unit === "cm" ? length.value * cmPerInch : length.value / cmPerInch;
  return `${Math.round(value * 10) / 10}`;
}

export function GoalWizard_latestLengths(stats: IStats): IGoalWizardStartInput["latest"] {
  const latest: IGoalWizardStartInput["latest"] = {};
  for (const key of ["waist", "neck", "hips"] as const) {
    const newest = (stats.length[key] ?? []).reduce<IStatsLengthValue | undefined>(
      (best, v) => (best == null || v.timestamp > best.timestamp ? v : best),
      undefined
    );
    if (newest != null) {
      latest[key] = newest.value;
    }
  }
  return latest;
}

export function GoalWizard_start(input: IGoalWizardStartInput): IGoalWizard {
  const { current, profile, lengthUnit, latest } = input;
  const sex = current?.sex ?? profile.sex;
  const isPace = input.mode === "pace" && current != null && current.kind !== "maintain";
  return {
    mode: isPace ? "pace" : "goal",
    step: isPace ? "result" : "intro",
    kind: current?.kind,
    activity: current?.activity,
    method: current?.bodyFatMethod,
    sex,
    visualPct: BodyFat_clamp(sex, current?.bodyFatPct ?? BodyFat_range(sex).initial),
    measure: {
      unit: lengthUnit,
      height: lengthIn(profile.heightCm != null ? { value: profile.heightCm, unit: "cm" } : undefined, lengthUnit),
      waist: lengthIn(latest.waist, lengthUnit),
      neck: lengthIn(latest.neck, lengthUnit),
      hips: lengthIn(latest.hips, lengthUnit),
    },
    pace: current?.pace,
    keptBodyFatPct: isPace ? current?.bodyFatPct : undefined,
    updateTargets: true,
  };
}

function GoalWizard_steps(w: IGoalWizard): IGoalWizardStep[] {
  if (w.mode === "pace") {
    return ["result"];
  }
  const bodyFat: IGoalWizardStep = w.method === "measure" ? "bodyFatMeasure" : "bodyFatVisual";
  return ["intro", "goal", "activity", "bodyFatMethod", bodyFat, "result"];
}

export function GoalWizard_progress(w: IGoalWizard): number {
  const steps = GoalWizard_steps(w);
  return steps.length <= 1 ? 1 : steps.indexOf(w.step) / (steps.length - 1);
}

function parseLength(text: string, unit: ILengthUnit): number | undefined {
  const trimmed = text.trim().replace(",", ".");
  const n = Number(trimmed);
  if (trimmed === "" || !isFinite(n) || n <= 0) {
    return undefined;
  }
  return unit === "cm" ? n : n * cmPerInch;
}

function measuredCm(w: IGoalWizard): Partial<Record<IGoalWizardMeasureKey, number>> {
  const m = w.measure;
  return {
    height: parseLength(m.height, m.unit),
    waist: parseLength(m.waist, m.unit),
    neck: parseLength(m.neck, m.unit),
    hips: parseLength(m.hips, m.unit),
  };
}

export function GoalWizard_bodyFat(w: IGoalWizard): number | undefined {
  if (w.mode === "pace") {
    return w.keptBodyFatPct;
  }
  if (w.method === "visual") {
    return w.visualPct;
  }
  if (w.method !== "measure" || w.sex == null) {
    return undefined;
  }
  const cm = measuredCm(w);
  if (cm.height == null || cm.waist == null || cm.neck == null) {
    return undefined;
  }
  return BodyFat_navy({ sex: w.sex, heightCm: cm.height, waistCm: cm.waist, neckCm: cm.neck, hipCm: cm.hips });
}

export function GoalWizard_measureError(w: IGoalWizard): string | undefined {
  if (w.sex == null) {
    return "Pick male or female. The formula differs.";
  }
  const cm = measuredCm(w);
  if (cm.height == null || cm.waist == null || cm.neck == null) {
    return "Enter your height, waist and neck.";
  }
  if (w.sex === "female" && cm.hips == null) {
    return "Enter your hips too. The formula for women uses them.";
  }
  return GoalWizard_bodyFat(w) == null ? "Check the numbers. The waist must be bigger than the neck." : undefined;
}

export function GoalWizard_canContinue(w: IGoalWizard): boolean {
  switch (w.step) {
    case "intro":
    case "bodyFatVisual":
      return true;
    case "goal":
      return w.kind != null;
    case "activity":
      return w.activity != null;
    case "bodyFatMethod":
      return w.method != null;
    case "bodyFatMeasure":
      return GoalWizard_bodyFat(w) != null;
    case "result":
      return w.kind != null && (w.kind === "maintain" || w.pace != null);
  }
}

export function GoalWizard_next(w: IGoalWizard): IGoalWizard {
  if (!GoalWizard_canContinue(w)) {
    return w;
  }
  const steps = GoalWizard_steps(w);
  const step = steps[Math.min(steps.indexOf(w.step) + 1, steps.length - 1)];
  if (step === "result" && w.step !== "result" && w.kind != null) {
    return { ...w, step, pace: ProgramGoal_recommend(w.kind, GoalWizard_bodyFat(w), w.sex).pace };
  }
  return { ...w, step };
}

export function GoalWizard_back(w: IGoalWizard): IGoalWizard | undefined {
  const steps = GoalWizard_steps(w);
  const index = steps.indexOf(w.step);
  return index <= 0 ? undefined : { ...w, step: steps[index - 1] };
}

export function GoalWizard_pickGoal(w: IGoalWizard, kind: IProgramGoalKind): IGoalWizard {
  return GoalWizard_next({ ...w, kind });
}

export function GoalWizard_pickActivity(w: IGoalWizard, activity: IStepsBand): IGoalWizard {
  return GoalWizard_next({ ...w, activity });
}

export function GoalWizard_pickMethod(w: IGoalWizard, method: IBodyFatMethod): IGoalWizard {
  return GoalWizard_next({ ...w, method });
}

export function GoalWizard_setSex(w: IGoalWizard, sex: IFoodSex): IGoalWizard {
  return { ...w, sex, visualPct: BodyFat_clamp(sex, w.visualPct) };
}

export function GoalWizard_setVisual(w: IGoalWizard, pct: number): IGoalWizard {
  return { ...w, visualPct: BodyFat_clamp(w.sex, pct) };
}

export function GoalWizard_setMeasure(w: IGoalWizard, patch: Partial<IGoalWizardMeasure>): IGoalWizard {
  return { ...w, measure: { ...w.measure, ...patch } };
}

export function GoalWizard_setPace(w: IGoalWizard, pace: IProgramGoalPace): IGoalWizard {
  return { ...w, pace };
}

export function GoalWizard_setUpdateTargets(w: IGoalWizard, updateTargets: boolean): IGoalWizard {
  return { ...w, updateTargets };
}

function profileFor(w: IGoalWizard, profile: IFoodProfile): IFoodProfile {
  const height = measuredCm(w).height;
  return {
    ...profile,
    ...(w.sex != null ? { sex: w.sex } : {}),
    ...(profile.heightCm == null && height != null ? { heightCm: Math.round(height * 10) / 10 } : {}),
  };
}

function bodyFor(w: IGoalWizard, ctx: IGoalWizardContext): IFoodBody | undefined {
  return ProgramGoal_body(profileFor(w, ctx.profile), ctx.latestWeight, ctx.year);
}

function activityFor(w: IGoalWizard, ctx: IGoalWizardContext): IStepsBand {
  return w.activity ?? ctx.current?.activity ?? "5to10k";
}

export function GoalWizard_preview(w: IGoalWizard, ctx: IGoalWizardContext): IGoalWizardPreview {
  if (w.kind == null) {
    return { paceOptions: [] };
  }
  const kind = w.kind;
  const recommendation = ProgramGoal_recommend(kind, GoalWizard_bodyFat(w), w.sex);
  const body = bodyFor(w, ctx);
  return {
    paceOptions: ProgramGoal_paces(kind).map((pace) => ({
      pace,
      label: ProgramGoal_paceLabel(kind, pace),
      detail: ProgramGoal_paceDetail(kind, pace, ctx.latestWeight),
      isRecommended: pace === recommendation.pace,
    })),
    note: recommendation.note,
    targets:
      body == null ? undefined : ProgramGoal_foodTargets({ kind, pace: w.pace, activity: activityFor(w, ctx) }, body),
  };
}

export function GoalWizard_finish(w: IGoalWizard, ctx: IGoalWizardContext): IGoalWizardSave | undefined {
  if (w.kind == null || !GoalWizard_canContinue({ ...w, step: "result" })) {
    return undefined;
  }
  const pace = w.kind === "maintain" ? undefined : w.pace;
  const bodyFatPct = GoalWizard_bodyFat(w);
  const goal: IProgramGoal =
    w.mode === "pace" && ctx.current != null
      ? { ...ctx.current, pace }
      : {
          kind: w.kind,
          activity: activityFor(w, ctx),
          startedAt: ctx.now,
          ...(pace != null ? { pace } : {}),
          ...(bodyFatPct != null ? { bodyFatPct } : {}),
          ...(w.method != null ? { bodyFatMethod: w.method } : {}),
          ...(w.sex != null ? { sex: w.sex } : {}),
          ...(ctx.latestWeight != null ? { startWeight: ctx.latestWeight } : {}),
        };
  const body = bodyFor(w, ctx);
  const food =
    w.updateTargets && body != null
      ? {
          goals: ProgramGoal_foodTargets(goal, body).goals,
          profile: ProgramGoal_toFoodProfile(profileFor(w, ctx.profile), goal),
        }
      : undefined;
  return {
    goal,
    ...(food != null ? { food } : {}),
    ...(w.mode === "goal" && bodyFatPct != null ? { bodyFatPct } : {}),
  };
}
