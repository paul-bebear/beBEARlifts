import { IBearMood } from "./bear";
import { IBearFur, IBearLine } from "./bearStoreData";
import { BearTier_all, BearTier_byLevel, IBearLevel } from "./bearTier";

function tierForLevel(level: number): IBearLevel {
  return BearTier_byLevel(level) ?? BearTier_all("male")[0];
}

function furFolder(line: IBearLine, fur: IBearFur): string {
  return fur === "brown" ? line : `${line}-${fur}`;
}

export function BearArt_sprite(line: IBearLine, fur: IBearFur, level: number, mood: IBearMood): string {
  const tier = tierForLevel(level);
  const name = mood === "normal" ? `level-${String(tier.level).padStart(2, "0")}` : `mood-${tier.size}-${mood}`;
  return `/images/bear/${furFolder(line, fur)}/${name}.webp`;
}

// The body sizes whose lift-<size>.webp exists for both lines. Sizes missing here show the pumped flex.
export const BearArt_liftingSizes: readonly IBearLevel["size"][] = ["small", "medium", "big", "space"];

export function BearArt_cardSprite(
  line: IBearLine,
  fur: IBearFur,
  level: number,
  liftingSizes: readonly IBearLevel["size"][] = BearArt_liftingSizes
): string {
  const size = tierForLevel(level).size;
  return liftingSizes.includes(size)
    ? `/images/bear/${furFolder(line, fur)}/lift-${size}.webp`
    : BearArt_sprite(line, fur, level, "pumped");
}

const furColors: Partial<Record<IBearFur, string>> = { black: "#2B2522", polar: "#F4EEE2" };

export function BearArt_furColor(fur: IBearFur | undefined, fallback: string): string {
  return (fur != null ? furColors[fur] : undefined) ?? fallback;
}

export function BearArt_gym(level: number): string {
  return `/images/bear/gyms/${tierForLevel(level).gym}.webp`;
}

export function BearArt_scale(fraction: number): number {
  return 0.85 + 0.15 * Math.max(0, Math.min(1, fraction));
}
