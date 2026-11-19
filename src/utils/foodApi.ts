import type { IFoodAiRequest } from "../models/foodAiEstimate";
import { FoodPhotoEstimate_failure, FoodPhotoEstimate_parse, IFoodPhotoEstimate } from "../models/foodPhotoEstimate";
import { INutritionLabel, NutritionLabel_note, NutritionLabel_parse } from "../models/nutritionLabel";
import { SavedFoods_find, SavedFoods_search } from "../models/savedFoods";
import { UsdaFoodData_parseBarcodeResponse } from "../models/usdaFoodData";
import { AiRequest_post, AiRequest_signInMessage, AiRequest_text } from "./aiRequest";
import {
  BodyScanRead_parse,
  BodyScanRead_signIn,
  BodyScanRead_unreadable,
  IBodyScanRead,
} from "../models/bodyScanRead";
import { ApiRequest_errorText, ApiRequest_send } from "./apiRequest";
import {
  IFoodProduct,
  OpenFoodFacts_isBarcode,
  OpenFoodFacts_parseBarcodeResponse,
  OpenFoodFacts_parseSearchResponse,
} from "../models/openFoodFacts";

type IFoodApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

const offlineError = "No connection. Food lookup needs a signal.";
export const FoodApi_timeoutError = "The food lookup took too long. Try again.";
export const FoodApi_requestTimeoutMs = 15_000;

async function request(path: string): Promise<IFoodApiResult<unknown>> {
  const sent = await ApiRequest_send(path, {}, FoodApi_requestTimeoutMs);
  if (sent.kind !== "reply") {
    return { ok: false, error: sent.kind === "timeout" ? FoodApi_timeoutError : offlineError };
  }
  if (sent.body === undefined) {
    return {
      ok: false,
      error: sent.bodyTimedOut ? FoodApi_timeoutError : ApiRequest_errorText(sent.status, undefined),
    };
  }
  return sent.ok ? { ok: true, value: sent.body } : { ok: false, error: ApiRequest_errorText(sent.status, sent.body) };
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
  if (!openFoodFacts.ok && openFoodFacts.error === FoodApi_timeoutError) {
    return openFoodFacts;
  }
  const usda = await request(`/api/food/usda${path}`);
  const fromUsda = usda.ok ? UsdaFoodData_parseBarcodeResponse(usda.value, code) : undefined;
  if (fromUsda != null) {
    return { ok: true, value: fromUsda };
  }
  if (!usda.ok) {
    return usda;
  }
  return openFoodFacts.ok ? { ok: true, value: undefined } : openFoodFacts;
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

interface IAiAnswer {
  text: string;
  finishReason?: string;
}

async function askAiAnswer(body: {
  kind: "meal" | "label" | "describe" | "bodyscan";
  image?: string;
  text?: string;
}): Promise<IFoodApiResult<IAiAnswer>> {
  const result = await AiRequest_post("/api/food/photo", body);
  if (!result.ok) {
    return result;
  }
  const finishReason = (result.body as { finishReason?: unknown } | undefined)?.finishReason;
  return {
    ok: true,
    value: {
      text: AiRequest_text(result.body) ?? "",
      finishReason: typeof finishReason === "string" ? finishReason : undefined,
    },
  };
}

async function askAi(body: { kind: "label"; image: string }): Promise<IFoodApiResult<string>> {
  const result = await askAiAnswer(body);
  return result.ok ? { ok: true, value: result.value.text } : result;
}

function toEstimate(result: IFoodApiResult<IAiAnswer>, retryHint: string): IFoodApiResult<IFoodPhotoEstimate> {
  if (!result.ok) {
    return result;
  }
  const estimate = FoodPhotoEstimate_parse(result.value.text);
  return estimate != null
    ? { ok: true, value: estimate }
    : { ok: false, error: FoodPhotoEstimate_failure(result.value.text, result.value.finishReason, retryHint) };
}

export async function FoodApi_estimatePhoto(
  imageDataUrl: string,
  note?: string
): Promise<IFoodApiResult<IFoodPhotoEstimate>> {
  return toEstimate(await askAiAnswer({ kind: "meal", image: imageDataUrl, text: note }), "Try another photo.");
}

export async function FoodApi_describe(text: string): Promise<IFoodApiResult<IFoodPhotoEstimate>> {
  return toEstimate(await askAiAnswer({ kind: "describe", text }), "Try different words.");
}

export function FoodApi_estimate(ask: IFoodAiRequest): Promise<IFoodApiResult<IFoodPhotoEstimate>> {
  return ask.kind === "photo" ? FoodApi_estimatePhoto(ask.photo, ask.text) : FoodApi_describe(ask.text);
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

export async function FoodApi_readBodyScan(imageDataUrl: string): Promise<IFoodApiResult<IBodyScanRead>> {
  const result = await askAiAnswer({ kind: "bodyscan", image: imageDataUrl });
  if (!result.ok) {
    return { ok: false, error: result.error === AiRequest_signInMessage ? BodyScanRead_signIn : result.error };
  }
  const scan = BodyScanRead_parse(result.value.text);
  return scan != null ? { ok: true, value: scan } : { ok: false, error: BodyScanRead_unreadable };
}
