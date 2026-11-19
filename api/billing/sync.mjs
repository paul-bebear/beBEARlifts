import { json } from "../_food.mjs";
import { Auth_user } from "../_auth.mjs";
import { Billing_env, Billing_signInMessage, Billing_sync } from "../_billing.mjs";

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
    const result = await Billing_sync(userId, config);
    if (result.ok) {
      return json({ plan: result.plan, grant: result.grant, canManageSubscription: result.canManageSubscription });
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
