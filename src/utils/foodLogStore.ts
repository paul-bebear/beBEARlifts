import { FoodLog_empty, FoodLog_parse, IFoodLog } from "../models/foodLog";
import { JsonStore_create } from "./jsonStore";

export const FoodLogStore_key = "bebear_foodlog";

const store = JsonStore_create(FoodLogStore_key, FoodLog_parse, FoodLog_empty);

export const FoodLogStore_load = store.load;
export const FoodLogStore_get = store.get;
export const FoodLogStore_update = store.update;
export const FoodLogStore_subscribe = store.subscribe;
export const useFoodLog = store.use;

export async function FoodLogStore_replace(log: IFoodLog): Promise<void> {
  return FoodLogStore_update(() => log);
}

export function FoodLogStore_newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
