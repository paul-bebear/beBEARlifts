import { IBearLine, IBearStoreData } from "./bearStoreData";
import { BearTier_for } from "./bearTier";

export interface IBearLevelUp {
  from: number;
  to: number;
}

export interface IBearCelebrationStep {
  store: IBearStoreData;
  levelUp?: IBearLevelUp;
}

export function BearCelebration_reachedLevel(countedKg: number): number {
  return BearTier_for(countedKg).level;
}

// An existing user meets the bear with years of history. Seeding raises celebratedLevel without a card,
// so they never replay every level-up from Cub.
export function BearCelebration_seed(store: IBearStoreData, countedKg: number): IBearStoreData {
  if (store.seeded) {
    return store;
  }
  const celebratedLevel = Math.max(store.celebratedLevel, BearCelebration_reachedLevel(countedKg));
  return { ...store, celebratedLevel, seeded: true };
}

export function BearCelebration_step(store: IBearStoreData, countedKg: number): IBearCelebrationStep {
  if (!store.seeded) {
    return { store: BearCelebration_seed(store, countedKg) };
  }
  const reached = BearCelebration_reachedLevel(countedKg);
  if (reached <= store.celebratedLevel) {
    return { store };
  }
  return { store: { ...store, celebratedLevel: reached }, levelUp: { from: store.celebratedLevel, to: reached } };
}

export function BearCelebration_setLine(store: IBearStoreData, line: IBearLine): IBearStoreData {
  return store.line === line ? store : { ...store, line };
}
