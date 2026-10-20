import { FoodPhotoEstimate_parse, IFoodPhotoEstimate } from "../models/foodPhotoEstimate";
import { INutritionLabel, NutritionLabel_note, NutritionLabel_parse } from "../models/nutritionLabel";
import { SavedFoods_find, SavedFoods_search } from "../models/savedFoods";
import { UsdaFoodData_parseBarcodeResponse } from "../models/usdaFoodData";
import { AiRequest_post, AiRequest_text } from "./aiRequest";
import {
  IFoodProduct,
  OpenFoodFacts_isBarcode,
  OpenFoodFacts_parseBarcodeResponse,
  OpenFoodFacts_parseSearchResponse,
} from "../models/openFoodFacts";

export type IFoodApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

const offlineError = "No connection. Food lookup needs a signal.";

async function request(path: string, init?: RequestInit): Promise<IFoodApiResult<unknown>> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    return { ok: false, error: offlineError };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: `The server returned ${response.status}.` };
  }
  if (!response.ok) {
    const error = (body as { error?: unknown })?.error;
    return { ok: false, error: typeof error === "string" ? error : `The server returned ${response.status}.` };
  }
  return { ok: true, value: body };
}

export async function FoodApi_lookupBarcode(
  code: string,
  saved: IFoodProduct[]
): Promise<IFoodApiResult<IFoodProduct | undefined>> {
  const mine = SavedFoods_find(saved, code);
  if (mine != null) {
    return { ok: true, value: mine };
  }
  const path = `?code=${encodeURIComponent(code)}`;
  const openFoodFacts = await request(`/api/food/barcode${path}`);
  const fromOpenFoodFacts = openFoodFacts.ok ? OpenFoodFacts_parseBarcodeResponse(openFoodFacts.value) : undefined;
  if (fromOpenFoodFacts != null) {
    return { ok: true, value: fromOpenFoodFacts };
  }
  const usda = await request(`/api/food/usda${path}`);
  const fromUsda = usda.ok ? UsdaFoodData_parseBarcodeResponse(usda.value, code) : undefined;
  if (fromUsda != null || openFoodFacts.ok) {
    return { ok: true, value: fromUsda };
  }
  return openFoodFacts;
}

export async function FoodApi_find(query: string, saved: IFoodProduct[]): Promise<IFoodApiResult<IFoodProduct[]>> {
  if (OpenFoodFacts_isBarcode(query)) {
    const result = await FoodApi_lookupBarcode(query, saved);
    return result.ok ? { ok: true, value: result.value != null ? [result.value] : [] } : result;
  }
  const mine = SavedFoods_search(saved, query);
  const result = await request(`/api/food/search?q=${encodeURIComponent(query)}`);
  if (!result.ok) {
    return mine.length > 0 ? { ok: true, value: mine } : result;
  }
  return { ok: true, value: [...mine, ...OpenFoodFacts_parseSearchResponse(result.value)] };
}

async function askAi(body: {
  kind: "meal" | "label" | "describe";
  image?: string;
  text?: string;
}): Promise<IFoodApiResult<string>> {
  const result = await AiRequest_post("/api/food/photo", body);
  return result.ok ? { ok: true, value: AiRequest_text(result.body) ?? "" } : result;
}

function toEstimate(result: IFoodApiResult<string>, retryHint: string): IFoodApiResult<IFoodPhotoEstimate> {
  if (!result.ok) {
    return result;
  }
  const estimate = FoodPhotoEstimate_parse(result.value);
  return estimate != null
    ? { ok: true, value: estimate }
    : { ok: false, error: `The AI answer could not be read. ${retryHint}` };
}

export async function FoodApi_estimatePhoto(
  imageDataUrl: string,
  note?: string
): Promise<IFoodApiResult<IFoodPhotoEstimate>> {
  return toEstimate(await askAi({ kind: "meal", image: imageDataUrl, text: note }), "Try another photo.");
}

export async function FoodApi_describe(text: string): Promise<IFoodApiResult<IFoodPhotoEstimate>> {
  return toEstimate(await askAi({ kind: "describe", text }), "Try different words.");
}

export async function FoodApi_readLabel(imageDataUrl: string): Promise<IFoodApiResult<INutritionLabel>> {
  const result = await askAi({ kind: "label", image: imageDataUrl });
  if (!result.ok) {
    return result;
  }
  const label = NutritionLabel_parse(result.value);
  if (label != null) {
    return { ok: true, value: label };
  }
  const note = NutritionLabel_note(result.value);
  return { ok: false, error: note ?? "The label could not be read. Try a closer photo, or type the numbers in." };
}
