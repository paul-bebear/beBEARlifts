import { barcodeRoute, fetchJson, json, openFoodFactsFields as fields, openFoodFactsUserAgent } from "../_food.mjs";

async function lookup(code) {
  const { status, body } = await fetchJson(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`,
    { headers: { "User-Agent": openFoodFactsUserAgent } },
    8000
  );
  if (status === 404 || body?.status === 0) {
    return json({ status: 0 }, 200, 3600);
  }
  if (status !== 200 || body == null) {
    return json({ error: `Open Food Facts returned ${status}` }, 502);
  }
  return json(body, 200, 86400);
}

export function GET(request) {
  return barcodeRoute(request, lookup, "Open Food Facts did not answer");
}
