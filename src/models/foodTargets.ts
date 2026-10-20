import type { IFoodGoals, IFoodRange } from "./foodLog";
import type { IUnit, IWeight } from "../types";

export type IFoodSex = "male" | "female";
export type IFoodActivity = "sedentary" | "light" | "moderate" | "active" | "veryActive";
export type IFoodGoalKind = "lose" | "maintain" | "gain";
export type IFoodHeightUnit = "cm" | "ftin";
export type IFoodTargetsStep = "body" | "activity" | "goal" | "result";

export interface IFoodProfile {
  heightCm?: number;
  heightUnit?: IFoodHeightUnit;
  sex?: IFoodSex;
  birthYear?: number;
  activity: IFoodActivity;
  goal: IFoodGoalKind;
}

export interface IFoodTargetsForm {
  weight: string;
  weightUnit: IUnit;
  heightUnit: IFoodHeightUnit;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  sex?: IFoodSex;
  age: string;
  activity: IFoodActivity;
  goal: IFoodGoalKind;
}

export interface IFoodTargetsFlow {
  step: IFoodTargetsStep;
  form: IFoodTargetsForm;
}

export interface IFoodBody {
  weightKg: number;
  heightCm: number;
  sex: IFoodSex;
  age: number;
}

export interface IFoodTargetsResult {
  maintenance: number;
  isFloored: boolean;
  goals: IFoodGoals;
}

export const FoodTargets_defaultProfile: IFoodProfile = { activity: "moderate", goal: "maintain" };

export const FoodTargets_activities: { key: IFoodActivity; label: string; detail: string; factor: number }[] = [
  { key: "sedentary", label: "Mostly sitting", detail: "Desk job, little exercise", factor: 1.2 },
  { key: "light", label: "Lightly active", detail: "Exercise 1 to 3 days a week", factor: 1.375 },
  { key: "moderate", label: "Active", detail: "Exercise 3 to 5 days a week", factor: 1.55 },
  { key: "active", label: "Very active", detail: "Hard exercise 6 to 7 days a week", factor: 1.725 },
  { key: "veryActive", label: "Extra active", detail: "Physical job and hard training", factor: 1.9 },
];

export const FoodTargets_goals: { key: IFoodGoalKind; label: string; detail: string; factor: number }[] = [
  { key: "lose", label: "Lose weight", detail: "About 20% below maintenance", factor: 0.8 },
  { key: "maintain", label: "Maintain", detail: "Eat at maintenance", factor: 1 },
  { key: "gain", label: "Gain weight", detail: "About 10% above maintenance, a lean bulk", factor: 1.1 },
];

const steps: IFoodTargetsStep[] = ["body", "activity", "goal", "result"];
const kgPerLb = 0.45359237;
const cmPerInch = 2.54;
const calorieSpread = 100;
const proteinPerKg = { min: 1.6, max: 2.2 };
const fatPerKg = { min: 0.6, max: 1.0 };
// Common minimum intakes without medical supervision.
const calorieFloor: Record<IFoodSex, number> = { male: 1500, female: 1200 };
const limits = { weightKg: [30, 300], heightCm: [120, 230], age: [14, 100] } as const;

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) && value > 0 ? value : undefined;
}

export function FoodTargets_parseProfile(raw: unknown): IFoodProfile {
  if (raw == null || typeof raw !== "object") {
    return FoodTargets_defaultProfile;
  }
  const r = raw as Record<string, unknown>;
  const profile: IFoodProfile = {
    activity: isOneOf(
      r.activity,
      FoodTargets_activities.map((a) => a.key)
    )
      ? r.activity
      : "moderate",
    goal: isOneOf(
      r.goal,
      FoodTargets_goals.map((g) => g.key)
    )
      ? r.goal
      : "maintain",
  };
  const heightCm = positiveNumber(r.heightCm);
  const birthYear = positiveNumber(r.birthYear);
  if (heightCm != null) {
    profile.heightCm = heightCm;
  }
  if (isOneOf(r.heightUnit, ["cm", "ftin"] as const)) {
    profile.heightUnit = r.heightUnit;
  }
  if (isOneOf(r.sex, ["male", "female"] as const)) {
    profile.sex = r.sex;
  }
  if (birthYear != null) {
    profile.birthYear = Math.round(birthYear);
  }
  return profile;
}

