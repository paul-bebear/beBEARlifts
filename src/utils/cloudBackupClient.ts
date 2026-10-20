import {
  CloudBackup_empty,
  CloudBackup_needsRefresh,
  CloudBackup_parse,
  CloudBackup_paths,
  CloudBackup_sessionFromAuth,
  ICloudSession,
} from "../models/cloudBackup";
import { JsonStore_create } from "./jsonStore";

// The publishable key is meant to ship in client code. Row-level policies on storage.objects keep each user in their own folder.
export const CloudBackup_origin = "https://qvqwvuuwfueccrmzwyct.supabase.co";
const publishableKey = "sb_publishable_rEbD1nY_vtRMiQrpHSgnCg_xquG6idR";
const bucket = "backups";

export const CloudStore = JsonStore_create("bebear_cloud", CloudBackup_parse, CloudBackup_empty);

export type ICloudResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function call(path: string, init: RequestInit, token?: string): Promise<ICloudResult<Response>> {
  const headers: Record<string, string> = { apikey: publishableKey, ...(init.headers as Record<string, string>) };
  if (token != null) {
    headers.Authorization = `Bearer ${token}`;
  }
  let response: Response;
  try {
    response = await fetch(`${CloudBackup_origin}${path}`, { ...init, headers });
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

function json(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function CloudBackupClient_sendCode(email: string): Promise<ICloudResult<undefined>> {
  const result = await call("/auth/v1/otp", json({ email: email.trim(), create_user: true }));
  return result.ok ? { ok: true, value: undefined } : result;
}

async function saveSession(response: Response): Promise<ICloudResult<ICloudSession>> {
  const session = CloudBackup_sessionFromAuth(await response.json().catch(() => undefined), Date.now());
  if (session == null) {
    return { ok: false, error: "Supabase sent an answer the app could not read" };
  }
  await CloudStore.update((state) => ({
    ...state,
    session,
    lastBackupAt: state.session?.userId === session.userId ? state.lastBackupAt : undefined,
  }));
  return { ok: true, value: session };
}

export async function CloudBackupClient_verify(email: string, code: string): Promise<ICloudResult<ICloudSession>> {
  const result = await call("/auth/v1/verify", json({ type: "email", email: email.trim(), token: code.trim() }));
  return result.ok ? saveSession(result.value) : result;
}

async function getSession(): Promise<ICloudResult<ICloudSession>> {
  const current = (await CloudStore.load()).session;
  if (current == null) {
    return { ok: false, error: "Not signed in" };
  }
  if (!CloudBackup_needsRefresh(current, Date.now())) {
    return { ok: true, value: current };
  }
  const result = await call("/auth/v1/token?grant_type=refresh_token", json({ refresh_token: current.refreshToken }));
  return result.ok ? saveSession(result.value) : result;
}

async function put(path: string, text: string, token: string): Promise<ICloudResult<Response>> {
  return call(
    `/storage/v1/object/${bucket}/${path}`,
    { method: "POST", headers: { "Content-Type": "application/json", "x-upsert": "true" }, body: text },
    token
  );
}

export async function CloudBackupClient_upload(text: string): Promise<ICloudResult<number>> {
  const auth = await getSession();
  if (!auth.ok) {
    return auth;
  }
  const now = Date.now();
  const paths = CloudBackup_paths(auth.value.userId, now);
  const latest = await put(paths.latest, text, auth.value.accessToken);
  if (!latest.ok) {
    return latest;
  }
  const daily = await put(paths.daily, text, auth.value.accessToken);
  if (!daily.ok) {
    return daily;
  }
  await CloudStore.update((state) => ({ ...state, lastBackupAt: now }));
  return { ok: true, value: now };
}

export async function CloudBackupClient_download(): Promise<ICloudResult<string | undefined>> {
  const auth = await getSession();
  if (!auth.ok) {
    return auth;
  }
  const path = CloudBackup_paths(auth.value.userId, Date.now()).latest;
  const result = await call(
    `/storage/v1/object/authenticated/${bucket}/${path}`,
    { method: "GET" },
    auth.value.accessToken
  );
  if (!result.ok) {
    return /^Object not found$/i.test(result.error) ? { ok: true, value: undefined } : result;
  }
  return { ok: true, value: await result.value.text() };
}

export async function CloudBackupClient_signOut(): Promise<void> {
  await CloudStore.update(() => CloudBackup_empty());
}
