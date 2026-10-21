import { WarmupPlan_empty, WarmupPlan_parseLog } from "../models/warmupPlan";
import { JsonStore_create } from "./jsonStore";

export const WarmupStore_key = "bebear_warmups";

const store = JsonStore_create(WarmupStore_key, WarmupPlan_parseLog, WarmupPlan_empty);

export const WarmupStore_load = store.load;
export const WarmupStore_update = store.update;
export const useWarmupLog = store.use;
