import { fetchJson, json } from "../_food.mjs";
import { AiAuth_bearerToken, Supabase_origin, Supabase_publishableKey } from "../_auth.mjs";

const bucket = "backups";
const listLimit = 1000;
const timeoutMs = 10000;

export const AccountDelete_signInMessage = "Sign in again, then delete the account.";

// The gateway swaps a "Bearer sb_secret_…" header for a service_role JWT and passes a legacy service_role JWT as it is, so both key kinds work here.
function adminHeaders(serviceKey) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
}

export function AccountDelete_userId(status, body) {
  return status === 200 && typeof body?.id === "string" && body.id !== "" ? body.id : undefined;
}

export function AccountDelete_objectPaths(userId, listing) {
  return Array.isArray(listing)
    ? listing.filter((o) => o?.id != null && typeof o.name === "string").map((o) => `${userId}/${o.name}`)
    : undefined;
}

// Every table that holds user rows references auth.users with on delete cascade, so removing the auth user removes the rest.
// Storage objects have no such reference, so they go first, and a failure there leaves the account in place for a retry.
export async function POST(request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return json({ error: "The server has no Supabase service key. Set SUPABASE_SERVICE_ROLE_KEY in Vercel." }, 500);
  }
  const token = AiAuth_bearerToken(request.headers.get("authorization"));
  if (token == null) {
    return json({ error: AccountDelete_signInMessage }, 401);
  }
  try {
    const user = await fetchJson(
      `${Supabase_origin}/auth/v1/user`,
      { method: "GET", headers: { apikey: Supabase_publishableKey, Authorization: `Bearer ${token}` } },
      timeoutMs
    );
    const userId = AccountDelete_userId(user.status, user.body);
    if (userId == null) {
      return user.status === 401 || user.status === 403
        ? json({ error: AccountDelete_signInMessage }, 401)
        : json({ error: `Supabase Auth returned ${user.status}` }, 502);
    }

    const listing = await fetchJson(
      `${Supabase_origin}/storage/v1/object/list/${bucket}`,
      {
        method: "POST",
        headers: adminHeaders(serviceKey),
        body: JSON.stringify({ prefix: userId, limit: listLimit, offset: 0 }),
      },
      timeoutMs
    );
    const paths = AccountDelete_objectPaths(userId, listing.body);
    if (listing.status !== 200 || paths == null) {
      return json({ error: `Could not list the cloud backups (Supabase returned ${listing.status})` }, 502);
    }
    if (paths.length > 0) {
      const removed = await fetchJson(
        `${Supabase_origin}/storage/v1/object/${bucket}`,
        { method: "DELETE", headers: adminHeaders(serviceKey), body: JSON.stringify({ prefixes: paths }) },
        timeoutMs
      );
      if (removed.status !== 200) {
        return json({ error: `Could not delete the cloud backups (Supabase returned ${removed.status})` }, 502);
      }
    }

    const deleted = await fetchJson(
      `${Supabase_origin}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      { method: "DELETE", headers: adminHeaders(serviceKey) },
      timeoutMs
    );
    if (deleted.status !== 200 && deleted.status !== 204 && deleted.status !== 404) {
      return json({ error: `Could not delete the account (Supabase returned ${deleted.status})` }, 502);
    }
    return json({ deleted: true });
  } catch {
    return json({ error: "Supabase did not answer. Try again." }, 504);
  }
}
