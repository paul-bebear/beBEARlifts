import {
  CloudBackup_afterSignIn,
  CloudBackup_afterSignOut,
  CloudBackup_empty,
  CloudBackup_isDeadRefresh,
  CloudBackup_needsRefresh,
  CloudBackup_parse,
  CloudBackup_sessionFromAuth,
  ICloudSession,
} from "../models/cloudBackup";
import { JsonStore_create } from "./jsonStore";
import { CloudBackupForm_parseSentCode, ISentCode } from "../models/cloudBackupForm";
import { OAuthFlow_tokenBody } from "../models/oauthFlow";

// The publishable key is meant to ship in client code. Row-level policies on each table and bucket limit what it can read.
export const Supabase_origin = "https://qvqwvuuwfueccrmzwyct.supabase.co";
const publishableKey = "sb_publishable_rEbD1nY_vtRMiQrpHSgnCg_xquG6idR";

export const CloudStore = JsonStore_create("bebear_cloud", CloudBackup_parse, CloudBackup_empty);

// iOS can end the app while the user reads the code in Mail, so the code step survives a restart.
export const SentCodeStore = JsonStore_create<ISentCode>("bebear_sent_code", CloudBackupForm_parseSentCode, () => ({}));

export type ICloudResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function callWithStatus(
  path: string,
  init: RequestInit,
  token?: string
): Promise<{ result: ICloudResult<Response>; status?: number; body?: unknown }> {
  const headers: Record<string, string> = { apikey: publishableKey, ...(init.headers as Record<string, string>) };
  if (token != null) {
    headers.Authorization = `Bearer ${token}`;
  }
  let response: Response;
  try {
    response = await fetch(`${Supabase_origin}${path}`, { ...init, headers });
  } catch {
    return { result: { ok: false, error: "No connection" } };
  }
  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    return {
      result: { ok: false, error: SupabaseClient_errorText(path, response.status, body) },
      status: response.status,
      body,
    };
  }
  return { result: { ok: true, value: response }, status: response.status };
}

export async function SupabaseClient_call(
  path: string,
  init: RequestInit,
  token?: string
): Promise<ICloudResult<Response>> {
  return (await callWithStatus(path, init, token)).result;
}

export const SupabaseClient_storageFullText = "Cloud storage is full or the photo is too large.";

// Supabase Auth answers a wrong or expired code with 403. It answers 429 both for a second code to one
// address within 60 s ("For security purposes…") and for the project's hourly email limit.
export function SupabaseClient_errorText(path: string, status: number, body: unknown): string {
  const r = (body ?? {}) as Record<string, unknown>;
  const message = r.msg ?? r.message ?? r.error_description ?? r.error;
  if (path.startsWith("/auth/v1/verify") && (status === 401 || status === 403)) {
    return "That code is wrong or expired. Send a new code.";
  }
  if (path.startsWith("/auth/v1/otp") && status === 429) {
    return typeof message === "string" && /security purposes/i.test(message)
      ? "Wait a minute before asking for another code."
      : "Too many sign-in emails went out this hour. Try again later.";
  }
  // Storage hides the trigger text in supabase/migrations/20261118100000_storage_limits.sql and sends only the code.
  if (
    path.startsWith("/storage/v1/object/") &&
    status === 500 &&
    typeof message === "string" &&
    /code: P0001\b/.test(message)
  ) {
    return SupabaseClient_storageFullText;
  }
  return typeof message === "string" ? message.replace(/Supabase/g, "The server") : `The server returned ${status}.`;
}

export function SupabaseClient_json(body: unknown, method: string = "POST"): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function SupabaseClient_saveSession(response: Response): Promise<ICloudResult<ICloudSession>> {
  const session = CloudBackup_sessionFromAuth(await response.json().catch(() => undefined), Date.now());
  if (session == null) {
    return { ok: false, error: "The server sent an answer the app could not read." };
  }
  await CloudStore.update((state) => CloudBackup_afterSignIn(state, session));
  return { ok: true, value: session };
}

export const Supabase_notSignedIn = "Not signed in";

async function SupabaseClient_session(): Promise<ICloudResult<ICloudSession>> {
  const current = (await CloudStore.load()).session;
  if (current == null) {
    return { ok: false, error: Supabase_notSignedIn };
  }
  if (!CloudBackup_needsRefresh(current, Date.now())) {
    return { ok: true, value: current };
  }
  const { result, status, body } = await callWithStatus(
    "/auth/v1/token?grant_type=refresh_token",
    SupabaseClient_json({ refresh_token: current.refreshToken })
  );
  if (result.ok) {
    return SupabaseClient_saveSession(result.value);
  }
  if (!CloudBackup_isDeadRefresh(status, body)) {
    return result;
  }
  let signedOut = false;
  let goneAlready = false;
  await CloudStore.update((state) => {
    goneAlready = state.session == null;
    if (state.session?.refreshToken !== current.refreshToken) {
      return state;
    }
    signedOut = true;
    return CloudBackup_afterSignOut(state);
  });
  if (signedOut) {
    await forcedSignOut().catch(() => undefined);
  }
  return signedOut || goneAlready ? { ok: false, error: Supabase_notSignedIn } : result;
}

const noClear = async (): Promise<void> => undefined;
let forcedSignOut: () => Promise<void> = noClear;

// The friends, feed and invite stores import this file, so the module that owns them hands in their clear.
export function SupabaseClient_onForcedSignOut(clear: () => Promise<void>): () => void {
  forcedSignOut = clear;
  return () => {
    if (forcedSignOut === clear) {
      forcedSignOut = noClear;
    }
  };
}

export async function SupabaseClient_exchangeCode(
  code: string,
  verifier: string
): Promise<ICloudResult<ICloudSession>> {
  const result = await SupabaseClient_call(
    "/auth/v1/token?grant_type=pkce",
    SupabaseClient_json(OAuthFlow_tokenBody(code, verifier))
  );
  return result.ok ? SupabaseClient_saveSession(result.value) : result;
}

export async function SupabaseClient_accessToken(): Promise<ICloudResult<string>> {
  const auth = await SupabaseClient_session();
  return auth.ok ? { ok: true, value: auth.value.accessToken } : auth;
}

export async function SupabaseClient_signedIn(): Promise<ICloudResult<{ userId: string; accessToken: string }>> {
  const auth = await SupabaseClient_session();
  return auth.ok ? { ok: true, value: { userId: auth.value.userId, accessToken: auth.value.accessToken } } : auth;
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
