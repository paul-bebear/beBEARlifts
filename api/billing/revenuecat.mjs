import { json } from "../_food.mjs";
import { Billing_env, Billing_eventUserIds, Billing_refresh, Billing_webhookAuthorized } from "../_billing.mjs";

export async function POST(request) {
  if (!Billing_webhookAuthorized(request.headers.get("authorization"), process.env.REVENUECAT_WEBHOOK_AUTH)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const config = Billing_env(process.env);
  if (config?.revenueCatKey == null) {
    return json({ error: "The server has no billing keys." }, 500);
  }
  const body = await request.json().catch(() => undefined);
  const ids = Billing_eventUserIds(body?.event);
  try {
    for (const id of ids) {
      const result = await Billing_refresh(id, config);
      if (!result.ok) {
        return json({ error: result.error }, 503);
      }
    }
  } catch {
    return json({ error: "A billing refresh did not answer." }, 503);
  }
  return json({ refreshed: ids.length });
}
