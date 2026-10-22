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

// The body sizes whose lift-<size>.webp exists for both lines. Sizes missing here show the pumped flex.
export const BearArt_liftingSizes: readonly IBearLevel["size"][] = ["small", "medium", "big", "space"];

export function BearArt_cardSprite(
  line: IBearLine,
  level: number,
  liftingSizes: readonly IBearLevel["size"][] = BearArt_liftingSizes
): string {
  const size = tierForLevel(level).size;
  return liftingSizes.includes(size) ? `/images/bear/${line}/lift-${size}.webp` : BearArt_sprite(line, level, "pumped");
}

export function BearArt_gym(level: number): string {
  return `/images/bear/gyms/${tierForLevel(level).gym}.webp`;
}

export function BearArt_scale(fraction: number): number {
  return 0.85 + 0.15 * Math.max(0, Math.min(1, fraction));
}
