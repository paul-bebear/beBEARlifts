export type IBearTierId = string;

export interface IBearTier {
  id: IBearTierId;
  name: string;
  minKg: number;
  level: number;
  comparison?: string;
  size: "small" | "medium" | "big" | "space";
  gym: string;
}

export interface IBearTierProgress {
  tier: IBearTier;
  next?: IBearTier;
  kgToNext: number;
  fraction: number;
  isTierUp: boolean;
}

const tiers: IBearTier[] = [
  { id: "cub", name: "Cub", level: 1, minKg: 0, size: "small", gym: "bedroom" },
  { id: "teen", name: "Teen", level: 2, minKg: 2000, comparison: "more than a car", size: "small", gym: "bedroom" },
  { id: "amateur", name: "Amateur", level: 3, minKg: 10000, comparison: "a T. rex", size: "small", gym: "bedroom" },
  { id: "rookie", name: "Rookie", level: 4, minKg: 25000, comparison: "2 school buses", size: "medium", gym: "garage" },
  {
    id: "regular",
    name: "Regular",
    level: 5,
    minKg: 50000,
    comparison: "an empty Boeing 737",
    size: "medium",
    gym: "garage",
  },
  {
    id: "strong",
    name: "Strong",
    level: 6,
    minKg: 100000,
    comparison: "a Space Shuttle",
    size: "medium",
    gym: "garage",
  },
  { id: "athlete", name: "Athlete", level: 7, minKg: 175000, comparison: "a blue whale", size: "big", gym: "pro" },
  { id: "power", name: "Power", level: 8, minKg: 300000, comparison: "2 blue whales", size: "big", gym: "pro" },
  { id: "titan", name: "Titan", level: 9, minKg: 420000, comparison: "the ISS", size: "big", gym: "pro" },
  {
    id: "astronaut",
    name: "Astronaut",
    level: 10,
    minKg: 549000,
    comparison: "a Falcon 9",
    size: "space",
    gym: "spaceship",
  },
  { id: "lunar", name: "Lunar", level: 11, minKg: 2970000, comparison: "a Saturn V", size: "space", gym: "moon" },
  { id: "mars", name: "Mars", level: 12, minKg: 5000000, comparison: "a full Starship", size: "space", gym: "mars" },
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
  const totalKg = Math.max(0, beforeKg, afterKg);
  const index = indexFor(totalKg);
  const tier = tiers[index];
  const next = tiers[index + 1];
  const isTierUp = index > indexFor(beforeKg);
  if (next == null) {
    return { tier, kgToNext: 0, fraction: 1, isTierUp };
  }
  const fraction = (totalKg - tier.minKg) / (next.minKg - tier.minKg);
  return {
    tier,
    next,
    kgToNext: Math.max(0, next.minKg - totalKg),
    fraction: Math.min(1, Math.max(0, fraction)),
    isTierUp,
  };
}
