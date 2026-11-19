import { FoodLog_empty, FoodLog_parse, IFoodLog } from "../models/foodLog";
import { JsonStore_create } from "./jsonStore";
import { LocalId_new } from "./localId";

export const FoodLogStore_key = "bebear_foodlog";

const store = JsonStore_create(FoodLogStore_key, FoodLog_parse, FoodLog_empty);

export const FoodLogStore_load = store.load;
export const FoodLogStore_loadStrict = store.loadStrict;
export const FoodLogStore_update = store.update;
export const useFoodLog = store.use;

export async function FoodLogStore_replace(log: IFoodLog): Promise<void> {
  return store.replace(log);
}

export const FoodLogStore_newId = LocalId_new;
