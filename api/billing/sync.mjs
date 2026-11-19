import { fetchJson, json } from "../_food.mjs";
import { AiAuth_caps, Auth_user, Supabase_origin } from "../_auth.mjs";
import { Billing_env, Billing_signInMessage, Billing_sync } from "../_billing.mjs";

const capsUrl = `${Supabase_origin}/rest/v1/ai_settings?select=free_day_cap,free_week_cap,plus_day_cap,plus_week_cap,onboard_runs`;

// Without an ai_settings row the answer leaves aiCaps out, and the app shows its own numbers.
async function aiCaps(serviceKey) {
  try {
    const read = await fetchJson(
      capsUrl,
      { method: "GET", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      3000
    );
    const row = read.status === 200 && Array.isArray(read.body) ? read.body[0] : undefined;
    return row == null
      ? undefined
      : AiAuth_caps({
          caps: {
            day: row.free_day_cap,
            week: row.free_week_cap,
            plusDay: row.plus_day_cap,
            plusWeek: row.plus_week_cap,
            lifetime: row.onboard_runs,
          },
        });
  } catch {
    return undefined;
  }
}

export async function POST(request) {
  const config = Billing_env(process.env);
  if (config == null) {
    return json({ error: "The server has no Supabase service key. Set SUPABASE_SERVICE_ROLE_KEY in Vercel." }, 500);
  }
  try {
    const auth = await Auth_user(request, {
      signInMessage: Billing_signInMessage,
      allowAnonymous: false,
      timeoutMs: 8000,
    });
    if (auth.response != null) {
      return auth.response;
    }
    const userId = auth.userId;
    const [result, caps] = await Promise.all([Billing_sync(userId, config), aiCaps(config.serviceKey)]);
    if (result.ok) {
      return json({
        plan: result.plan,
        grant: result.grant,
        canManageSubscription: result.canManageSubscription,
        ...(caps == null ? {} : { aiCaps: caps }),
      });
    }
    const response = json({ error: result.error }, result.status);
    if (result.retryAfterSeconds != null) {
      response.headers.set("Retry-After", String(result.retryAfterSeconds));
    }
    return response;
  } catch {
    return json({ error: "The billing check did not answer. Try again." }, 504);
  }
}
