import { fetchJson, json, openFoodFactsFields as fields, openFoodFactsUserAgent } from "../_food.mjs";

export async function GET(request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) {
    return json({ hits: [] });
  }
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=25&fields=${fields}`;
  try {
    const { status, body } = await fetchJson(url, { headers: { "User-Agent": openFoodFactsUserAgent } }, 8000);
    if (status !== 200 || body == null) {
      return json({ error: `Open Food Facts returned ${status}` }, 502);
    }
    return json({ hits: Array.isArray(body.hits) ? body.hits : [] }, 200, 3600);
  } catch {
    return json({ error: "Open Food Facts did not answer" }, 504);
  }
}
