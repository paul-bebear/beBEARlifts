import { getVercelOidcToken } from "@vercel/oidc";
import { fetchJson, json } from "../_food.mjs";

// Claude Haiku 5.5 costs about $0.0003 per photo and $0.0002 per description at $0.10 / $0.50 per million tokens.
const defaultGatewayModel = "anthropic/claude-haiku-5.5";
// The "-latest" alias follows Google's newest Flash-Lite, which has a free tier.
const defaultGeminiModel = "gemini-flash-lite-latest";
// The phone shrinks plates to 1024px and labels to 1600px JPEG, under 1 MB as base64. Vercel caps bodies at 4.5 MB.
const maxImageChars = 3_000_000;
const maxTextChars = 600;

const itemsShape = `Answer with JSON only, no other text, in this shape:
{"items":[{"name":"Grilled chicken breast","grams":150,"calories":248,"protein":46.5,"carbs":0,"fat":5.4}],"note":"optional short caveat"}`;

const mealPrompt = `You estimate the nutrition of a meal from one photo, for a calorie tracker.
List each separate food you can see. For each one, estimate the portion in grams from the plate size, utensils and packaging, then estimate calories, protein, carbs and fat for that portion.
Count visible oil, butter, sauces and dressings as their own items when they add real calories.
If the photo shows a nutrition label or packaged product, use the label values.
The user may add a note about the meal. Trust the note over the photo for amounts and hidden ingredients.
If there is no food in the photo, return an empty list and say why in "note".
${itemsShape}`;

const describePrompt = `You estimate the nutrition of a meal from the user's description, for a calorie tracker.
List each separate food. Use the amounts the user gives. When an amount is missing, assume one typical adult portion and say so in "note".
For branded or packaged foods, use the brand's published values when you know them, for example "a pack of Buldak ramen" is one 140 g pack.
Count cooking oil, butter and sauces as their own items when the description implies them.
If the description is too vague to estimate, return an empty list and ask one short question in "note", or suggest a photo.
${itemsShape}`;

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
  meal: { system: mealPrompt, user: "Estimate this meal.", needsImage: true, maxTokens: 1000 },
  label: { system: labelPrompt, user: "Read this nutrition label.", needsImage: true, maxTokens: 600 },
  describe: { system: describePrompt, user: "Estimate this meal.", needsImage: false, maxTokens: 1000 },
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

// Both speak the OpenAI Chat Completions format, so one request body serves either.
async function provider() {
  if (process.env.GEMINI_API_KEY) {
    return {
      name: "Gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      token: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || defaultGeminiModel,
    };
  }
  return {
    name: "AI Gateway",
    url: "https://ai-gateway.vercel.sh/v1/chat/completions",
    token: await gatewayToken(),
    model: process.env.AI_GATEWAY_MODEL || defaultGatewayModel,
  };
}

function userContent(task, image, text) {
  const words = text ? `${task.user}\nThe user says: ${text}` : task.user;
  return image
    ? [
        { type: "image_url", image_url: { url: image } },
        { type: "text", text: words },
      ]
    : words;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send JSON with an image or text field" }, 400);
  }
  const task = tasks[body?.kind] ?? tasks.meal;
  const image = typeof body?.image === "string" ? body.image : undefined;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, maxTextChars) : "";
  if (task.needsImage && (image == null || !/^data:image\/(jpeg|png|webp);base64,/.test(image))) {
    return json({ error: "The image must be a base64 data URL" }, 400);
  }
  if (!task.needsImage && text === "") {
    return json({ error: "Describe what you ate" }, 400);
  }
  if (image != null && image.length > maxImageChars) {
    return json({ error: "The photo is too large" }, 413);
  }
  const ai = await provider();
  if (!ai.token) {
    return json({ error: "The server has no AI key. Set GEMINI_API_KEY or turn on AI Gateway." }, 500);
  }
  try {
    const {
      status,
      body: answer,
      text: raw,
    } = await fetchJson(
      ai.url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ai.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ai.model,
          max_tokens: task.maxTokens,
          temperature: 0.2,
          messages: [
            { role: "system", content: task.system },
            { role: "user", content: userContent(task, task.needsImage ? image : undefined, text) },
          ],
        }),
      },
      45000
    );
    if (status !== 200) {
      const message = answer?.error?.message ?? answer?.[0]?.error?.message ?? raw.slice(0, 200);
      return json({ error: `${ai.name} returned ${status}: ${message}` }, 502);
    }
    const content = answer?.choices?.[0]?.message?.content;
    return json({ text: typeof content === "string" ? content : "" });
  } catch {
    return json({ error: "The AI did not answer in 45 seconds" }, 504);
  }
}
