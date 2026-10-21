import { Friends_empty, Friends_fromServer, Friends_parse, IFriendStatus, IFriendsState } from "../models/friends";
import { IFoundProfile } from "../models/friendsForm";
import { JsonStore_create } from "./jsonStore";
import { FeedModeration_fromServer, FeedModeration_users, IBlockedUser } from "../models/feedModeration";
import { BlocksStore } from "./moderationStore";
import {
  CloudStore,
  ICloudResult,
  SupabaseClient_authed,
  SupabaseClient_json,
  SupabaseClient_readJson,
} from "./supabaseClient";

export const FriendsStore = JsonStore_create("bebear_friends", Friends_parse, Friends_empty);

const noBody = { Prefer: "return=minimal" };

function write(body: unknown, method: string): RequestInit {
  const init = SupabaseClient_json(body, method);
  return { ...init, headers: { ...(init.headers as Record<string, string>), ...noBody } };
}

export async function FriendsClient_load(): Promise<ICloudResult<IFriendsState>> {
  const [profiles, friendships] = await Promise.all([
    SupabaseClient_authed("/rest/v1/profiles?select=user_id,handle,display_name", { method: "GET" }),
    SupabaseClient_authed("/rest/v1/friendships?select=requester,addressee,status,created_at", { method: "GET" }),
  ]);
  if (!profiles.ok) {
    return profiles;
  }
  if (!friendships.ok) {
    return friendships;
  }
  const state = Friends_fromServer(
    profiles.value.userId,
    await SupabaseClient_readJson(profiles.value.response),
    await SupabaseClient_readJson(friendships.value.response)
  );
  await FriendsStore.update(() => state);
  return { ok: true, value: state };
}

export async function FriendsClient_saveProfile(
  handle: string,
  displayName: string,
  isNew: boolean
): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_authed(
    isNew ? "/rest/v1/profiles" : `/rest/v1/profiles?user_id=eq.${(await CloudStore.load()).session?.userId}`,
    write({ handle, display_name: displayName }, isNew ? "POST" : "PATCH")
  );
  return result.ok ? { ok: true, value: undefined } : result;
}

export async function FriendsClient_find(handle: string): Promise<ICloudResult<IFoundProfile | undefined>> {
  const result = await SupabaseClient_authed("/rest/v1/rpc/find_profile", SupabaseClient_json({ p_handle: handle }));
  if (!result.ok) {
    return result;
  }
  const rows = await SupabaseClient_readJson(result.value.response);
  const row = (Array.isArray(rows) ? rows[0] : undefined) as Record<string, unknown> | undefined;
  return typeof row?.handle === "string"
    ? {
        ok: true,
        value: {
          handle: row.handle,
          displayName: typeof row.display_name === "string" ? row.display_name : row.handle,
        },
      }
    : { ok: true, value: undefined };
}

export async function FriendsClient_request(handle: string): Promise<ICloudResult<IFriendStatus>> {
  const result = await SupabaseClient_authed("/rest/v1/rpc/request_friend", SupabaseClient_json({ p_handle: handle }));
  if (!result.ok) {
    return result;
  }
  const status = await SupabaseClient_readJson(result.value.response);
  return { ok: true, value: status === "accepted" ? "accepted" : "pending" };
}

// The update policy limits the row to one where the signed-in user is the addressee.
export async function FriendsClient_accept(otherId: string): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_authed(
    `/rest/v1/friendships?requester=eq.${otherId}`,
    write({ status: "accepted" }, "PATCH")
  );
  return result.ok ? { ok: true, value: undefined } : result;
}

// The delete policy limits the rows to the signed-in user's own, so this removes only the one pair.
export async function FriendsClient_remove(otherId: string): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_authed(
    `/rest/v1/friendships?or=(requester.eq.${otherId},addressee.eq.${otherId})`,
    {
      method: "DELETE",
      headers: noBody,
    }
  );
  return result.ok ? { ok: true, value: undefined } : result;
}

export async function FriendsClient_loadBlocks(): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_authed(
    "/rest/v1/user_blocks?select=blocked_id,blocked:profiles!user_blocks_blocked_id_fkey(display_name)",
    { method: "GET" }
  );
  if (!result.ok) {
    return result;
  }
  const rows = await SupabaseClient_readJson(result.value.response);
  await BlocksStore.update(() => FeedModeration_fromServer(result.value.userId, rows));
  return { ok: true, value: undefined };
}

export async function FriendsClient_block(user: IBlockedUser): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_authed("/rest/v1/user_blocks", write({ blocked_id: user.userId }, "POST"));
  if (!result.ok) {
    return result;
  }
  const userId = result.value.userId;
  await BlocksStore.update((s) => ({
    version: 1,
    userId,
    users: [...FeedModeration_users(s, userId).filter((u) => u.userId !== user.userId), user],
  }));
  await FriendsStore.update((s) =>
    s.userId === userId ? { ...s, links: s.links.filter((l) => l.other.userId !== user.userId) } : s
  );
  return { ok: true, value: undefined };
}

export async function FriendsClient_unblock(otherId: string): Promise<ICloudResult<undefined>> {
  const result = await SupabaseClient_authed(`/rest/v1/user_blocks?blocked_id=eq.${encodeURIComponent(otherId)}`, {
    method: "DELETE",
    headers: noBody,
  });
  if (!result.ok) {
    return result;
  }
  await BlocksStore.update((s) =>
    s.userId === result.value.userId ? { ...s, users: s.users.filter((u) => u.userId !== otherId) } : s
  );
  return { ok: true, value: undefined };
}
