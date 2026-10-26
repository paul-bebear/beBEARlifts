import { FoodAddFlow_photoChoices, IFoodPhotoChoice } from "./foodAddFlow";
import { IFoodPhotoEstimate } from "./foodPhotoEstimate";
import type { IScanResume } from "./foodScanSteps";

export interface IFoodDescribeState {
  text: string;
  isLoading: boolean;
  error?: string;
  authError?: string;
  note?: string;
  choices?: IFoodPhotoChoice[];
}

export type IFoodDescribeEvent =
  | { type: "typed"; text: string }
  | { type: "sent" }
  | { type: "signedOut"; error: string }
  | { type: "estimated"; estimate: IFoodPhotoEstimate }
  | { type: "failed"; error: string }
  | { type: "choicesChanged"; choices: IFoodPhotoChoice[] }
  | { type: "added" };

export function FoodDescribeEstimate_initial(resume?: IScanResume): IFoodDescribeState {
  return resume == null
    ? { text: "", isLoading: false }
    : { text: resume.text ?? "", isLoading: false, choices: resume.choices };
}

export function FoodDescribeEstimate_canSend(state: IFoodDescribeState): boolean {
  return !state.isLoading && state.text.trim() !== "";
}

export function FoodDescribeEstimate_hasChoices(state: IFoodDescribeState): boolean {
  return state.choices != null && state.choices.length > 0;
}

export function FoodDescribeEstimate_reduce(state: IFoodDescribeState, event: IFoodDescribeEvent): IFoodDescribeState {
  switch (event.type) {
    case "typed":
      return { ...state, text: event.text };
    case "sent":
      return { ...state, isLoading: true, error: undefined, authError: undefined };
    case "signedOut":
      return { ...state, isLoading: false, authError: event.error };
    case "estimated":
      return {
        ...state,
        isLoading: false,
        error: undefined,
        note: event.estimate.note,
        choices: FoodAddFlow_photoChoices(event.estimate.items),
      };
    case "failed":
      return { ...state, isLoading: false, error: event.error, note: undefined, choices: undefined };
    case "choicesChanged":
      return { ...state, choices: event.choices };
    case "added":
      return FoodDescribeEstimate_initial();
  }
}
