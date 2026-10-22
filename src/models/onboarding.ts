import { IOnboardingAnswers, OnboardingAnswers_empty, OnboardingAnswers_planInput } from "./onboardingAnswers";
import { IOnboardingAnswer } from "./onboardingAnswer";
import { IOnboardingHistory } from "./onboardingHistory";
import { Friends_normalizeHandle } from "./friends";
import { IProgram } from "../types";
import { BearPlan_recommend, IBearPlanCard } from "./bearPlanRecommend";
import {
  IOnboardingContext,
  IOnboardingPlatform,
  IOnboardingSource,
  IOnboardingStepDef,
  OnboardingSteps_canContinue,
  OnboardingSteps_choose,
  OnboardingSteps_find,
  OnboardingSteps_first,
  OnboardingSteps_hasButton,
  OnboardingSteps_next,
  OnboardingSteps_prev,
  OnboardingSteps_progress,
} from "./onboardingSteps";
import { OnboardingStepList_all } from "./onboardingStepList";

export interface IOnboardingResult {
  answer: IOnboardingAnswer;
  name: string;
  days: number;
  program?: IProgram;
  history?: IOnboardingHistory;
}

export type IOnboardingAt =
  | { phase: "flow"; id: string }
  | { phase: "import" }
  | { phase: "working" }
  | { phase: "done" };

export interface IOnboardingState {
  at: IOnboardingAt;
  // Each move to a new step gets a new visit number. A hold or loading timer from a step the user left carries the old number.
  visit: number;
  steps: readonly IOnboardingStepDef[];
  platform: IOnboardingPlatform;
  now: number;
  answers: IOnboardingAnswers;
  extras: Record<string, string[]>;
  source: IOnboardingSource;
  pickedDays?: IBearPlanCard["days"];
  images: string[];
  invite: string;
  useAi: boolean;
  command?: "prepare" | "apply";
  // Each command gets a new run number. A late answer from a run the user abandoned carries the old number.
  run: number;
  result?: IOnboardingResult;
  importHistory: boolean;
  error?: string;
  notice?: string;
  resizing: boolean;
}

export type IOnboardingEvent =
  | { type: "answers"; patch: Partial<IOnboardingAnswers> }
  | { type: "choose"; optionId: string }
  | { type: "extra"; id: string; value: string[] }
  | { type: "invite"; value: string }
  | { type: "auth"; signedIn: boolean }
  | { type: "next" | "back" | "skip"; visit?: number }
  | { type: "capability"; canImport: boolean }
  | { type: "pick"; days: IBearPlanCard["days"] }
  | { type: "resizing" | "toggleHistory" }
  | { type: "fallback"; reason?: string; run?: number }
  | { type: "images"; images: string[] }
  | { type: "removeImage"; index: number }
  | { type: "ready"; result: IOnboardingResult; run?: number }
  | { type: "failed"; error: string; run?: number };

export const Onboarding_maxImageChars = 3_500_000;

export function Onboarding_empty(
  options: {
    invite?: string;
    answers?: IOnboardingAnswers;
    platform?: IOnboardingPlatform;
    now?: number;
    steps?: readonly IOnboardingStepDef[];
  } = {}
): IOnboardingState {
  const steps = options.steps ?? OnboardingStepList_all;
  const state: IOnboardingState = {
    at: { phase: "flow", id: steps[0]?.id ?? "" },
    visit: 0,
    steps,
    platform: options.platform ?? "web",
    now: options.now ?? Date.now(),
    answers: options.answers ?? OnboardingAnswers_empty(),
    extras: {},
    source: "recommend",
    images: [],
    invite: options.invite ?? "",
    useAi: false,
    run: 0,
    importHistory: true,
    resizing: false,
  };
  const first = OnboardingSteps_first(steps, Onboarding_context(state));
  return first == null ? state : { ...state, at: { phase: "flow", id: first.id } };
}

export function Onboarding_inviteToSave(state: IOnboardingState): string | undefined {
  const asked = state.steps.filter((step) => step.kind === "text" && step.field === "invite");
  const ctx = Onboarding_context(state);
  const visible = asked.some((step) => step.when == null || step.when(ctx));
  return state.invite !== "" && (asked.length === 0 || visible) ? state.invite : undefined;
}

export function Onboarding_context(state: IOnboardingState): IOnboardingContext {
  return {
    answers: state.answers,
    extras: state.extras,
    source: state.source,
    invite: state.invite,
    platform: state.platform,
    now: state.now,
  };
}

