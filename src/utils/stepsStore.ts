import { Platform } from "react-native";
import { Steps_chartDays, Steps_empty, Steps_fromHealth, Steps_mergeHealth, Steps_parse } from "../models/steps";
import { HealthAdapter } from "./health";
import { JsonStore_create } from "./jsonStore";

export const StepsStore = JsonStore_create("bebear_steps", Steps_parse, Steps_empty);

const health = new HealthAdapter();

export async function StepsStore_canSyncHealth(): Promise<boolean> {
  return Platform.OS === "ios" && health.isAvailable();
}

export async function StepsStore_syncHealth(): Promise<void> {
  if (!(await StepsStore_canSyncHealth())) {
    return;
  }
  const samples = await health.readDailySteps(Steps_chartDays + 1);
  await StepsStore.update((log) => Steps_mergeHealth(log, Steps_fromHealth(samples)));
}
