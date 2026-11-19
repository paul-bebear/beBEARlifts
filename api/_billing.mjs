import { timingSafeEqual } from "node:crypto";
import { fetchJson } from "./_food.mjs";
import { Auth_isUserId, Supabase_origin } from "./_auth.mjs";

export const Billing_entitlementId = "plus";
export const Billing_signInMessage = "Sign in with Apple or Google to use beBEAR+.";

const revenueCatOrigin = "https://api.revenuecat.com";
const timeoutMs = 8000;
// App Review and TestFlight buy with sandbox money. Each read of RevenueCat renews the grant, but a free test purchase never becomes lifetime.
const sandboxGrantMs = 7 * 24 * 60 * 60 * 1000;

export function Billing_webhookAuthorized(header, secret) {
  if (typeof header !== "string" || typeof secret !== "string" || secret === "") {
    return false;
  }
  const given = Buffer.from(header);
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// A TRANSFER event carries transferred_from and transferred_to, and its app_user_id can belong to neither account.
export function Billing_eventUserIds(event) {
  const ids = [
    event?.app_user_id,
    event?.original_app_user_id,
    ...(Array.isArray(event?.aliases) ? event.aliases : []),
    ...(Array.isArray(event?.transferred_from) ? event.transferred_from : []),
    ...(Array.isArray(event?.transferred_to) ? event.transferred_to : []),
  ];
  return [...new Set(ids.filter(Auth_isUserId).map((id) => id.toLowerCase()))];
}

function time(value) {
  if (value == null) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function isSandboxPurchase(subscriber, productId) {
  const subscription = subscriber.subscriptions?.[productId];
  if (subscription != null) {
    return subscription.is_sandbox === true;
  }
  const purchases = subscriber.non_subscriptions?.[productId];
  return Array.isArray(purchases) && purchases.length > 0 && purchases[purchases.length - 1]?.is_sandbox === true;
}

// request_date has whole seconds only, so two reads in one second would tie and the second would be dropped.
function snapshotTime(body) {
  const ms = body?.request_date_ms;
  return Number.isFinite(ms) ? ms : time(body?.request_date);
}

export function Billing_entitlementRow(status, body, options) {
  const subscriber = body?.subscriber;
  const snapshot = snapshotTime(body);
  const read = status === 200 || status === 201;
  if (!read || subscriber == null || typeof subscriber !== "object" || snapshot == null) {
    return { ok: false };
  }
  const snapshotAt = new Date(snapshot).toISOString();
  const entitlement = subscriber.entitlements?.[Billing_entitlementId];
  if (entitlement == null) {
    return { ok: true, row: { active: false, productId: null, expiresAt: null, sandbox: false, snapshotAt } };
  }
  const productId = typeof entitlement.product_identifier === "string" ? entitlement.product_identifier : null;
  const expires = time(entitlement.expires_date);
  const grace = time(entitlement.grace_period_expires_date);
  if (expires === undefined || grace === undefined) {
    return { ok: false };
  }
  const lifetime = expires == null;
  const activeUntil = lifetime ? null : Math.max(expires, grace ?? expires);
  const sandbox = productId != null && isSandboxPurchase(subscriber, productId);
  const active = (lifetime || activeUntil > snapshot) && (!sandbox || options.allowSandbox);
  const expiresAt = sandbox
    ? new Date(snapshot + sandboxGrantMs).toISOString()
    : activeUntil == null
      ? null
      : new Date(activeUntil).toISOString();
  return { ok: true, row: { active, productId, expiresAt, sandbox, snapshotAt } };
}

export function Billing_planAnswer(body) {
  const plan = body?.plan === "plus" ? "plus" : body?.plan === "free" ? "free" : undefined;
  const grant = ["code", "subscription", "lifetime"].includes(body?.grant) ? body.grant : null;
  if (plan == null || (plan === "plus" && grant == null)) {
    return undefined;
  }
  return { plan, grant, canManageSubscription: body?.canManageSubscription === true };
}

// Without REVENUECAT_SECRET_KEY the sync route still answers code grants, so the web app works before RevenueCat is set up.
export function Billing_env(env) {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return undefined;
  }
  return {
    serviceKey,
    revenueCatKey: env.REVENUECAT_SECRET_KEY || undefined,
    allowSandbox: env.BILLING_ALLOW_SANDBOX === "1",
  };
}

function rpc(name, body, serviceKey) {
  return fetchJson(
    `${Supabase_origin}/rest/v1/rpc/${name}`,
    {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs
  );
}

export async function Billing_readPlan(userId, serviceKey) {
  const effective = await rpc("account_plan_effective", { p_user: userId }, serviceKey);
  const answer = effective.status === 200 ? Billing_planAnswer(effective.body) : undefined;
  return answer == null
    ? { ok: false, status: 502, error: `Supabase returned ${effective.status}` }
    : { ok: true, ...answer };
}

// RevenueCat limits reads per project key, so one user looping the sync route could block every purchase.
const syncCooldownMs = 30 * 1000;

export const Billing_waitMessage = "Checking your purchase. Try again in a few seconds.";

// A fresh inactive row may predate a purchase made seconds ago, so it never answers "free".
export function Billing_syncStep(rows, nowMs) {
  const row = Array.isArray(rows) ? rows[0] : undefined;
  const snapshot = time(row?.snapshot_at);
  const age = snapshot == null ? undefined : nowMs - snapshot;
  if (age == null || age >= syncCooldownMs) {
    return { kind: "refresh" };
  }
  const expires = time(row.expires_at);
  if (row.active === true && expires !== undefined && (expires == null || expires > nowMs)) {
    return { kind: "stored" };
  }
  return { kind: "wait", retryAfterSeconds: Math.max(1, Math.ceil((syncCooldownMs - age) / 1000)) };
}

async function storedRows(userId, serviceKey) {
  try {
    const url = `${Supabase_origin}/rest/v1/store_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=active,expires_at,snapshot_at`;
    const read = await fetchJson(
      url,
      { method: "GET", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      timeoutMs
    );
    return read.status === 200 ? read.body : undefined;
  } catch {
    return undefined;
  }
}

export async function Billing_sync(userId, config) {
  if (config.revenueCatKey == null) {
    return Billing_readPlan(userId, config.serviceKey);
  }
  const step = Billing_syncStep(await storedRows(userId, config.serviceKey), Date.now());
  if (step.kind === "stored") {
    return Billing_readPlan(userId, config.serviceKey);
  }
  if (step.kind === "wait") {
    const stored = await Billing_readPlan(userId, config.serviceKey);
    return !stored.ok || stored.plan === "plus"
      ? stored
      : { ok: false, status: 429, error: Billing_waitMessage, retryAfterSeconds: step.retryAfterSeconds };
  }
  return Billing_refresh(userId, config);
}

export async function Billing_refresh(userId, config) {
  if (config.revenueCatKey == null) {
    return { ok: false, status: 500, error: "The server has no RevenueCat key. Set REVENUECAT_SECRET_KEY in Vercel." };
  }
  const customer = await fetchJson(
    `${revenueCatOrigin}/v1/subscribers/${encodeURIComponent(userId)}`,
    { method: "GET", headers: { Authorization: `Bearer ${config.revenueCatKey}` } },
    timeoutMs
  );
  const read = Billing_entitlementRow(customer.status, customer.body, config);
  if (!read.ok) {
    return { ok: false, status: 502, error: `RevenueCat returned ${customer.status}` };
  }
  const put = await rpc(
    "store_entitlement_put",
    {
      p_user: userId,
      p_active: read.row.active,
      p_product: read.row.productId,
      p_expires: read.row.expiresAt,
      p_sandbox: read.row.sandbox,
      p_snapshot: read.row.snapshotAt,
    },
    config.serviceKey
  );
  if (put.status !== 200) {
    return { ok: false, status: 502, error: `Supabase returned ${put.status}` };
  }
  return Billing_readPlan(userId, config.serviceKey);
}
