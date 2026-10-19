import { fetchJson, json, openFoodFactsUserAgent } from "../_food.mjs";

const fields = "code,product_name,generic_name,brands,serving_quantity,nutriments,image_front_small_url";

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!/^\d{8,14}$/.test(code)) {
    return json({ error: "Barcode must be 8 to 14 digits" }, 400);
  }
  try {
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
  } catch {
    return json({ error: "Open Food Facts did not answer" }, 504);
  }
}
