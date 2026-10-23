import { IAllCustomExercises, IExerciseType } from "../types";
import { Exercise_find, Exercise_isCustom } from "./exercise";
import { ExerciseImageUtils_id } from "./exerciseImage";
import { ExerciseDemoMedia_byKey } from "./exerciseDemoMedia";
import { ExerciseDemoTips_byKey } from "./exerciseDemoTips";

export interface IExerciseDemoMedia {
  frames: number;
  columns: number;
  frameMs: number[];
  bytes: number;
}

export interface IExerciseDemoTips {
  cues: string[];
  mistakes: string[];
}

export type IExerciseDemoLookup =
  | { kind: "demo"; key: string; url: string; media: IExerciseDemoMedia; tips: IExerciseDemoTips }
  | { kind: "missing"; key: string; message: string };

// A program line can omit the equipment ("Squat"), so the key uses the catalog default, same as the photo.
export function ExerciseDemos_key(type: IExerciseType, customExercises: IAllCustomExercises): string {
  const equipment = type.equipment || Exercise_find(type, customExercises)?.defaultEquipment;
  return ExerciseImageUtils_id({ id: type.id, equipment });
}

export function ExerciseDemos_url(key: string): string {
  return `/images/exercises/demo/${key}.webp`;
}

export function ExerciseDemos_find(type: IExerciseType, customExercises: IAllCustomExercises): IExerciseDemoLookup {
  const key = ExerciseDemos_key(type, customExercises);
  if (Exercise_isCustom(type.id, customExercises)) {
    return { kind: "missing", key, message: "Custom exercises have no demo. Your own photo shows instead." };
  }
  const media = ExerciseDemoMedia_byKey[key];
  const tips = ExerciseDemoTips_byKey[key];
  if (media == null || tips == null) {
    return {
      kind: "missing",
      key,
      message: "No moving demo for this lift and equipment yet. Demos cover the lifts in the beBEAR 5-day plan.",
    };
  }
  return { kind: "demo", key, url: ExerciseDemos_url(key), media, tips };
}

export function ExerciseDemos_cell(media: IExerciseDemoMedia, frame: number): { column: number; row: number } {
  return { column: frame % media.columns, row: Math.floor(frame / media.columns) };
}

export function ExerciseDemos_rows(media: IExerciseDemoMedia): number {
  return Math.ceil(media.frames / media.columns);
}

// The animators hold the start and end positions longest, so the first longest frame is a clear still.
export function ExerciseDemos_posterFrame(media: IExerciseDemoMedia): number {
  return media.frameMs.indexOf(Math.max(...media.frameMs));
}

export function ExerciseDemos_allKeys(): string[] {
  return Object.keys(ExerciseDemoMedia_byKey);
}
