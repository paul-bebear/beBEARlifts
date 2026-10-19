// Shared by the /api/food/* functions. Vercel does not deploy files whose name starts with "_".

// Open Food Facts asks every caller for a User-Agent that names the app and a contact.
export const openFoodFactsUserAgent = "beBEARlifts/1.0 (https://github.com/paul-bebear/beBEARlifts)";

// src/models/openFoodFacts.ts reads these. Imports often have only a localized name, so those are asked for too.
export const openFoodFactsFields = [
  "code",
  "product_name",
  ...["en", "ko", "ja", "zh", "th", "vi", "fr", "de", "es", "it", "nl", "pt"].map((lang) => `product_name_${lang}`),
  "generic_name",
  "generic_name_en",
  "abbreviated_product_name",
  "brands",
  "serving_quantity",
  "serving_size",
  "nutriments",
  "image_front_small_url",
].join(",");

export function json(body, status = 200, maxAgeSeconds = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": maxAgeSeconds > 0 ? `public, s-maxage=${maxAgeSeconds}` : "no-store",
    },
  });
}

export async function fetchJson(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
    return { status: response.status, body, text };
  } finally {
    clearTimeout(timer);
  }
}
