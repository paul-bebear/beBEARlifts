import { IPlusFeature, PlusAccess_allows, PlusAccess_hasPlus } from "../models/plusAccess";
import { AccountPlanStore } from "./accountPlanClient";
import { CloudStore } from "./supabaseClient";

export function usePlusAccess(feature: IPlusFeature): boolean {
  const plan = AccountPlanStore.use();
  const userId = CloudStore.use().session?.userId;
  return PlusAccess_allows(feature, plan, userId);
}

export function useHasPlus(): boolean {
  const plan = AccountPlanStore.use();
  const userId = CloudStore.use().session?.userId;
  return PlusAccess_hasPlus(plan, userId);
}
