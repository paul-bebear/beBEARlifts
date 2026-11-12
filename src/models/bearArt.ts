import { IBearMood } from "./bear";
import { IBearFur, IBearLine } from "./bearStoreData";
import { BearTier_all, BearTier_byLevel, IBearLevel } from "./bearTier";
import type { IPostBear } from "./workoutPost";

function tierForLevel(level: number): IBearLevel {
  return BearTier_byLevel(level) ?? BearTier_all("male")[0];
}

export const BearArt_folder = "brown";

// The app draws one bear. Friends' bears, backups and old clients still send a line and a fur, so both stay here.
export function BearArt_sprite(_line: IBearLine, _fur: IBearFur, level: number, mood: IBearMood): string {
  const tier = tierForLevel(level);
  const name = mood === "normal" ? `level-${String(tier.level).padStart(2, "0")}` : `mood-${tier.size}-${mood}`;
  return `/images/bear/${BearArt_folder}/${name}.webp`;
}

export function BearArt_postSprite(bear: IPostBear | undefined): string {
  return BearArt_sprite(bear?.line ?? "male", bear?.fur ?? "brown", bear?.level ?? 1, bear?.mood ?? "normal");
}

export const BearArt_liftingSizes: readonly IBearLevel["size"][] = [];

export function BearArt_cardSprite(
  line: IBearLine,
  fur: IBearFur,
  level: number,
  liftingSizes: readonly IBearLevel["size"][] = BearArt_liftingSizes
): string {
  const size = tierForLevel(level).size;
  return liftingSizes.includes(size)
    ? `/images/bear/${BearArt_folder}/lift-${size}.webp`
    : BearArt_sprite(line, fur, level, "pumped");
}

const furColors: Partial<Record<IBearFur, string>> = { black: "#2B2522", polar: "#F4EEE2" };

export function BearArt_furColor(fur: IBearFur | undefined, fallback: string): string {
  return (fur != null ? furColors[fur] : undefined) ?? fallback;
}

export function BearArt_gym(level: number): string {
  return `/images/bear/gyms/${tierForLevel(level).gym}.webp`;
}
