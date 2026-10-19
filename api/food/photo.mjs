import { getVercelOidcToken } from "@vercel/oidc";
import { fetchJson, json } from "../_food.mjs";

const defaultModel = "anthropic/claude-sonnet-5.5";
// The phone shrinks photos to 1024px JPEG, about 200 KB as base64. Vercel caps request bodies at 4.5 MB.
const maxImageChars = 3_000_000;

const prompt = `You estimate the nutrition of a meal from one photo, for a calorie tracker.
List each separate food you can see. For each one, estimate the portion in grams from the plate size, utensils and packaging, then estimate calories, protein, carbs and fat for that portion.
Count visible oil, butter, sauces and dressings as their own items when they add real calories.
If the photo shows a nutrition label or packaged product, use the label values.
If there is no food in the photo, return an empty list and say why in "note".
Answer with JSON only, no other text, in this shape:
{"items":[{"name":"Grilled chicken breast","grams":150,"calories":248,"protein":46.5,"carbs":0,"fat":5.4}],"note":"optional short caveat"}`;

async function gatewayToken() {
  if (process.env.AI_GATEWAY_API_KEY) {
    return process.env.AI_GATEWAY_API_KEY;
  }
  try {
    return await getVercelOidcToken();
  } catch {
    return process.env.VERCEL_OIDC_TOKEN;
  }
}

export async function POST(request) {
  let image;
  try {
    image = (await request.json())?.image;
  } catch {
    return json({ error: "Send JSON with an image field" }, 400);
  }
  if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
    return json({ error: "The image must be a base64 data URL" }, 400);
  }
  if (image.length > maxImageChars) {
    return json({ error: "The photo is too large" }, 413);
  }
  const token = await gatewayToken();
  if (!token) {
    return json({ error: "The server has no AI Gateway credentials" }, 500);
  }
  try {
    const { status, body, text } = await fetchJson(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.AI_GATEWAY_MODEL || defaultModel,
          max_tokens: 1000,
          temperature: 0.2,
          messages: [
            { role: "system", content: prompt },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: image } },
                { type: "text", text: "Estimate this meal." },
              ],
            },
          ],
        }),
      },
      45000
    );
    if (status !== 200) {
      const message = body?.error?.message ?? text.slice(0, 200);
      return json({ error: `AI Gateway returned ${status}: ${message}` }, 502);
    }
    const content = body?.choices?.[0]?.message?.content;
    return json({ text: typeof content === "string" ? content : "" });
  } catch {
    return json({ error: "The AI did not answer in 45 seconds" }, 504);
  }
}
