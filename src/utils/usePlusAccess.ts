import { IPlusFeature, PlusAccess_allows, PlusAccess_hasPlus } from "../models/plusAccess";
import { PlusAccessStore } from "./plusAccessClient";
import { CloudStore } from "./supabaseClient";

export function usePlusAccess(feature: IPlusFeature): boolean {
  const access = PlusAccessStore.use();
  const userId = CloudStore.use().session?.userId;
  return PlusAccess_allows(feature, access, userId);
}

export function useHasPlus(): boolean {
  const access = PlusAccessStore.use();
  const userId = CloudStore.use().session?.userId;
  return PlusAccess_hasPlus(access, userId);
}
