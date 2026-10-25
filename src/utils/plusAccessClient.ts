import { IPlusFeature, PlusAccess_allows, PlusAccess_needsPlus } from "../models/plusAccess";
import { AccountPlanStore } from "./accountPlanClient";
import { CloudStore } from "./supabaseClient";

export async function PlusAccessClient_allows(feature: IPlusFeature): Promise<boolean> {
  if (!PlusAccess_needsPlus(feature)) {
    return true;
  }
  const [plan, cloud] = await Promise.all([AccountPlanStore.load(), CloudStore.load()]);
  return PlusAccess_allows(feature, plan, cloud.session?.userId);
}
