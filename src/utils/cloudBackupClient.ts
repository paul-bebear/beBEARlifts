import { CloudBackup_empty, CloudBackup_paths, ICloudSession } from "../models/cloudBackup";
import { AccountDeletion_result, AccountDeletion_signInMessage } from "../models/accountDeletion";
import { Friends_empty } from "../models/friends";
import { FeedModeration_empty } from "../models/feedModeration";
import { ApiUrl_for } from "./apiUrl";
import { FriendsStore } from "./friendsClient";
import { BlocksStore } from "./moderationStore";
import {
  CloudStore,
  ICloudResult,
  SupabaseClient_accessToken,
  SupabaseClient_authed,
  SupabaseClient_call,
  SupabaseClient_json,
  SupabaseClient_saveSession,
  Supabase_notSignedIn,
} from "./supabaseClient";

const bucket = "backups";

export async function CloudBackupClient_sendCode(email: string): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_call(
    "/auth/v1/otp",
    SupabaseClient_json({ email: email.trim(), create_user: true })
  );
  return result.ok ? { ok: true, value: undefined } : result;
}

export async function CloudBackupClient_verify(email: string, code: string): Promise<ICloudResult<ICloudSession>> {
  const result = await SupabaseClient_call(
    "/auth/v1/verify",
    SupabaseClient_json({ type: "email", email: email.trim(), token: code.trim() })
  );
  return result.ok ? SupabaseClient_saveSession(result.value) : result;
}

async function put(path: string, text: string): Promise<ICloudResult<string>> {
  const result = await SupabaseClient_authed(`/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: text,
  });
  return result.ok ? { ok: true, value: result.value.userId } : result;
}

export async function CloudBackupClient_upload(text: string): Promise<ICloudResult<number>> {
  const session = (await CloudStore.load()).session;
  if (session == null) {
    return { ok: false, error: Supabase_notSignedIn };
  }
  const now = Date.now();
  const paths = CloudBackup_paths(session.userId, now);
  const latest = await put(paths.latest, text);
  if (!latest.ok) {
    return latest;
  }
  const daily = await put(paths.daily, text);
  if (!daily.ok) {
    return daily;
  }
  await CloudStore.update((state) => ({ ...state, lastBackupAt: now }));
  return { ok: true, value: now };
}

export async function CloudBackupClient_download(): Promise<ICloudResult<string | undefined>> {
  const session = (await CloudStore.load()).session;
  if (session == null) {
    return { ok: false, error: Supabase_notSignedIn };
  }
  const path = CloudBackup_paths(session.userId, Date.now()).latest;
  const result = await SupabaseClient_authed(`/storage/v1/object/authenticated/${bucket}/${path}`, { method: "GET" });
  if (!result.ok) {
    return /^Object not found$/i.test(result.error) ? { ok: true, value: undefined } : result;
  }
  return { ok: true, value: await result.value.response.text() };
}

export async function CloudBackupClient_signOut(): Promise<void> {
  await CloudStore.update(() => CloudBackup_empty());
}

export async function CloudBackupClient_deleteAccount(): Promise<ICloudResult<undefined>> {
  const auth = await SupabaseClient_accessToken();
  if (!auth.ok) {
    return { ok: false, error: auth.error === Supabase_notSignedIn ? AccountDeletion_signInMessage : auth.error };
  }
  let response: Response;
  try {
    response = await fetch(ApiUrl_for("/api/account/delete"), {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.value}` },
    });
  } catch {
    return { ok: false, error: "No connection" };
  }
  const result = AccountDeletion_result(response.status, await response.json().catch(() => undefined));
  if (!result.ok) {
    return result;
  }
  await Promise.all([
    CloudStore.update(() => CloudBackup_empty()),
    FriendsStore.update(() => Friends_empty()),
    BlocksStore.update(() => FeedModeration_empty()),
  ]);
  return { ok: true, value: undefined };
}
