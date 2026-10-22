import { FoodAddFlow_photoChoices, IFoodPhotoChoice } from "./foodAddFlow";
import { FoodBasket_entries, FoodBasket_fromChoices, FoodBasket_putAll } from "./foodBasket";
import { IFoodEntry, IFoodMeal } from "./foodLog";
import { IFoodPhotoEstimate } from "./foodPhotoEstimate";

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

export function FoodDescribeEstimate_initial(): IFoodDescribeState {
  return { text: "", isLoading: false };
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

export function FoodDescribeEstimate_entries(
  choices: IFoodPhotoChoice[],
  where: { day: string; meal: IFoodMeal },
  newId: () => string,
  now: number
): IFoodEntry[] {
  const basket = FoodBasket_putAll([], FoodBasket_fromChoices(choices, "manual", now));
  return FoodBasket_entries(basket, where, newId, now);
}
