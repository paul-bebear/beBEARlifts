import {
  CloudBackup_empty,
  CloudBackup_needsRefresh,
  CloudBackup_parse,
  CloudBackup_sessionFromAuth,
  ICloudSession,
} from "../models/cloudBackup";
import { JsonStore_create } from "./jsonStore";

// The publishable key is meant to ship in client code. Row-level policies on each table and bucket limit what it can read.
export const Supabase_origin = "https://qvqwvuuwfueccrmzwyct.supabase.co";
const publishableKey = "sb_publishable_rEbD1nY_vtRMiQrpHSgnCg_xquG6idR";

export const CloudStore = JsonStore_create("bebear_cloud", CloudBackup_parse, CloudBackup_empty);

export type ICloudResult<T> = { ok: true; value: T } | { ok: false; error: string };

export async function SupabaseClient_call(
  path: string,
  init: RequestInit,
  token?: string
): Promise<ICloudResult<Response>> {
  const headers: Record<string, string> = { apikey: publishableKey, ...(init.headers as Record<string, string>) };
  if (token != null) {
    headers.Authorization = `Bearer ${token}`;
  }
  let response: Response;
  try {
    response = await fetch(`${Supabase_origin}${path}`, { ...init, headers });
  } catch {
    return { ok: false, error: "No connection" };
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as Record<string, unknown> | undefined;
    const message = body?.msg ?? body?.message ?? body?.error_description ?? body?.error;
    return { ok: false, error: typeof message === "string" ? message : `Supabase returned ${response.status}` };
  }
  return { ok: true, value: response };
}

export function SupabaseClient_json(body: unknown, method: string = "POST"): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function SupabaseClient_saveSession(response: Response): Promise<ICloudResult<ICloudSession>> {
  const session = CloudBackup_sessionFromAuth(await response.json().catch(() => undefined), Date.now());
  if (session == null) {
    return { ok: false, error: "Supabase sent an answer the app could not read" };
  }
  await CloudStore.update((state) =>
    state.session?.userId === session.userId ? { ...state, session } : { ...CloudBackup_empty(), session }
  );
  return { ok: true, value: session };
}

export const Supabase_notSignedIn = "Not signed in";

export async function SupabaseClient_session(): Promise<ICloudResult<ICloudSession>> {
  const current = (await CloudStore.load()).session;
  if (current == null) {
    return { ok: false, error: Supabase_notSignedIn };
  }
  if (!CloudBackup_needsRefresh(current, Date.now())) {
    return { ok: true, value: current };
  }
  const result = await SupabaseClient_call(
    "/auth/v1/token?grant_type=refresh_token",
    SupabaseClient_json({ refresh_token: current.refreshToken })
  );
  return result.ok ? SupabaseClient_saveSession(result.value) : result;
}

export async function SupabaseClient_accessToken(): Promise<ICloudResult<string>> {
  const auth = await SupabaseClient_session();
  return auth.ok ? { ok: true, value: auth.value.accessToken } : auth;
}

export async function SupabaseClient_authed(
  path: string,
  init: RequestInit
): Promise<ICloudResult<{ response: Response; userId: string }>> {
  const auth = await SupabaseClient_session();
  if (!auth.ok) {
    return auth;
  }
  const result = await SupabaseClient_call(path, init, auth.value.accessToken);
  return result.ok ? { ok: true, value: { response: result.value, userId: auth.value.userId } } : result;
}

export async function SupabaseClient_readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => undefined);
}
