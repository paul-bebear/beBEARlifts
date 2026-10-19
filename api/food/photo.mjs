import { getVercelOidcToken } from "@vercel/oidc";
import { fetchJson, json } from "../_food.mjs";

const defaultModel = "anthropic/claude-sonnet-5.5";
// The phone shrinks plates to 1024px and labels to 1600px JPEG, under 1 MB as base64. Vercel caps bodies at 4.5 MB.
const maxImageChars = 3_000_000;

const prompt = `You estimate the nutrition of a meal from one photo, for a calorie tracker.
List each separate food you can see. For each one, estimate the portion in grams from the plate size, utensils and packaging, then estimate calories, protein, carbs and fat for that portion.
Count visible oil, butter, sauces and dressings as their own items when they add real calories.
If the photo shows a nutrition label or packaged product, use the label values.
If there is no food in the photo, return an empty list and say why in "note".
Answer with JSON only, no other text, in this shape:
{"items":[{"name":"Grilled chicken breast","grams":150,"calories":248,"protein":46.5,"carbs":0,"fat":5.4}],"note":"optional short caveat"}`;

const labelPrompt = `You read the nutrition facts label on a food package from one photo, for a calorie tracker.
Give the product name in English if you can read or recognize it, and the brand if it is visible.
Give the values for one serving as printed, and the serving size in grams. For example "1 pack (140g)" is 140.
If the label gives values only for the whole package, treat the whole package as one serving and use its net weight.
If the label gives values only per 100 g, put them in "per100g" and leave "perServing" out.
If the label shows "as packaged" and "prepared" columns, use "as packaged".
Use kcal. If the label gives only kJ, divide by 4.184.
If there is no readable nutrition label in the photo, return only {"note":"why"}.
Answer with JSON only, no other text, in this shape:
{"name":"Hot Chicken Flavor Ramen","brand":"Samyang","servingGrams":140,"perServing":{"calories":530,"protein":12,"carbs":84,"fat":16},"note":"optional short caveat"}`;

const tasks = {
  meal: { system: prompt, user: "Estimate this meal.", maxTokens: 1000 },
  label: { system: labelPrompt, user: "Read this nutrition label.", maxTokens: 600 },
};

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
  let task;
  try {
    const body = await request.json();
    image = body?.image;
    task = tasks[body?.kind === "label" ? "label" : "meal"];
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
          max_tokens: task.maxTokens,
          temperature: 0.2,
          messages: [
            { role: "system", content: task.system },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: image } },
                { type: "text", text: task.user },
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
