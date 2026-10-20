import { fetchJson, json } from "./_food.mjs";

// Same project and publishable key as src/utils/supabaseClient.ts. The key is public by design.
const supabaseOrigin = "https://qvqwvuuwfueccrmzwyct.supabase.co";
const publishableKey = "sb_publishable_rEbD1nY_vtRMiQrpHSgnCg_xquG6idR";
const defaultDailyCap = 60;

export const AiAuth_signInMessage = "Sign in to use AI features. Open Settings → Cloud backup.";
const checkFailedMessage = "The app could not check today's AI allowance. Try again.";

export function AiAuth_bearerToken(header) {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return match?.[1];
}

export function AiAuth_dailyCap(value) {
  const cap = Number(value);
  return Number.isInteger(cap) && cap > 0 ? cap : defaultDailyCap;
}

// ai_usage_take answers 401 for a missing or expired token and 403 for an anonymous user.
export function AiAuth_decide(status, usedToday, cap) {
  if (status === 401 || status === 403) {
    return { ok: false, status: 401, error: AiAuth_signInMessage };
  }
  if (status !== 200 || typeof usedToday !== "number") {
    return { ok: false, status: 503, error: checkFailedMessage };
  }
  if (usedToday > cap) {
    return {
      ok: false,
      status: 429,
      error: `You used all ${cap} AI calls for today. The count starts again at midnight UTC.`,
    };
  }
  return { ok: true };
}

// Supabase checks the token's signature and expiry before it runs ai_usage_take, so one call both signs the user in and counts the call.
export async function AiAuth_check(request) {
  const token = AiAuth_bearerToken(request.headers.get("authorization"));
  if (token == null) {
    return json({ error: AiAuth_signInMessage }, 401);
  }
  let answer;
  try {
    answer = await fetchJson(
      `${supabaseOrigin}/rest/v1/rpc/ai_usage_take`,
      {
        method: "POST",
        headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
      },
      5000
    );
  } catch {
    return json({ error: checkFailedMessage }, 503);
  }
  const decision = AiAuth_decide(answer.status, answer.body, AiAuth_dailyCap(process.env.AI_DAILY_CAP));
  return decision.ok ? undefined : json({ error: decision.error }, decision.status);
}