export function Onboarding_current(state: IOnboardingState): IOnboardingStepDef | undefined {
  return state.at.phase === "flow" ? OnboardingSteps_find(state.steps, state.at.id) : undefined;
}

export function Onboarding_cards(state: IOnboardingState): IBearPlanCard[] {
  return BearPlan_recommend(OnboardingAnswers_planInput(state.answers));
}

export function Onboarding_selectedCard(state: IOnboardingState): IBearPlanCard | undefined {
  if (state.source === "import") {
    return undefined;
  }
  const cards = Onboarding_cards(state);
  return cards.find((c) => c.days === state.pickedDays) ?? cards.find((c) => c.recommended) ?? cards[0];
}

export function Onboarding_progress(state: IOnboardingState): number {
  return state.at.phase === "flow"
    ? OnboardingSteps_progress(state.steps, state.at.id, Onboarding_context(state))
    : OnboardingSteps_progress(state.steps, sourceStepId(state) ?? "", Onboarding_context(state));
}

function sourceStepId(state: IOnboardingState): string | undefined {
  return state.steps.find((step) => step.kind === "choice" && step.field === "source")?.id;
}

function plansStepId(state: IOnboardingState): string | undefined {
  return state.steps.find((step) => step.kind === "plans")?.id;
}

export function Onboarding_mainAction(
  state: IOnboardingState
): { label: string; event: IOnboardingEvent; enabled: boolean } | undefined {
  const idle = state.command == null && !state.resizing;
  const event: IOnboardingEvent = { type: "next", visit: state.visit };
  if (state.at.phase === "import") {
    return { label: "Build my plan", event, enabled: idle };
  }
  if (state.at.phase === "done") {
    return { label: "Continue", event, enabled: idle };
  }
  const step = Onboarding_current(state);
  if (step == null || !OnboardingSteps_hasButton(step)) {
    return undefined;
  }
  const ctx = Onboarding_context(state);
  const last = OnboardingSteps_next(state.steps, step.id, ctx) == null;
  const label = step.button ?? (last ? "Start my first workout" : "Next");
  return { label, event, enabled: idle && OnboardingSteps_canContinue(step, ctx) };
}

export function Onboarding_canSkip(state: IOnboardingState): boolean {
  return Onboarding_current(state)?.kind === "measure" && state.command == null;
}

const clearedMeasure: Record<"age" | "height" | "weight", Partial<IOnboardingAnswers>> = {
  age: { age: "" },
  height: { height: "", heightFt: "", heightIn: "" },
  weight: { weight: "" },
};

export function Onboarding_canGoBack(state: IOnboardingState): boolean {
  if (state.command != null) {
    return false;
  }
  if (state.at.phase === "import" || state.at.phase === "done") {
    return true;
  }
  return state.at.phase === "flow" && OnboardingSteps_prev(state.steps, state.at.id, Onboarding_context(state)) != null;
}

function command(state: IOnboardingState, kind: NonNullable<IOnboardingState["command"]>): IOnboardingState {
  return { ...state, command: kind, run: state.run + 1, error: undefined };
}

function goTo(state: IOnboardingState, id: string | undefined): IOnboardingState {
  return id == null
    ? state
    : { ...state, at: { phase: "flow", id }, visit: state.visit + 1, error: undefined, notice: undefined };
}

function next(state: IOnboardingState): IOnboardingState {
  if (state.at.phase === "import") {
    return command({ ...state, at: { phase: "working" } }, "prepare");
  }
  if (state.at.phase === "done") {
    const plans = plansStepId(state);
    return goTo(
      state,
      plans == null ? undefined : OnboardingSteps_next(state.steps, plans, Onboarding_context(state))?.id
    );
  }
  const step = Onboarding_current(state);
  const ctx = Onboarding_context(state);
  if (step == null || !OnboardingSteps_canContinue(step, ctx)) {
    return state;
  }
  return advance(state, step);
}

function skip(state: IOnboardingState): IOnboardingState {
  const step = Onboarding_current(state);
  if (step?.kind !== "measure") {
    return state;
  }
  return advance({ ...state, answers: { ...state.answers, ...clearedMeasure[step.measure] } }, step);
}

