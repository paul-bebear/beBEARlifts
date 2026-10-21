import { IOnboardingAnswers, OnboardingAnswers_empty } from "./onboardingAnswers";
import { IOnboardingAnswer } from "./onboardingAnswer";
import { IProgram } from "../types";

export interface IOnboardingResult {
  answer: IOnboardingAnswer;
  name: string;
  days: number;
  program?: IProgram;
}

export interface IOnboardingState {
  step: "auth" | "goal" | "body" | "plan" | "working" | "done" | "manual";
  answers: IOnboardingAnswers;
  images: string[];
  invite: string;
  useAi: boolean;
  command?: "prepare" | "fallback" | "apply";
  result?: IOnboardingResult;
  error?: string;
  resizing: boolean;
}

export type IOnboardingEvent =
  | { type: "answers"; patch: Partial<IOnboardingAnswers> }
  | { type: "invite"; value: string }
  | { type: "auth"; signedIn: boolean }
  | { type: "next" | "skip" | "back" | "manual" | "start" | "fallback" | "resizing" }
  | { type: "images"; images: string[] }
  | { type: "removeImage"; index: number }
  | { type: "ready"; result: IOnboardingResult }
  | { type: "failed"; error: string };

export const Onboarding_maxImageChars = 3_500_000;

export function Onboarding_empty(invite: string = ""): IOnboardingState {
  return { step: "auth", answers: OnboardingAnswers_empty(), images: [], invite, useAi: false, resizing: false };
}

export function Onboarding_reduce(state: IOnboardingState, event: IOnboardingEvent): IOnboardingState {
  if (event.type === "ready") {
    return { ...state, step: "done", command: undefined, result: event.result, error: undefined };
  }
  if (event.type === "failed") {
    return {
      ...state,
      step: state.step === "working" ? "plan" : state.step,
      command: undefined,
      resizing: false,
      error: event.error,
    };
  }
  if (state.command != null) {
    return state;
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
    return { ...state, invite: event.value };
  }
  if (event.type === "manual") {
    return { ...state, step: "manual" };
  }
  if (event.type === "auth") {
    return { ...state, step: "goal", useAi: event.signedIn };
  }
  if (event.type === "start" && state.result != null) {
    return { ...state, command: "apply", error: undefined };
  }
  if (event.type === "fallback") {
    return { ...state, step: "working", command: "fallback", error: undefined };
  }
  if (event.type === "back") {
    const step = state.step === "body" ? "goal" : state.step === "plan" ? "body" : "auth";
    return { ...state, step, error: undefined };
  }
  if ((event.type === "next" || event.type === "skip") && !state.resizing) {
    const defaults = OnboardingAnswers_empty();
    const answers =
      event.type !== "skip"
        ? state.answers
        : state.step === "goal"
          ? {
              ...state.answers,
              goal: defaults.goal,
              days: defaults.days,
              minutes: defaults.minutes,
              equipment: defaults.equipment,
            }
          : state.step === "body"
            ? { ...state.answers, height: "", weight: "", age: "", sex: undefined, experience: "new" as const }
            : { ...state.answers, plan: "" };
    if (state.step === "plan") {
      return {
        ...state,
        answers,
        images: event.type === "skip" ? [] : state.images,
        step: "working",
        command: state.useAi ? "prepare" : "fallback",
        error: undefined,
      };
    }
    return { ...state, answers, step: state.step === "goal" ? "body" : "plan", error: undefined };
  }
  return state;
}
