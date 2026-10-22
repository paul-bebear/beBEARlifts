import { IBearMood } from "./bear";
import { IBearLine } from "./bearStoreData";
import { BearTier_all, BearTier_byLevel, IBearLevel } from "./bearTier";

function tierForLevel(level: number): IBearLevel {
  return BearTier_byLevel(level) ?? BearTier_all("male")[0];
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