function advance(state: IOnboardingState, step: IOnboardingStepDef): IOnboardingState {
  const ctx = Onboarding_context(state);
  if (step.kind === "choice" && step.field === "source" && state.source === "import") {
    return state.useAi
      ? { ...state, at: { phase: "import" }, visit: state.visit + 1, error: undefined }
      : { ...state, error: "Import needs sign-in and AI turned on. Pick “Yes, build me a plan” for now." };
  }
  const following = OnboardingSteps_next(state.steps, step.id, ctx);
  if (following != null) {
    return goTo(state, following.id);
  }
  return Onboarding_selectedCard(state) != null || state.result != null
    ? command(state, "apply")
    : { ...state, error: "Pick a plan first." };
}

function back(state: IOnboardingState): IOnboardingState {
  if (state.at.phase === "import") {
    return goTo(state, sourceStepId(state));
  }
  if (state.at.phase === "done") {
    return { ...state, at: { phase: "import" }, visit: state.visit + 1, error: undefined };
  }
  if (state.at.phase !== "flow") {
    return state;
  }
  return goTo(state, OnboardingSteps_prev(state.steps, state.at.id, Onboarding_context(state))?.id);
}

function choose(state: IOnboardingState, optionId: string): IOnboardingState {
  const step = Onboarding_current(state);
  if (step?.kind !== "choice") {
    return state;
  }
  const patch = OnboardingSteps_choose(step, Onboarding_context(state), optionId);
  return {
    ...state,
    answers: patch.answers == null ? state.answers : { ...state.answers, ...patch.answers },
    extras: { ...state.extras, [patch.extra.id]: patch.extra.value },
    source: patch.source ?? state.source,
    error: undefined,
  };
}

export function Onboarding_reduce(state: IOnboardingState, event: IOnboardingEvent): IOnboardingState {
  if (
    (event.type === "ready" || event.type === "failed" || event.type === "fallback") &&
    event.run != null &&
    event.run !== state.run
  ) {
    return state;
  }
  if (
    (event.type === "next" || event.type === "back" || event.type === "skip") &&
    event.visit != null &&
    event.visit !== state.visit
  ) {
    return state;
  }
  if (event.type === "ready") {
    return {
      ...state,
      at: { phase: "done" },
      visit: state.visit + 1,
      command: undefined,
      result: event.result,
      importHistory: (event.result.history?.records.length ?? 0) > 0,
      error: undefined,
    };
  }
  if (event.type === "failed") {
    return {
      ...state,
      at: state.at.phase === "working" ? { phase: "import" } : state.at,
      command: undefined,
      resizing: false,
      error: event.error,
    };
  }
  if (event.type === "fallback" && state.command !== "apply") {
    const notice = event.reason == null ? undefined : `Import did not finish: ${event.reason}`;
    const sourceId = sourceStepId(state);
    const extras = sourceId == null ? state.extras : { ...state.extras, [sourceId]: ["recommend"] };
    const moved = goTo(
      { ...state, source: "recommend", extras, result: undefined, command: undefined, run: state.run + 1 },
      plansStepId(state)
    );
    return { ...moved, notice };
  }
  if (state.command != null) {
    return state;
  }
  switch (event.type) {
    case "toggleHistory":
      return { ...state, importHistory: !state.importHistory };
    case "images": {
      const images = [...state.images, ...event.images];
      return images.length > 6 || images.reduce((n, s) => n + s.length, 0) > Onboarding_maxImageChars
        ? { ...state, resizing: false, error: "Use up to 6 smaller screenshots (3.5 MB total)." }
        : { ...state, images, resizing: false, error: undefined };
    }
    case "resizing":
      return { ...state, resizing: true, error: undefined };
    case "removeImage":
      return { ...state, images: state.images.filter((_, i) => i !== event.index), error: undefined };
    case "answers":
      return { ...state, answers: { ...state.answers, ...event.patch }, error: undefined };
    case "choose":
      return choose(state, event.optionId);
    case "extra":
      return { ...state, extras: { ...state.extras, [event.id]: event.value } };
    case "invite":
      return { ...state, invite: Friends_normalizeHandle(event.value) };
    case "auth": {
      const step = Onboarding_current(state);
      const signedIn = { ...state, useAi: event.signedIn, error: undefined };
      return step?.kind === "signIn" ? next(signedIn) : signedIn;
    }
    case "capability":
      return { ...state, useAi: event.canImport };
    case "pick":
      return { ...state, pickedDays: event.days };
    case "back":
      return back(state);
    case "skip":
      return skip(state);
    case "next":
      return state.resizing ? state : next(state);
    default:
      return state;
  }
}
