import { Invite_parseHandle, Invite_fromUrl, Invite_defaultHandle } from "../models/invite";
import { JsonStore_create } from "./jsonStore";
import { FriendsClient_load, FriendsClient_request, FriendsClient_saveProfile } from "./friendsClient";
import { Friends_errorText } from "../models/friends";
import { ICloudResult } from "./supabaseClient";

interface IPendingInvite {
  handle?: string;
}

function parse(raw: unknown): IPendingInvite {
  return { handle: Invite_parseHandle((raw as IPendingInvite | undefined)?.handle) };
}

export const InviteStore = JsonStore_create<IPendingInvite>("bebear_invite", parse, () => ({}));

export function InviteClient_isStandalone(): boolean {
  return typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InviteClient_current(): string | undefined {
  return typeof window === "undefined" ? undefined : Invite_fromUrl(window.location.href);
}

export async function InviteClient_save(handle: string): Promise<void> {
  if (InviteClient_isStandalone()) {
    await InviteStore.update(() => ({ handle: Invite_parseHandle(handle) }));
  }
}

export async function InviteClient_request(handle: string): Promise<ICloudResult<undefined>> {
  if (Invite_parseHandle(handle) == null) {
    return { ok: false, error: "The invite handle is invalid." };
  }
  const loaded = await FriendsClient_load();
  if (!loaded.ok) {
    return loaded;
  }
  if (loaded.value.me == null) {
    if (loaded.value.userId == null) {
      return { ok: false, error: "Sign in to send the friend request." };
    }
    const saved = await FriendsClient_saveProfile(Invite_defaultHandle(loaded.value.userId), "Lifter", true);
    if (!saved.ok) {
      const refreshed = await FriendsClient_load();
      if (!refreshed.ok || refreshed.value.me == null) {
        return { ok: false, error: `${Friends_errorText(saved.error)} Choose your handle in Friends, then retry.` };
      }
    }
  }
  const result = await FriendsClient_request(handle);
  if (!result.ok) {
    return result;
  }
  await InviteStore.update((pending) => (pending.handle === handle ? {} : pending));
  return { ok: true, value: undefined };
}
