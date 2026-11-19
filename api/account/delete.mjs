import { fetchJson, json } from "../_food.mjs";
import { AiAuth_bearerToken, Supabase_origin, Supabase_publishableKey } from "../_auth.mjs";

const buckets = [
  { bucket: "backups", label: "cloud backups" },
  { bucket: "meal-photos", label: "meal photos" },
];
const revenueCatOrigin = "https://api.revenuecat.com";
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

// Supabase lists one folder level and shows each subfolder as an entry with id null.
export function AccountDelete_listingEntries(prefix, listing) {
  if (!Array.isArray(listing)) {
    return undefined;
  }
  const named = listing.filter((o) => typeof o?.name === "string");
  return {
    files: named.filter((o) => o.id != null).map((o) => `${prefix}/${o.name}`),
    folders: named.filter((o) => o.id == null).map((o) => `${prefix}/${o.name}`),
    count: listing.length,
  };
}

async function listAllObjects(bucket, userId, serviceKey) {
  const files = [];
  const prefixes = [userId];
  while (prefixes.length > 0) {
    const prefix = prefixes.shift();
    for (let offset = 0; ; offset += listLimit) {
      const listing = await fetchJson(
        `${Supabase_origin}/storage/v1/object/list/${bucket}`,
        {
          method: "POST",
          headers: adminHeaders(serviceKey),
          body: JSON.stringify({ prefix, limit: listLimit, offset }),
        },
        timeoutMs
      );
      const entries = AccountDelete_listingEntries(prefix, listing.body);
      if (listing.status !== 200 || entries == null) {
        return { status: listing.status };
      }
      files.push(...entries.files);
      prefixes.push(...entries.folders);
      if (entries.count < listLimit) {
        break;
      }
    }
  }
  return { files };
}

// Every table that holds user rows references auth.users with on delete cascade, so removing the auth user removes the rest.
// Storage objects have no such reference, so they go first, and a failure there leaves the account in place for a retry.
// The RevenueCat customer goes just before the auth user, and without REVENUECAT_SECRET_KEY that step is skipped, as in the sync route.
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

    for (const { bucket, label } of buckets) {
      const listed = await listAllObjects(bucket, userId, serviceKey);
      if (listed.files == null) {
        return json({ error: `Could not list the ${label} (Supabase returned ${listed.status})` }, 502);
      }
      for (let start = 0; start < listed.files.length; start += listLimit) {
        const batch = listed.files.slice(start, start + listLimit);
        const removed = await fetchJson(
          `${Supabase_origin}/storage/v1/object/${bucket}`,
          { method: "DELETE", headers: adminHeaders(serviceKey), body: JSON.stringify({ prefixes: batch }) },
          timeoutMs
        );
        if (removed.status !== 200) {
          return json({ error: `Could not delete the ${label} (Supabase returned ${removed.status})` }, 502);
        }
      }
    }

    const revenueCatKey = process.env.REVENUECAT_SECRET_KEY;
    if (revenueCatKey) {
      const customer = await fetchJson(
        `${revenueCatOrigin}/v1/subscribers/${encodeURIComponent(userId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${revenueCatKey}`, "Content-Type": "application/json" } },
        timeoutMs
      );
      if (customer.status !== 200 && customer.status !== 204 && customer.status !== 404) {
        return json(
          { error: `Could not delete the subscription record (RevenueCat returned ${customer.status})` },
          502
        );
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
