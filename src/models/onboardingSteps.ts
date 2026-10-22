import { IBearMood } from "./bear";
import { IBearGoal } from "./bearPlan";
import { IBearPlacePick } from "./bearPlace";
import { IBearLine } from "./bearStoreData";
import { BearTier_all, BearTier_setFor, IBearLevel } from "./bearTier";
import { IFoodActivity, IFoodGoalKind } from "./foodTargets";
import { Invite_parseHandle } from "./invite";
import { IOnboardingAnswers, OnboardingAnswers_age, OnboardingAnswers_body } from "./onboardingAnswers";

export type IOnboardingPlatform = "ios" | "android" | "web";
export type IOnboardingSource = "recommend" | "import";

export interface IOnboardingContext {
  answers: IOnboardingAnswers;
  extras: Record<string, string[]>;
  source: IOnboardingSource;
  invite: string;
  platform: IOnboardingPlatform;
  now: number;
}

export type IOnboardingText = string | ((ctx: IOnboardingContext) => string);
export type IOnboardingArt =
  | "levels"
  | "growth"
  | "plan"
  | "food"
  | "cub"
  | "outfits"
  | "widget"
  | "forecast"
  | "badge"
  | "tired"
  | "mirror";

export interface IOnboardingOption<T> {
  id: string;
  label: string;
  value: T;
  detail?: string;
  icon?: string;
  only?: boolean;
}

interface IOnboardingStepBase {
  id: string;
  bear: IBearMood;
  say: IOnboardingText;
  button?: string;
  when?: (ctx: IOnboardingContext) => boolean;
}

export type IOnboardingChoiceField =
  | { field: "experience"; options: IOnboardingOption<IOnboardingAnswers["experience"]>[] }
  | { field: "goal"; options: IOnboardingOption<IBearGoal>[] }
  | { field: "agile"; options: IOnboardingOption<boolean>[] }
  | { field: "sex"; options: IOnboardingOption<"male" | "female" | undefined>[] }
  | { field: "days"; options: IOnboardingOption<NonNullable<IOnboardingAnswers["days"]>>[] }
  | { field: "activity"; options: IOnboardingOption<IFoodActivity | undefined>[] }
  | { field: "foodGoal"; options: IOnboardingOption<IFoodGoalKind | undefined>[] }
  | { field: "bearLine"; options: IOnboardingOption<IBearLine>[] }
  | { field: "source"; options: IOnboardingOption<IOnboardingSource>[] }
  | { field: "places"; multi: true; options: IOnboardingOption<IBearPlacePick>[] }
  | {
      field: "extra";
      multi?: boolean;
      min?: (ctx: IOnboardingContext) => number;
      options: IOnboardingOption<string>[];
    };

export type IOnboardingStepDef = IOnboardingStepBase &
  (
    | { kind: "say"; title?: IOnboardingText; art?: IOnboardingArt; look?: "intro" | "story" }
    | ({ kind: "choice"; title?: IOnboardingText; grid?: boolean } & IOnboardingChoiceField)
    | { kind: "measure"; measure: "age" | "height" | "weight" }
    | { kind: "text"; field: "name" | "invite" | "extra"; label: string }
    | { kind: "hold"; title: IOnboardingText; holdMs: number }
    | { kind: "loading"; title: IOnboardingText; ms: number; bars: string[] }
    | { kind: "plans" }
    | { kind: "lift" }
    | { kind: "result"; result: "lift" | "badge" }
    | { kind: "permission"; permission: "reminder" | "health" }
    | { kind: "signIn"; variant: "start" | "save" }
  );

export type IOnboardingChoiceStep = Extract<IOnboardingStepDef, { kind: "choice" }>;

export interface IOnboardingChoicePatch {
  answers?: Partial<IOnboardingAnswers>;
  extra: { id: string; value: string[] };
  source?: IOnboardingSource;
}

export const OnboardingSteps_liftKeys = { exercise: "lift:exercise", weight: "lift:weight", reps: "lift:reps" };

// The pace bearTier.ts levels were set against: 6,000 kg moved per session.
const sessionKg = 6000;
const forecastLevel = 5;
const dayMs = 86400000;
const kgPerLb = 0.45359237;

export function OnboardingSteps_text(text: IOnboardingText | undefined, ctx: IOnboardingContext): string {
  return text == null ? "" : typeof text === "string" ? text : text(ctx);
}

