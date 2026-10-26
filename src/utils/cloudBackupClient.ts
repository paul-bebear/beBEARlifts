import { ProgressPhotos_cloudPath } from "../models/progressPhotos";
import {
  CloudBackup_afterSignOut,
  CloudBackup_path,
  CloudBackup_paths,
  ICloudCopy,
  ICloudSession,
} from "../models/cloudBackup";
import { AccountDeletion_result, AccountDeletion_signInMessage } from "../models/accountDeletion";
import { Friends_empty } from "../models/friends";
import { FeedModeration_empty } from "../models/feedModeration";
import { Feed_empty } from "../models/feed";
import { ApiUrl_for } from "./apiUrl";
import { FriendsStore } from "./friendsClient";
import { BlocksStore } from "./moderationStore";
import { FeedStore } from "./feedClient";
import { InviteStore } from "./inviteClient";
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

export async function CloudBackupClient_upload(
  text: string,
  marks: { exportedAt: string; workouts: string; stores: string }
): Promise<ICloudResult<number>> {
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
  await CloudStore.update((state) => ({
    ...state,
    lastBackupAt: now,
    syncedExportedAt: marks.exportedAt,
    backedUpWorkouts: marks.workouts,
    backedUpStores: marks.stores,
    ownerUserId: session.userId,
    uploadDeclinedFor: undefined,
    restoreOffer: undefined,
  }));
  return { ok: true, value: now };
}

function photoUrl(userId: string, id: number): string {
  return `/storage/v1/object/${bucket}/${ProgressPhotos_cloudPath(userId, id)}`;
}

export async function CloudBackupClient_putPhoto(
  userId: string,
  id: number,
  bytes: Uint8Array
): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_authed(photoUrl(userId, id), {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: bytes,
  });
  return result.ok ? { ok: true, value: undefined } : result;
}

export async function CloudBackupClient_deletePhoto(userId: string, id: number): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_authed(photoUrl(userId, id), { method: "DELETE" });
  if (!result.ok) {
    return /^Object not found$/i.test(result.error) ? { ok: true, value: undefined } : result;
  }
  return { ok: true, value: undefined };
}

export async function CloudBackupClient_getPhoto(
  userId: string,
  id: number
): Promise<ICloudResult<Uint8Array | undefined>> {
  const path = ProgressPhotos_cloudPath(userId, id);
  const result = await SupabaseClient_authed(`/storage/v1/object/authenticated/${bucket}/${path}`, { method: "GET" });
  if (!result.ok) {
    return /^Object not found$/i.test(result.error) ? { ok: true, value: undefined } : result;
  }
  return { ok: true, value: new Uint8Array(await result.value.response.arrayBuffer()) };
}

export async function CloudBackupClient_saveReplaced(text: string): Promise<ICloudResult<undefined>> {
  const session = (await CloudStore.load()).session;
  if (session == null) {
    return { ok: false, error: Supabase_notSignedIn };
  }
  const result = await put(CloudBackup_path(session.userId, "replaced"), text);
  return result.ok ? { ok: true, value: undefined } : result;
}

export async function CloudBackupClient_download(
  copy: ICloudCopy = "latest"
): Promise<ICloudResult<string | undefined>> {
  const session = (await CloudStore.load()).session;
  if (session == null) {
    return { ok: false, error: Supabase_notSignedIn };
  }
  const path = CloudBackup_path(session.userId, copy);
  const result = await SupabaseClient_authed(`/storage/v1/object/authenticated/${bucket}/${path}`, { method: "GET" });
  if (!result.ok) {
    return /^Object not found$/i.test(result.error) ? { ok: true, value: undefined } : result;
  }
  return { ok: true, value: await result.value.response.text() };
}

async function clearAccountCaches(): Promise<void> {
  await Promise.all([
    CloudStore.update((state) => CloudBackup_afterSignOut(state)),
    FriendsStore.update(() => Friends_empty()),
    BlocksStore.update(() => FeedModeration_empty()),
    FeedStore.update(() => Feed_empty()),
    InviteStore.update(() => ({})),
  ]);
}

// scope=local ends only this phone's session. The default, global, would also sign out the user's other phone.
export async function CloudBackupClient_signOut(): Promise<void> {
  if ((await CloudStore.load()).session != null) {
    await SupabaseClient_authed("/auth/v1/logout?scope=local", { method: "POST" }).catch(() => undefined);
  }
  await clearAccountCaches();
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
  await clearAccountCaches();
  return { ok: true, value: undefined };
}
