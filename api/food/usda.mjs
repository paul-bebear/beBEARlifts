import { fetchJson, json } from "../_food.mjs";

export const UsdaFood_busyMessage = "USDA is busy. Try again in a minute.";

// DEMO_KEY allows about 30 requests an hour, shared by everyone calling from the same IP. Set FDC_API_KEY.
export function UsdaFood_apiKey(env, log) {
  if (env.FDC_API_KEY) {
    return env.FDC_API_KEY;
  }
  log(
    "FDC_API_KEY is not set, so the USDA lookup uses DEMO_KEY (about 30 requests an hour). Set FDC_API_KEY in Vercel."
  );
  return "DEMO_KEY";
}

function barcodeKey(code) {
  return code.replace(/^0+/, "");
}

// FoodData Central stores one GTIN/UPC form per product, padded to 12, 13 or 14 digits.
function queries(code) {
  const key = barcodeKey(code);
  return [...new Set([code, key.padStart(12, "0"), key.padStart(14, "0")])];
}

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!/^\d{8,14}$/.test(code)) {
    return json({ error: "Barcode must be 8 to 14 digits" }, 400);
  }
  const apiKey = UsdaFood_apiKey(process.env, console.warn);
  try {
    for (const query of queries(code)) {
      const url =
        "https://api.nal.usda.gov/fdc/v1/foods/search" +
        `?query=${query}&dataType=Branded&pageSize=5&api_key=${encodeURIComponent(apiKey)}`;
      const { status, body } = await fetchJson(url, {}, 8000);
      if (status !== 200 || body == null) {
        console.warn(
          status === 429
            ? "USDA FoodData Central answered 429. Set FDC_API_KEY in Vercel or raise its limit."
            : `USDA FoodData Central returned ${status}`
        );
        return json({ error: UsdaFood_busyMessage }, 502);
      }
      const foods = (Array.isArray(body.foods) ? body.foods : []).filter(
        (food) => typeof food?.gtinUpc === "string" && barcodeKey(food.gtinUpc) === barcodeKey(code)
      );
      if (foods.length > 0) {
        return json({ foods }, 200, 86400);
      }
    }
    return json({ foods: [] }, 200, 3600);
  } catch {
    console.warn("USDA FoodData Central did not answer");
    return json({ error: UsdaFood_busyMessage }, 504);
  }
}
