export type IBearTierId = "cub" | "sunBear" | "blackBear" | "grizzly" | "polar" | "kodiak";

export interface IBearTier {
  id: IBearTierId;
  name: string;
  minKg: number;
}

export interface IBearTierProgress {
  tier: IBearTier;
  next?: IBearTier;
  kgToNext: number;
  fraction: number;
  isTierUp: boolean;
}

// At 6,000 kg a session and 3 sessions a week: Sun bear in 2 weeks, Grizzly in 7 months, Kodiak in 5 years.
const tiers: IBearTier[] = [
  { id: "cub", name: "Cub", minKg: 0 },
  { id: "sunBear", name: "Sun bear", minKg: 25000 },
  { id: "blackBear", name: "Black bear", minKg: 100000 },
  { id: "grizzly", name: "Grizzly", minKg: 500000 },
  { id: "polar", name: "Polar", minKg: 1500000 },
  { id: "kodiak", name: "Kodiak", minKg: 5000000 },
];

export function BearTier_all(): readonly IBearTier[] {
  return tiers;
}

function indexFor(totalKg: number): number {
  let index = 0;
  for (let i = 0; i < tiers.length; i += 1) {
    if (totalKg >= tiers[i].minKg) {
      index = i;
    }
  }
  return index;
}

export function BearTier_for(totalKg: number): IBearTier {
  return tiers[indexFor(totalKg)];
}

export function BearTier_progress(beforeKg: number, afterKg: number): IBearTierProgress {
  const index = indexFor(afterKg);
  const tier = tiers[index];
  const next = tiers[index + 1];
  const isTierUp = index > indexFor(beforeKg);
  if (next == null) {
    return { tier, kgToNext: 0, fraction: 1, isTierUp };
  }
  const fraction = (afterKg - tier.minKg) / (next.minKg - tier.minKg);
  return {
    tier,
    next,
    kgToNext: Math.max(0, next.minKg - afterKg),
    fraction: Math.min(1, Math.max(0, fraction)),
    isTierUp,
  };
}