function isVisible(step: IOnboardingStepDef, ctx: IOnboardingContext): boolean {
  return step.when == null || step.when(ctx);
}

export function OnboardingSteps_visible(
  steps: readonly IOnboardingStepDef[],
  ctx: IOnboardingContext
): IOnboardingStepDef[] {
  return steps.filter((step) => isVisible(step, ctx));
}

export function OnboardingSteps_find(steps: readonly IOnboardingStepDef[], id: string): IOnboardingStepDef | undefined {
  return steps.find((step) => step.id === id);
}

export function OnboardingSteps_next(
  steps: readonly IOnboardingStepDef[],
  id: string,
  ctx: IOnboardingContext
): IOnboardingStepDef | undefined {
  const index = steps.findIndex((step) => step.id === id);
  return steps.slice(index + 1).find((step) => isVisible(step, ctx));
}

export function OnboardingSteps_prev(
  steps: readonly IOnboardingStepDef[],
  id: string,
  ctx: IOnboardingContext
): IOnboardingStepDef | undefined {
  const index = steps.findIndex((step) => step.id === id);
  return index <= 0
    ? undefined
    : steps
        .slice(0, index)
        .reverse()
        .find((step) => isVisible(step, ctx));
}

export function OnboardingSteps_progress(
  steps: readonly IOnboardingStepDef[],
  id: string,
  ctx: IOnboardingContext
): number {
  const visible = OnboardingSteps_visible(steps, ctx);
  const index = visible.findIndex((step) => step.id === id);
  return index < 0 ? 0 : visible.length <= 1 ? 1 : index / (visible.length - 1);
}

function choiceMin(step: IOnboardingChoiceStep, ctx: IOnboardingContext): number {
  return step.field === "extra" && step.min != null ? step.min(ctx) : 1;
}

function bodyNow(ctx: IOnboardingContext): ReturnType<typeof OnboardingAnswers_body> {
  return OnboardingAnswers_body(ctx.answers, ctx.answers.days ?? 3, new Date(ctx.now).getFullYear());
}

export function OnboardingSteps_canContinue(step: IOnboardingStepDef, ctx: IOnboardingContext): boolean {
  switch (step.kind) {
    case "choice":
      return (ctx.extras[step.id]?.length ?? 0) >= choiceMin(step, ctx);
    case "measure":
      return step.measure === "age"
        ? OnboardingAnswers_age(ctx.answers) != null
        : step.measure === "height"
          ? bodyNow(ctx).profile.heightCm != null
          : bodyNow(ctx).weight != null;
    case "text":
      return step.field !== "invite" || ctx.invite === "" || Invite_parseHandle(ctx.invite) != null;
    default:
      return true;
  }
}

export function OnboardingSteps_isSelected(
  step: IOnboardingChoiceStep,
  ctx: IOnboardingContext,
  optionId: string
): boolean {
  return ctx.extras[step.id]?.includes(optionId) ?? false;
}

function pickedIds(step: IOnboardingChoiceStep, ctx: IOnboardingContext, optionId: string): string[] {
  if (!OnboardingSteps_isMulti(step)) {
    return [optionId];
  }
  const current = ctx.extras[step.id] ?? [];
  if (current.includes(optionId)) {
    return current.filter((id) => id !== optionId);
  }
  const options: IOnboardingOption<unknown>[] = step.options;
  const only = options.find((option) => option.id === optionId)?.only === true;
  const onlyIds = options.filter((option) => option.only === true).map((option) => option.id);
  return only ? [optionId] : [...current.filter((id) => !onlyIds.includes(id)), optionId];
}

function valueOf<T>(options: IOnboardingOption<T>[], id: string): T | undefined {
  return options.find((option) => option.id === id)?.value;
}

function valuesOf<T>(options: IOnboardingOption<T>[], ids: string[]): T[] {
  return options.filter((option) => ids.includes(option.id)).map((option) => option.value);
}

