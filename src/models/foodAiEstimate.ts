import { FoodAddFlow_photoChoices, IFoodPhotoChoice } from "./foodAddFlow";
import type { IFoodCapturePhoto } from "./foodCapture";
import { IFoodPhotoEstimate } from "./foodPhotoEstimate";
import type { IScanResume } from "./foodScanSteps";

export interface IFoodAiState {
  text: string;
  photo?: string;
  isSending: boolean;
  requestId: number;
  error?: string;
  authError?: string;
  note?: string;
  choices?: IFoodPhotoChoice[];
}

export type IFoodAiEvent =
  | { type: "typed"; text: string }
  | { type: "picked"; result: IFoodCapturePhoto }
  | { type: "photoRemoved" }
  | { type: "sent"; requestId: number }
  | { type: "signedOut"; error: string; requestId: number }
  | { type: "estimated"; estimate: IFoodPhotoEstimate; requestId: number }
  | { type: "failed"; error: string; requestId: number }
  | { type: "choicesChanged"; choices: IFoodPhotoChoice[] }
  | { type: "added" };

export type IFoodAiRequest = { kind: "photo"; photo: string; text: string } | { kind: "describe"; text: string };

export function FoodAiEstimate_initial(resume?: IScanResume): IFoodAiState {
  if (resume == null) {
    return { text: "", isSending: false, requestId: 0 };
  }
  const state: IFoodAiState = { text: resume.text ?? "", isSending: false, requestId: 0, choices: resume.choices };
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
  return {
    ...state,
    isSending: false,
    requestId: state.requestId + 1,
    error: undefined,
    authError: undefined,
    note: undefined,
    choices: undefined,
  };
}

export function FoodAiEstimate_nextRequestId(state: IFoodAiState): number {
  return state.requestId + 1;
}

export function FoodAiEstimate_reduce(state: IFoodAiState, event: IFoodAiEvent): IFoodAiState {
  if (
    (event.type === "estimated" || event.type === "failed" || event.type === "signedOut") &&
    event.requestId !== state.requestId
  ) {
    return state;
  }
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
      return { ...state, isSending: true, requestId: event.requestId, error: undefined, authError: undefined };
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
      return { ...FoodAiEstimate_initial(), requestId: state.requestId + 1 };
  }
}
