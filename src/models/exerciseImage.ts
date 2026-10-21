import { IExerciseType, ISettings } from "../types";
import { FreeExerciseDbImages_idOf } from "./freeExerciseDbImages";

const LEGACY_LIBRARY_URL =
  /^(?:https?:\/\/[^/]*liftosaur\.com)?\/externalimages\/exercises\/(?:single\/small|full\/large)\/([a-z0-9]+_[a-z0-9]+)_(?:single_small|full_large)\.png$/;
const LIFTOSAUR_HOST = /^https?:\/\/(?:[^/]*\.)?liftosaur\.com(?:[:/]|$)|liftosaurimages/;

export function ExerciseImageUtils_id(type: IExerciseType): string {
  const equipment = type.equipment || "bodyweight";
  return `${type.id.toLowerCase()}_${(equipment || "bodyweight").toLowerCase()}`;
}

export function ExerciseImageUtils_exists(type: IExerciseType, _size?: "small" | "large"): boolean {
  return FreeExerciseDbImages_idOf(ExerciseImageUtils_id(type)) != null;
}

export function ExerciseImageUtils_libraryUrl(key: string, size: "small" | "large"): string | undefined {
  const id = FreeExerciseDbImages_idOf(key);
  return id ? `/images/exercises/${size}/${id}.jpg` : undefined;
}

// Custom exercises saved before the switch to free-exercise-db point at Liftosaur's image server.
export function ExerciseImageUtils_migrateCustomUrl(
  url: string | undefined,
  size: "small" | "large"
): string | undefined {
  if (!url) {
    return undefined;
  }
  const legacy = url.match(LEGACY_LIBRARY_URL);
  if (legacy) {
    return ExerciseImageUtils_libraryUrl(legacy[1], size);
  }
  return LIFTOSAUR_HOST.test(url) ? undefined : url;
}

function customUrl(type: IExerciseType, size: "small" | "large", settings?: ISettings): string | undefined {
  const customExercise = settings?.exercises?.[type.id];
  const small = ExerciseImageUtils_migrateCustomUrl(customExercise?.smallImageUrl, size);
  return size === "small" ? small : (ExerciseImageUtils_migrateCustomUrl(customExercise?.largeImageUrl, size) ?? small);
}

export function ExerciseImageUtils_existsCustom(
  type: IExerciseType,
  size: "small" | "large",
  checkDomain: boolean,
  settings?: ISettings
): boolean {
  const imageUrl = customUrl(type, size, settings);
  return checkDomain ? !!imageUrl?.startsWith("/") : !!imageUrl;
}

export function ExerciseImageUtils_ogImageUrl(type: IExerciseType): string {
  return ExerciseImageUtils_libraryUrl(ExerciseImageUtils_id(type), "large") ?? "/images/logo-square.png";
}

export function ExerciseImageUtils_url(
  type: IExerciseType,
  size: "small" | "large",
  settings?: ISettings
): string | undefined {
  return ExerciseImageUtils_libraryUrl(ExerciseImageUtils_id(type), size) ?? customUrl(type, size, settings);
}

export function ExerciseImageUtils_initials(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter((w) => w.length > 0);
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
