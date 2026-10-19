import { fetchJson, json } from "../_food.mjs";

// DEMO_KEY allows about 30 requests an hour, shared by everyone calling from the same IP. Set FDC_API_KEY.
const apiKey = () => process.env.FDC_API_KEY || "DEMO_KEY";

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
  try {
    for (const query of queries(code)) {
      const url =
        "https://api.nal.usda.gov/fdc/v1/foods/search" +
        `?query=${query}&dataType=Branded&pageSize=5&api_key=${encodeURIComponent(apiKey())}`;
      const { status, body } = await fetchJson(url, {}, 8000);
      if (status === 429) {
        return json({ error: "USDA FoodData Central is rate limited. Set FDC_API_KEY on Vercel." }, 502);
      }
      if (status !== 200 || body == null) {
        return json({ error: `USDA FoodData Central returned ${status}` }, 502);
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
    return json({ error: "USDA FoodData Central did not answer" }, 504);
  }
}
