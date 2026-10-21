import { getVercelOidcToken } from "@vercel/oidc";
import { fetchJson } from "./_food.mjs";

export const aiUnavailableMessage = "AI is unavailable. Try again or use the app without AI.";

function providerError(answer, raw) {
  return answer?.error?.message ?? answer?.[0]?.error?.message ?? raw.slice(0, 200);
}

export async function aiChat(ai, { messages, maxTokens, temperature }, timeoutMs) {
  if (!ai.token) {
    return { ok: false, status: 503, error: aiUnavailableMessage };
  }
  try {
    const result = await fetchJson(
      ai.url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ai.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: ai.model, messages, max_tokens: maxTokens, temperature }),
      },
      timeoutMs
    );
    if (result.status !== 200) {
      console.error("AI provider failed", ai.name, result.status, providerError(result.body, result.text));
      return { ok: false, status: 502, error: aiUnavailableMessage };
    }
    const choice = result.body?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      console.error("AI provider sent an empty answer", ai.name);
      return { ok: false, status: 502, error: aiUnavailableMessage };
    }
    return { ok: true, text: content, finishReason: choice?.finish_reason };
  } catch (error) {
    console.error("AI provider request failed", ai.name, error);
    return { ok: false, status: 504, error: aiUnavailableMessage };
  }
}

// Claude Haiku 5.5 costs $0.10 / $0.50 per million input / output tokens.
const defaultGatewayModel = "anthropic/claude-haiku-5.5";
// The "-latest" alias follows Google's newest Flash-Lite, which has a free tier.
const defaultGeminiModel = "gemini-flash-lite-latest";

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
export async function aiProvider() {
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
