import type { ImagePickerResponse } from "react-native-image-picker";
import { FoodAddFlow_photoChoices, IFoodPhotoChoice } from "./foodAddFlow";
import type { IScanResume } from "./foodScanSteps";
import { IFoodPhotoEstimate } from "./foodPhotoEstimate";
import { INutritionLabel, INutritionLabelForm, NutritionLabel_toForm } from "./nutritionLabel";

export type IFoodCaptureKind = "meal" | "label";
export type IFoodCaptureSource = "camera" | "photo-library";
export type IFoodCaptureResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type IFoodCapturePhoto =
  | { kind: "photo"; dataUrl: string }
  | { kind: "cancelled" }
  | { kind: "error"; error: string };

export function FoodCapture_options(kind: IFoodCaptureKind): {
  mediaType: "photo";
  maxWidth: number;
  maxHeight: number;
  includeBase64: true;
  quality: 0.8;
  assetRepresentationMode: "compatible";
  saveToPhotos: false;
} {
  const maxSide = kind === "label" ? 1600 : 1024;
  return {
    mediaType: "photo",
    maxWidth: maxSide,
    maxHeight: maxSide,
    includeBase64: true,
    quality: 0.8,
    assetRepresentationMode: "compatible",
    saveToPhotos: false,
  };
}

export function FoodCapture_photo(response: ImagePickerResponse): IFoodCapturePhoto {
  if (response.didCancel) {
    return { kind: "cancelled" };
  }
  if (response.errorCode != null) {
    return {
      kind: "error",
      error:
        response.errorCode === "permission"
          ? "Allow camera or photo access in your phone's Settings, then try again."
          : (response.errorMessage ?? "The photo could not be opened. Try again."),
    };
  }
  const asset = response.assets?.[0];
  // react-native-image-picker 8.2.1 on iOS names JPEG data "image/jpg", including HEIC photos it re-encodes.
  const type = asset?.type === "image/jpg" ? "image/jpeg" : asset?.type;
  if (asset?.base64 == null || asset.base64 === "" || !/^image\/(jpeg|png|webp|gif)$/.test(type ?? "")) {
    return { kind: "error", error: "Choose a JPEG or PNG photo, or take a new photo." };
  }
  return { kind: "photo", dataUrl: `data:${type};base64,${asset.base64}` };
}

export interface IFoodPhotoState {
  busy: boolean;
  preview?: string;
  choices?: IFoodPhotoChoice[];
  note?: string;
  error?: string;
}

export type IFoodCaptureEvent = { type: "start" | "cancelled" } | { type: "failed"; error: string };
export type IFoodPhotoEvent =
  | IFoodCaptureEvent
  | { type: "estimated"; photo: string; result: IFoodCaptureResult<IFoodPhotoEstimate> }
  | { type: "choices"; choices: IFoodPhotoChoice[] };

export function FoodPhoto_empty(resume?: IScanResume): IFoodPhotoState {
  if (resume == null) {
    return { busy: false };
  }
  return resume.photo != null
    ? { busy: false, choices: resume.choices, preview: resume.photo }
    : { busy: false, choices: resume.choices };
}

export function FoodPhoto_shouldOpenCamera(hasSession: boolean, state: IFoodPhotoState): boolean {
  return hasSession && !state.busy && (state.choices?.length ?? 0) === 0;
}

export function FoodPhoto_reduce(state: IFoodPhotoState, event: IFoodPhotoEvent): IFoodPhotoState {
  switch (event.type) {
    case "start":
      return { ...state, busy: true, error: undefined };
    case "cancelled":
      return { ...state, busy: false };
    case "failed":
      return { ...state, busy: false, error: event.error };
    case "choices":
      return { ...state, choices: event.choices };
    case "estimated":
      return event.result.ok
        ? {
            busy: false,
            preview: event.photo,
            choices: FoodAddFlow_photoChoices(event.result.value.items),
            note: event.result.value.note,
          }
        : { busy: false, preview: event.photo, error: event.result.error };
  }
}

export interface IFoodLabelState {
  busy: boolean;
  form?: INutritionLabelForm;
  error?: string;
}

export type IFoodLabelEvent =
  | IFoodCaptureEvent
  | { type: "read"; result: IFoodCaptureResult<INutritionLabel> }
  | { type: "manual" }
  | { type: "edit"; form: INutritionLabelForm };

export function FoodLabel_empty(): IFoodLabelState {
  return { busy: false };
}

export function FoodLabel_reduce(state: IFoodLabelState, event: IFoodLabelEvent): IFoodLabelState {
  switch (event.type) {
    case "start":
      return { ...state, busy: true, error: undefined };
    case "cancelled":
      return { ...state, busy: false };
    case "failed":
      return { ...state, busy: false, error: event.error };
    case "manual":
      return { busy: false, form: NutritionLabel_toForm(undefined) };
    case "edit":
      return { busy: false, form: event.form };
    case "read":
      return event.result.ok
        ? { busy: false, form: NutritionLabel_toForm(event.result.value) }
        : { ...state, busy: false, error: event.result.error };
  }
}
