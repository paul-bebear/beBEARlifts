import { getVercelOidcToken } from "@vercel/oidc";

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
