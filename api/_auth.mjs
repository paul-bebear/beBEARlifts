import { fetchJson, json } from "./_food.mjs";
import { aiUnavailableMessage } from "./_ai.mjs";

// Same project and publishable key as src/utils/supabaseClient.ts. The key is public by design.
export const Supabase_origin = "https://qvqwvuuwfueccrmzwyct.supabase.co";
export const Supabase_publishableKey = "sb_publishable_rEbD1nY_vtRMiQrpHSgnCg_xquG6idR";
export const AiAuth_onboardRuns = 3;

export const AiAuth_signInMessage = "Sign in to use AI features. Open Settings → Cloud backup.";
const checkFailedMessage = "The app could not check today's AI allowance. Try again.";

export function AiAuth_bearerToken(header) {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return match?.[1];
}

export function AiAuth_capValue(value, fallback) {
  const cap = Number(value);
  return Number.isInteger(cap) && cap > 0 ? cap : fallback;
}

export function AiAuth_caps(env) {
  return {
    day: AiAuth_capValue(env.AI_DAILY_CAP, 3),
    week: AiAuth_capValue(env.AI_WEEKLY_CAP, 10),
    plusDay: AiAuth_capValue(env.AI_PLUS_DAILY_CAP, 30),
    plusWeek: AiAuth_capValue(env.AI_PLUS_WEEKLY_CAP, 150),
    lifetime: AiAuth_onboardRuns,
  };
}

function count(value) {
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function weekWait(freesIn) {
  return Number.isInteger(freesIn) && freesIn > 1 ? `in ${freesIn} days` : "tomorrow";
}

// The SQL function counts the call only when the same comparison passes, so an allowed call here was counted there.
export function AiAuth_decideUsage(answer, kind, caps) {
  const plan = answer?.plan === "plus" ? "plus" : "free";
  if (kind === "report") {
    return answer?.refUsed === true
      ? { ok: false, status: 429, body: { error: "This workout already has its AI report.", reason: "report" } }
      : { ok: true };
  }
  if (kind === "onboard") {
    const lifetime = count(answer?.lifetime);
    if (lifetime == null) {
      return { ok: false, status: 503, body: { error: checkFailedMessage } };
    }
    return lifetime < caps.lifetime
      ? { ok: true }
      : {
          ok: false,
          status: 429,
          body: {
            error: `You used all ${caps.lifetime} AI setups. Pick a beBEAR plan instead.`,
            reason: "onboard",
            plan,
            used: { lifetime },
            caps: { lifetime: caps.lifetime },
          },
        };
  }
  const day = count(answer?.day);
  const week = count(answer?.week);
  if (day == null || week == null) {
    return { ok: false, status: 503, body: { error: checkFailedMessage } };
  }
  const limits = plan === "plus" ? { day: caps.plusDay, week: caps.plusWeek } : { day: caps.day, week: caps.week };
  if (day < limits.day && week < limits.week) {
    return { ok: true };
  }
  const reason = week >= limits.week ? "week" : "day";
  const weekFreesIn = count(answer?.weekFreesIn);
  return {
    ok: false,
    status: 429,
    body: {
      error:
        reason === "week"
          ? `Your ${limits.week} AI uses for this week are used. More ${weekWait(weekFreesIn)}.`
          : `Your ${limits.day} AI uses for today are used. More tomorrow.`,
      reason,
      plan,
      used: { day, week },
      caps: limits,
      ...(weekFreesIn == null ? {} : { weekFreesIn }),
    },
  };
}

// ai_usage_take sets ceilingWarn on the one call a day that takes the app-wide total to 80 percent of the ceiling.
export function AiAuth_ceilingNotice(answer) {
  if (answer?.ceilingWarn !== true) {
    return undefined;
  }
  return `AI allowance at 80 percent: ${count(answer.dayTotal)} of ${count(answer.ceiling)} calls used today (UTC)`;
}

// ai_usage_take answers 401 for a missing or expired token and 403 for an anonymous user.
export function AiAuth_decide(status, answer, kind, caps) {
  if (status === 401 || status === 403) {
    return { ok: false, status: 401, body: { error: AiAuth_signInMessage } };
  }
  if (status === 429 && answer?.message === "Daily AI share reached") {
    return {
      ok: false,
      status: 429,
      body: { error: "You have used your share of today's AI. Try again tomorrow UTC.", reason: "share" },
    };
  }
  if (status === 429 && answer?.message === "Daily AI report limit reached") {
    return {
      ok: false,
      status: 429,
      body: { error: "You have made 10 AI reports today. More tomorrow.", reason: "reportDay" },
    };
  }
  if (status === 429) {
    return {
      ok: false,
      status: 429,
      body: { error: "The app's daily AI allowance is used up. Try again tomorrow UTC.", reason: "global" },
    };
  }
  if (status !== 200 || answer == null || typeof answer !== "object") {
    return { ok: false, status: 503, body: { error: checkFailedMessage } };
  }
  return AiAuth_decideUsage(answer, kind, caps);
}

// Supabase checks the token's signature and expiry before it runs ai_usage_take, so one call both signs the user in and counts the call.
export async function AiAuth_check(request, ai, kind = "capped", ref) {
  const token = AiAuth_bearerToken(request.headers.get("authorization"));
  if (token == null) {
    return json({ error: AiAuth_signInMessage }, 401);
  }
  if (ai != null && !ai.token) {
    return json({ error: aiUnavailableMessage }, 503);
  }
  const caps = AiAuth_caps(process.env);
  let answer;
  try {
    answer = await fetchJson(
      `${Supabase_origin}/rest/v1/rpc/ai_usage_take`,
      {
        method: "POST",
        headers: {
          apikey: Supabase_publishableKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_kind: kind, p_ref: ref ?? null, p_caps: caps }),
      },
      5000
    );
  } catch {
    return json({ error: checkFailedMessage }, 503);
  }
  const notice = answer.status === 200 ? AiAuth_ceilingNotice(answer.body) : undefined;
  if (notice != null) {
    console.warn(notice);
  }
  const decision = AiAuth_decide(answer.status, answer.body, kind, caps);
  return decision.ok ? undefined : json(decision.body, decision.status);
}
