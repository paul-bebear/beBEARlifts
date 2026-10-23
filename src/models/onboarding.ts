import { IOnboardingAnswers, OnboardingAnswers_empty, OnboardingAnswers_planInput } from "./onboardingAnswers";
import { IOnboardingAnswer } from "./onboardingAnswer";
import { IOnboardingHistory } from "./onboardingHistory";
import { Friends_normalizeHandle } from "./friends";
import { IProgram } from "../types";
import { BearPlan_recommend, IBearPlanCard } from "./bearPlanRecommend";

export interface IOnboardingResult {
  answer: IOnboardingAnswer;
  name: string;
  days: number;
  program?: IProgram;
  history?: IOnboardingHistory;
}

export type IOnboardingStep = "welcome" | "place" | "about" | "want" | "import" | "working" | "done" | "plan";

export interface IOnboardingState {
  step: IOnboardingStep;
  answers: IOnboardingAnswers;
  images: string[];
  invite: string;
  useAi: boolean;
  command?: "prepare" | "apply";
  // Each command gets a new run number. A late answer from a run the user abandoned carries the old number.
  run: number;
  cards: IBearPlanCard[];
  selected: number;
  result?: IOnboardingResult;
  importHistory: boolean;
  error?: string;
  notice?: string;
  resizing: boolean;
}

export type IOnboardingEvent =
  | { type: "answers"; patch: Partial<IOnboardingAnswers> }
  | { type: "invite"; value: string }
  | { type: "auth"; signedIn: boolean }
  | { type: "next" | "back" | "recommend" | "import" | "start" | "resizing" | "toggleHistory" }
  | { type: "pick"; index: number }
  | { type: "fallback"; reason?: string; run?: number }
  | { type: "images"; images: string[] }
  | { type: "removeImage"; index: number }
  | { type: "ready"; result: IOnboardingResult; run?: number }
  | { type: "failed"; error: string; run?: number };

const Onboarding_maxImageChars = 3_500_000;

const backSteps: Partial<Record<IOnboardingStep, IOnboardingStep>> = {
  place: "welcome",
  about: "place",
  want: "about",
  import: "want",
  plan: "want",
  done: "import",
};

export function Onboarding_empty(
  invite: string = "",
  answers: IOnboardingAnswers = OnboardingAnswers_empty()
): IOnboardingState {
  return {
    step: "welcome",
    answers,
    images: [],
    invite,
    useAi: false,
    run: 0,
    cards: [],
    selected: 0,
    importHistory: true,
    resizing: false,
  };
}

function Onboarding_canContinue(state: IOnboardingState): boolean {
  return state.step !== "place" || state.answers.places.length > 0;
}

const mainActions: Partial<Record<IOnboardingStep, { label: string; event: IOnboardingEvent }>> = {
  place: { label: "Next", event: { type: "next" } },
  about: { label: "Next", event: { type: "next" } },
  want: { label: "Recommend a plan", event: { type: "recommend" } },
  import: { label: "Build my plan", event: { type: "next" } },
  plan: { label: "Start", event: { type: "start" } },
  done: { label: "Start", event: { type: "start" } },
};

export function Onboarding_mainAction(
  state: IOnboardingState
): { label: string; event: IOnboardingEvent; enabled: boolean } | undefined {
  const action = mainActions[state.step];
  if (action == null) {
    return undefined;
  }
  if (!Onboarding_canContinue(state)) {
    return { ...action, label: "Pick at least one", enabled: false };
  }
  return { ...action, enabled: state.command == null && !state.resizing };
}

export function Onboarding_canGoBack(state: IOnboardingState): boolean {
  return state.command == null && backSteps[state.step] != null;
}

export function Onboarding_selectedCard(state: IOnboardingState): IBearPlanCard | undefined {
  return state.step === "plan" ? state.cards[state.selected] : undefined;
}

function command(state: IOnboardingState, next: NonNullable<IOnboardingState["command"]>): IOnboardingState {
  return { ...state, command: next, run: state.run + 1, error: undefined };
}

function recommend(state: IOnboardingState, notice?: string): IOnboardingState {
  return {
    ...state,
    step: "plan",
    command: undefined,
    cards: BearPlan_recommend(OnboardingAnswers_planInput(state.answers)),
    selected: 0,
    result: undefined,
    error: undefined,
    notice,
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
  if (event.type === "ready") {
    return {
      ...state,
      step: "done",
      command: undefined,
      result: event.result,
      importHistory: (event.result.history?.records.length ?? 0) > 0,
      error: undefined,
    };
  }
  if (event.type === "failed") {
    return {
      ...state,
      step: state.step === "working" ? "import" : state.step,
      command: undefined,
      resizing: false,
      error: event.error,
    };
  }
  if (event.type === "fallback" && state.command !== "apply") {
    const notice = event.reason == null ? undefined : `Import did not finish: ${event.reason}`;
    return recommend({ ...state, run: state.run + 1 }, notice);
  }
  if (state.command != null) {
    return state;
  }
  if (event.type === "toggleHistory") {
    return { ...state, importHistory: !state.importHistory };
  }
  if (event.type === "images") {
    const images = [...state.images, ...event.images];
    return images.length > 6 || images.reduce((n, s) => n + s.length, 0) > Onboarding_maxImageChars
      ? { ...state, resizing: false, error: "Use up to 6 smaller screenshots (3.5 MB total)." }
      : { ...state, images, resizing: false, error: undefined };
  }
  if (event.type === "resizing") {
    return { ...state, resizing: true, error: undefined };
  }
  if (event.type === "removeImage") {
    return { ...state, images: state.images.filter((_, i) => i !== event.index), error: undefined };
  }
  if (event.type === "answers") {
    return { ...state, answers: { ...state.answers, ...event.patch }, error: undefined };
  }
  if (event.type === "invite") {
    return { ...state, invite: Friends_normalizeHandle(event.value) };
  }
  if (event.type === "auth" && state.step === "welcome") {
    return { ...state, step: "place", useAi: event.signedIn, error: undefined };
  }
  if (event.type === "back") {
    const step = backSteps[state.step];
    return step == null ? state : { ...state, step, error: undefined, notice: undefined };
  }
  if (event.type === "recommend" && state.step === "want") {
    return recommend(state);
  }
  if (event.type === "import" && state.step === "want" && state.useAi) {
    return { ...state, step: "import", error: undefined };
  }
  if (event.type === "pick" && state.step === "plan" && event.index >= 0 && event.index < state.cards.length) {
    return { ...state, selected: event.index };
  }
  if (event.type === "start" && (state.step === "plan" ? state.cards.length > 0 : state.step === "done")) {
    return command(state, "apply");
  }
  if (event.type === "next" && !state.resizing && Onboarding_canContinue(state)) {
    if (state.step === "import") {
      return command({ ...state, step: "working" }, "prepare");
    }
    const next: Partial<Record<IOnboardingStep, IOnboardingStep>> = { place: "about", about: "want" };
    const step = next[state.step];
    return step == null ? state : { ...state, step, error: undefined };
  }
  return state;
}
