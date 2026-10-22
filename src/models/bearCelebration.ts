import { IBearLine, IBearStoreData } from "./bearStoreData";
import { BearTier_for, IBearTierSet } from "./bearTier";

export interface IBearLevelUp {
  from: number;
  to: number;
}

export interface IBearCelebrationStep {
  store: IBearStoreData;
  levelUp?: IBearLevelUp;
}

export function BearCelebration_reachedLevel(countedKg: number, set: IBearTierSet): number {
  return BearTier_for(countedKg, set).level;
}

// An existing user meets the bear with years of history. Seeding raises celebratedLevel without a card,
// so they never replay every level-up from Cub.
export function BearCelebration_seed(store: IBearStoreData, countedKg: number, set: IBearTierSet): IBearStoreData {
  if (store.seeded) {
    return store;
  }
  const celebratedLevel = Math.max(store.celebratedLevel, BearCelebration_reachedLevel(countedKg, set));
  return { ...store, celebratedLevel, seeded: true };
}

export function BearCelebration_step(
  store: IBearStoreData,
  countedKg: number,
  set: IBearTierSet
): IBearCelebrationStep {
  if (!store.seeded) {
    return { store: BearCelebration_seed(store, countedKg, set) };
  }
  const reached = BearCelebration_reachedLevel(countedKg, set);
  if (reached <= store.celebratedLevel) {
    return { store };
  }
  return { store: { ...store, celebratedLevel: reached }, levelUp: { from: store.celebratedLevel, to: reached } };
}

export function BearCelebration_setLine(store: IBearStoreData, line: IBearLine): IBearStoreData {
  return store.line === line ? store : { ...store, line };
}
