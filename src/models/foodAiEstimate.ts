import { FoodAddFlow_photoChoices, IFoodPhotoChoice } from "./foodAddFlow";
import type { IFoodCapturePhoto } from "./foodCapture";
import { IFoodPhotoEstimate } from "./foodPhotoEstimate";
import type { IScanResume } from "./foodScanSteps";

export interface IFoodAiState {
  text: string;
  photo?: string;
  isSending: boolean;
  error?: string;
  authError?: string;
  note?: string;
  choices?: IFoodPhotoChoice[];
}

export type IFoodAiEvent =
  | { type: "typed"; text: string }
  | { type: "picked"; result: IFoodCapturePhoto }
  | { type: "photoRemoved" }
  | { type: "sent" }
  | { type: "signedOut"; error: string }
  | { type: "estimated"; estimate: IFoodPhotoEstimate }
  | { type: "failed"; error: string }
  | { type: "choicesChanged"; choices: IFoodPhotoChoice[] }
  | { type: "added" };

export type IFoodAiRequest = { kind: "photo"; photo: string; text: string } | { kind: "describe"; text: string };

export function FoodAiEstimate_initial(resume?: IScanResume): IFoodAiState {
  if (resume == null) {
    return { text: "", isSending: false };
  }
  const state: IFoodAiState = { text: resume.text ?? "", isSending: false, choices: resume.choices };
  return resume.photo != null ? { ...state, photo: resume.photo } : state;
}

export function FoodAiEstimate_request(state: IFoodAiState): IFoodAiRequest | undefined {
  const text = state.text.trim();
  if (state.isSending) {
    return undefined;
  }
  if (state.photo != null) {
    return { kind: "photo", photo: state.photo, text };
  }
  return text === "" ? undefined : { kind: "describe", text };
}

export function FoodAiEstimate_canSend(state: IFoodAiState): boolean {
  return FoodAiEstimate_request(state) != null;
}

export function FoodAiEstimate_hasChoices(state: IFoodAiState): boolean {
  return state.choices != null && state.choices.length > 0;
}

function withoutEstimate(state: IFoodAiState): IFoodAiState {
  return { ...state, error: undefined, authError: undefined, note: undefined, choices: undefined };
}

export function FoodAiEstimate_reduce(state: IFoodAiState, event: IFoodAiEvent): IFoodAiState {
  switch (event.type) {
    case "typed":
      return { ...state, text: event.text };
    case "picked":
      if (event.result.kind === "photo") {
        return { ...withoutEstimate(state), photo: event.result.dataUrl };
      }
      return event.result.kind === "error" ? { ...state, error: event.result.error } : state;
    case "photoRemoved":
      return { ...withoutEstimate(state), photo: undefined };
    case "sent":
      return { ...state, isSending: true, error: undefined, authError: undefined };
    case "signedOut":
      return { ...state, isSending: false, authError: event.error };
    case "estimated":
      return {
        ...state,
        isSending: false,
        error: undefined,
        note: event.estimate.note,
        choices: FoodAddFlow_photoChoices(event.estimate.items),
      };
    case "failed":
      return { ...state, isSending: false, error: event.error, note: undefined, choices: undefined };
    case "choicesChanged":
      return { ...state, choices: event.choices };
    case "added":
      return FoodAiEstimate_initial();
  }
}
