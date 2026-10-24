import { fetchJson, json } from "../_food.mjs";
import { AiAuth_bearerToken, Supabase_origin, Supabase_publishableKey } from "../_auth.mjs";
import {
  Billing_env,
  Billing_readPlan,
  Billing_refresh,
  Billing_signInMessage,
  Billing_userFromAuth,
} from "../_billing.mjs";

export async function POST(request) {
  const config = Billing_env(process.env);
  if (config == null) {
    return json({ error: "The server has no Supabase service key. Set SUPABASE_SERVICE_ROLE_KEY in Vercel." }, 500);
  }
  const token = AiAuth_bearerToken(request.headers.get("authorization"));
  if (token == null) {
    return json({ error: Billing_signInMessage }, 401);
  }
  try {
    const user = await fetchJson(
      `${Supabase_origin}/auth/v1/user`,
      { method: "GET", headers: { apikey: Supabase_publishableKey, Authorization: `Bearer ${token}` } },
      8000
    );
    const userId = Billing_userFromAuth(user.status, user.body);
    if (userId == null) {
      return user.status === 200 || user.status === 401 || user.status === 403
        ? json({ error: Billing_signInMessage }, 401)
        : json({ error: `Supabase Auth returned ${user.status}` }, 502);
    }
    const result =
      config.revenueCatKey == null
        ? await Billing_readPlan(userId, config.serviceKey)
        : await Billing_refresh(userId, config);
    return result.ok
      ? json({ plan: result.plan, grant: result.grant, canManageSubscription: result.canManageSubscription })
      : json({ error: result.error }, result.status);
  } catch {
    return json({ error: "The billing check did not answer. Try again." }, 504);
  }
}
