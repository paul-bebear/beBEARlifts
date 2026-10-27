export type IBearTierId = string;
export type IBearTierSet = "male" | "female";

export interface IBearLevel {
  id: IBearTierId;
  name: string;
  level: number;
  size: "small" | "medium" | "big" | "space";
  gym: string;
}

export interface IBearTier extends IBearLevel {
  minKg: number;
}

export interface IBearTierProgress {
  tier: IBearTier;
  next?: IBearTier;
  kgToNext: number;
  fraction: number;
  isTierUp: boolean;
}

interface IBearLevelDef extends IBearLevel {
  maleMinKg: number;
}

const femaleShare = 0.6;
const femaleStepKg = 1000;

const levels: readonly IBearLevelDef[] = [
  { id: "cub", name: "Cub", level: 1, maleMinKg: 0, size: "small", gym: "trailer-park" },
  { id: "teen", name: "Teen", level: 2, maleMinKg: 2000, size: "small", gym: "trailer-park" },
  { id: "amateur", name: "Amateur", level: 3, maleMinKg: 12000, size: "small", gym: "trailer-park" },
  { id: "rookie", name: "Rookie", level: 4, maleMinKg: 36000, size: "medium", gym: "discount-gym" },
  { id: "regular", name: "Regular", level: 5, maleMinKg: 80000, size: "medium", gym: "discount-gym" },
  { id: "strong", name: "Strong", level: 6, maleMinKg: 175000, size: "medium", gym: "luxury-club" },
  { id: "athlete", name: "Athlete", level: 7, maleMinKg: 460000, size: "big", gym: "luxury-club" },
  { id: "power", name: "Power", level: 8, maleMinKg: 820000, size: "big", gym: "mansion-gym" },
  { id: "titan", name: "Titan", level: 9, maleMinKg: 1250000, size: "big", gym: "mansion-gym" },
  { id: "astronaut", name: "Astronaut", level: 10, maleMinKg: 3100000, size: "space", gym: "spaceship" },
  { id: "lunar", name: "Lunar", level: 11, maleMinKg: 5000000, size: "space", gym: "moon" },
  { id: "mars", name: "Mars", level: 12, maleMinKg: 7000000, size: "space", gym: "mars" },
];

function minKgFor(def: IBearLevelDef, set: IBearTierSet): number {
  return set === "female" ? Math.round((def.maleMinKg * femaleShare) / femaleStepKg) * femaleStepKg : def.maleMinKg;
}

function tiersFor(set: IBearTierSet): readonly IBearTier[] {
  return levels.map((def) => {
    const { maleMinKg, ...level } = def;
    return { ...level, minKg: minKgFor(def, set) };
  });
}

const tiersBySet: Record<IBearTierSet, readonly IBearTier[]> = {
  male: tiersFor("male"),
  female: tiersFor("female"),
};

export function BearTier_all(set: IBearTierSet): readonly IBearTier[] {
  return tiersBySet[set];
}

export function BearTier_byLevel(level: number): IBearLevel | undefined {
  return tiersBySet.male.find((tier) => tier.level === level);
}

// The food profile sex wins. The bear line covers a user who skipped the profile. Men's numbers are the default.
export function BearTier_setFor(sex: IBearTierSet | undefined, line: IBearTierSet | undefined): IBearTierSet {
  return sex ?? line ?? "male";
}

function indexFor(tiers: readonly IBearTier[], totalKg: number): number {
  let index = 0;
  for (let i = 0; i < tiers.length; i += 1) {
    if (totalKg >= tiers[i].minKg) {
      index = i;
    }
  }
  return index;
}

export function BearTier_for(totalKg: number, set: IBearTierSet): IBearTier {
  const tiers = tiersBySet[set];
  return tiers[indexFor(tiers, totalKg)];
}

export function BearTier_progress(beforeKg: number, afterKg: number, set: IBearTierSet): IBearTierProgress {
  const tiers = tiersBySet[set];
  const totalKg = Math.max(0, beforeKg, afterKg);
  const index = indexFor(tiers, totalKg);
  const tier = tiers[index];
  const next = tiers[index + 1];
  const isTierUp = index > indexFor(tiers, beforeKg);
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