export function OnboardingSteps_choose(
  step: IOnboardingChoiceStep,
  ctx: IOnboardingContext,
  optionId: string
): IOnboardingChoicePatch {
  const ids = pickedIds(step, ctx, optionId);
  const extra = { id: step.id, value: ids };
  if (!step.options.some((option) => option.id === optionId)) {
    return { extra: { id: step.id, value: ctx.extras[step.id] ?? [] } };
  }
  switch (step.field) {
    case "places":
      return { extra, answers: { places: valuesOf(step.options, ids) } };
    case "extra":
      return { extra };
    case "source":
      return { extra, source: valueOf(step.options, optionId) };
    case "experience":
      return { extra, answers: { experience: valueOf(step.options, optionId) } };
    case "goal":
      return { extra, answers: { goal: valueOf(step.options, optionId) } };
    case "agile":
      return { extra, answers: { agile: valueOf(step.options, optionId) } };
    case "sex":
      return { extra, answers: { sex: valueOf(step.options, optionId) } };
    case "days":
      return { extra, answers: { days: valueOf(step.options, optionId) } };
    case "activity":
      return { extra, answers: { activity: valueOf(step.options, optionId) } };
    case "foodGoal":
      return { extra, answers: { foodGoal: valueOf(step.options, optionId) } };
    case "bearLine":
      return { extra, answers: { bearLine: valueOf(step.options, optionId) } };
  }
}

function positive(text: string | undefined): number | undefined {
  const n = Number((text ?? "").trim().replace(",", "."));
  return text != null && text.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
}

export function OnboardingSteps_liftKg(ctx: IOnboardingContext): number | undefined {
  const weight = positive(ctx.extras[OnboardingSteps_liftKeys.weight]?.[0]);
  const reps = positive(ctx.extras[OnboardingSteps_liftKeys.reps]?.[0]);
  if (weight == null || reps == null) {
    return undefined;
  }
  return Math.round(weight * Math.round(reps) * (ctx.answers.unit === "lb" ? kgPerLb : 1));
}

export function OnboardingSteps_bearLine(ctx: IOnboardingContext): IBearLine {
  return ctx.answers.bearLine ?? BearTier_setFor(ctx.answers.sex, undefined);
}

export function OnboardingSteps_forecast(
  ctx: IOnboardingContext,
  days: number
): { level: IBearLevel; date: number } | undefined {
  const set = BearTier_setFor(ctx.answers.sex, ctx.answers.bearLine);
  const level = BearTier_all(set).find((tier) => tier.level === forecastLevel);
  if (level == null || days <= 0) {
    return undefined;
  }
  const weeks = Math.ceil(level.minKg / sessionKg) / days;
  return { level, date: ctx.now + Math.round(weeks * 7) * dayMs };
}

export function OnboardingSteps_hasButton(step: IOnboardingStepDef): boolean {
  if (step.kind === "signIn") {
    return step.variant === "save";
  }
  return step.kind !== "hold" && step.kind !== "loading" && step.kind !== "permission";
}

export function OnboardingSteps_isMulti(step: IOnboardingChoiceStep): boolean {
  return step.field === "places" || (step.field === "extra" && step.multi === true);
}

export function OnboardingSteps_first(
  steps: readonly IOnboardingStepDef[],
  ctx: IOnboardingContext
): IOnboardingStepDef | undefined {
  return steps.find((step) => isVisible(step, ctx));
}

export function OnboardingSteps_check(steps: readonly IOnboardingStepDef[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.id)) {
      problems.push(`Two steps use the id "${step.id}".`);
    }
    seen.add(step.id);
  }
  const places = steps.findIndex((step) => step.kind === "choice" && step.field === "places");
  const source = steps.findIndex((step) => step.kind === "choice" && step.field === "source");
  if (places < 0) {
    problems.push("No step asks where the user trains, so the plan has no equipment.");
  } else if (source >= 0 && source < places) {
    problems.push(`"${steps[source].id}" comes before "${steps[places].id}", so an import never asks for equipment.`);
  }
  if (steps.length > 0 && steps.every((step) => step.when != null)) {
    problems.push("Every step can be hidden, so the flow may have no first screen.");
  }
  if (!steps.some((step) => step.kind === "plans")) {
    problems.push("No plans step, so the user never picks a plan.");
  }
  const last = steps[steps.length - 1];
  if (last == null) {
    problems.push("The list is empty.");
  } else if (last.when != null) {
    problems.push(`The last step "${last.id}" can be hidden, so the flow may never start the plan.`);
  } else if (!OnboardingSteps_hasButton(last)) {
    problems.push(`The last step "${last.id}" has no button, so a failed save cannot be retried.`);
  }
  return problems;
}
