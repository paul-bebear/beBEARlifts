import { IBearLine } from "./bearStoreData";
import { BearTier_byLevel } from "./bearTier";

export function BearLevelUpArt_image(line: IBearLine, level: number): string | undefined {
  return level > 1 && BearTier_byLevel(level) != null
    ? `/images/bear/${line}/levelup-${String(level).padStart(2, "0")}.webp`
    : undefined;
}