function heightFields(heightCm: number | undefined): Pick<IFoodTargetsForm, "heightCm" | "heightFt" | "heightIn"> {
  if (heightCm == null) {
    return { heightCm: "", heightFt: "", heightIn: "" };
  }
  const inches = Math.round(heightCm / cmPerInch);
  return { heightCm: `${Math.round(heightCm)}`, heightFt: `${Math.floor(inches / 12)}`, heightIn: `${inches % 12}` };
}

function weightIn(weight: IWeight, units: IUnit): number {
  if (weight.unit === units) {
    return weight.value;
  }
  return units === "kg" ? weight.value * kgPerLb : weight.value / kgPerLb;
}

export function FoodTargets_start(
  profile: IFoodProfile,
  latestWeight: IWeight | undefined,
  units: IUnit,
  year: number
): IFoodTargetsFlow {
  return {
    step: "body",
    form: {
      weight: latestWeight == null ? "" : `${Math.round(weightIn(latestWeight, units) * 10) / 10}`,
      weightUnit: units,
      heightUnit: profile.heightUnit ?? (units === "lb" ? "ftin" : "cm"),
      ...heightFields(profile.heightCm),
      sex: profile.sex,
      age: profile.birthYear == null ? "" : `${year - profile.birthYear}`,
      activity: profile.activity,
      goal: profile.goal,
    },
  };
}

function parseNumber(text: string): number | undefined {
  const trimmed = text.trim().replace(",", ".");
  const n = Number(trimmed);
  return trimmed === "" || !isFinite(n) ? undefined : n;
}

function within(n: number | undefined, range: readonly [number, number]): number | undefined {
  return n != null && n >= range[0] && n <= range[1] ? n : undefined;
}

function heightCmFrom(form: IFoodTargetsForm): number | undefined {
  if (form.heightUnit === "cm") {
    return parseNumber(form.heightCm);
  }
  const ft = parseNumber(form.heightFt);
  const inches = form.heightIn.trim() === "" ? 0 : parseNumber(form.heightIn);
  return ft == null || inches == null ? undefined : (ft * 12 + inches) * cmPerInch;
}

export function FoodTargets_setHeightUnit(form: IFoodTargetsForm, heightUnit: IFoodHeightUnit): IFoodTargetsForm {
  const heightCm = heightCmFrom(form);
  return { ...form, heightUnit, ...(heightCm == null ? {} : heightFields(heightCm)) };
}

export function FoodTargets_parseBody(form: IFoodTargetsForm): IFoodBody | undefined {
  const weight = parseNumber(form.weight);
  const weightKg = within(
    weight == null ? undefined : form.weightUnit === "kg" ? weight : weight * kgPerLb,
    limits.weightKg
  );
  const heightCm = within(heightCmFrom(form), limits.heightCm);
  const age = within(parseNumber(form.age), limits.age);
  if (weightKg == null || heightCm == null || age == null || form.sex == null) {
    return undefined;
  }
  return { weightKg, heightCm, sex: form.sex, age };
}

export function FoodTargets_bodyError(form: IFoodTargetsForm): string | undefined {
  const weight = parseNumber(form.weight);
  if (weight == null || within(form.weightUnit === "kg" ? weight : weight * kgPerLb, limits.weightKg) == null) {
    return form.weightUnit === "kg" ? "Enter a weight from 30 to 300 kg." : "Enter a weight from 66 to 660 lb.";
  }
  if (within(heightCmFrom(form), limits.heightCm) == null) {
    return form.heightUnit === "cm"
      ? "Enter a height from 120 to 230 cm."
      : "Enter a height from 3 ft 11 in to 7 ft 6 in.";
  }
  if (form.sex == null) {
    return "Pick male or female. The formula uses it.";
  }
  if (within(parseNumber(form.age), limits.age) == null) {
    return "Enter an age from 14 to 100.";
  }
  return undefined;
}

