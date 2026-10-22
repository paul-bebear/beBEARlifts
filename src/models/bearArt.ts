import { IBearMood } from "./bear";
import { IBearLine } from "./bearStoreData";
import { BearTier_all, IBearTier } from "./bearTier";

function tierForLevel(level: number): IBearTier {
  const tiers = BearTier_all();
  return tiers.find((tier) => tier.level === level) ?? tiers[0];
}

export function BearArt_sprite(line: IBearLine, level: number, mood: IBearMood): string {
  const tier = tierForLevel(level);
  const name = mood === "normal" ? `level-${String(tier.level).padStart(2, "0")}` : `mood-${tier.size}-${mood}`;
  return `/images/bear/${line}/${name}.webp`;
}

export function BearArt_gym(level: number): string {
  return `/images/bear/gyms/${tierForLevel(level).gym}.webp`;
}

export function BearArt_scale(fraction: number): number {
  return 0.85 + 0.15 * Math.max(0, Math.min(1, fraction));
}
