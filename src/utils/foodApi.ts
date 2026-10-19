import { FoodPhotoEstimate_parse, IFoodPhotoEstimate } from "../models/foodPhotoEstimate";
import {
  IFoodProduct,
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

export async function FoodApi_lookupBarcode(code: string): Promise<IFoodApiResult<IFoodProduct | undefined>> {
  const result = await request(`/api/food/barcode?code=${encodeURIComponent(code)}`);
  return result.ok ? { ok: true, value: OpenFoodFacts_parseBarcodeResponse(result.value) } : result;
}

export async function FoodApi_search(query: string): Promise<IFoodApiResult<IFoodProduct[]>> {
  const result = await request(`/api/food/search?q=${encodeURIComponent(query)}`);
  return result.ok ? { ok: true, value: OpenFoodFacts_parseSearchResponse(result.value) } : result;
}

export async function FoodApi_estimatePhoto(imageDataUrl: string): Promise<IFoodApiResult<IFoodPhotoEstimate>> {
  const result = await request("/api/food/photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageDataUrl }),
  });
  if (!result.ok) {
    return result;
  }
  const text = (result.value as { text?: unknown }).text;
  const estimate = typeof text === "string" ? FoodPhotoEstimate_parse(text) : undefined;
  return estimate != null
    ? { ok: true, value: estimate }
    : { ok: false, error: "The AI answer could not be read. Try another photo." };
}