export function FoodTargets_setForm(flow: IFoodTargetsFlow, patch: Partial<IFoodTargetsForm>): IFoodTargetsFlow {
  return { ...flow, form: { ...flow.form, ...patch } };
}

export function FoodTargets_next(flow: IFoodTargetsFlow): IFoodTargetsFlow {
  if (flow.step === "body" && FoodTargets_parseBody(flow.form) == null) {
    return flow;
  }
  return { ...flow, step: steps[Math.min(steps.indexOf(flow.step) + 1, steps.length - 1)] };
}

export function FoodTargets_back(flow: IFoodTargetsFlow): IFoodTargetsFlow | undefined {
  const index = steps.indexOf(flow.step);
  return index === 0 ? undefined : { ...flow, step: steps[index - 1] };
}

export function FoodTargets_pickActivity(flow: IFoodTargetsFlow, activity: IFoodActivity): IFoodTargetsFlow {
  return FoodTargets_next(FoodTargets_setForm(flow, { activity }));
}

export function FoodTargets_pickGoal(flow: IFoodTargetsFlow, goal: IFoodGoalKind): IFoodTargetsFlow {
  return FoodTargets_next(FoodTargets_setForm(flow, { goal }));
}

export function FoodTargets_stepNumber(flow: IFoodTargetsFlow): { index: number; count: number } {
  return { index: steps.indexOf(flow.step) + 1, count: steps.length };
}

export function FoodTargets_maintenance(body: IFoodBody, activity: IFoodActivity): number {
  const bmr = 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age + (body.sex === "male" ? 5 : -161);
  const factor = FoodTargets_activities.find((a) => a.key === activity)?.factor ?? 1.2;
  return bmr * factor;
}

function gramsRange(weightKg: number, perKg: { min: number; max: number }): IFoodRange {
  return { min: roundTo(weightKg * perKg.min, 5), max: roundTo(weightKg * perKg.max, 5) };
}

export function FoodTargets_compute(body: IFoodBody, activity: IFoodActivity, goal: IFoodGoalKind): IFoodTargetsResult {
  const maintenance = FoodTargets_maintenance(body, activity);
  const factor = FoodTargets_goals.find((g) => g.key === goal)?.factor ?? 1;
  const floor = calorieFloor[body.sex];
  const raw = roundTo(maintenance * factor, 10);
  const target = Math.max(floor, raw);
  const calories = { min: Math.max(floor, target - calorieSpread), max: target + calorieSpread };
  const protein = gramsRange(body.weightKg, proteinPerKg);
  const fat = gramsRange(body.weightKg, fatPerKg);
  const otherCalories = ((protein.min + protein.max) / 2) * 4 + ((fat.min + fat.max) / 2) * 9;
  const carbs = {
    min: Math.max(0, roundTo((calories.min - otherCalories) / 4, 5)),
    max: Math.max(0, roundTo((calories.max - otherCalories) / 4, 5)),
  };
  return { maintenance: roundTo(maintenance, 10), isFloored: raw < floor, goals: { calories, protein, carbs, fat } };
}

export function FoodTargets_result(form: IFoodTargetsForm): IFoodTargetsResult | undefined {
  const body = FoodTargets_parseBody(form);
  return body == null ? undefined : FoodTargets_compute(body, form.activity, form.goal);
}

export function FoodTargets_toProfile(form: IFoodTargetsForm, year: number): IFoodProfile {
  const body = FoodTargets_parseBody(form);
  return {
    activity: form.activity,
    goal: form.goal,
    heightUnit: form.heightUnit,
    ...(form.sex == null ? {} : { sex: form.sex }),
    ...(body == null ? {} : { heightCm: Math.round(body.heightCm * 10) / 10, birthYear: year - Math.round(body.age) }),
  };
}
