import { CloudBackupForm_parsePlan } from "../models/cloudBackupForm";
import {
  IPlusFeature,
  PlusAccess_afterLoad,
  PlusAccess_allows,
  PlusAccess_empty,
  PlusAccess_needsPlus,
  PlusAccess_parse,
} from "../models/plusAccess";
import { JsonStore_create } from "./jsonStore";
import { CloudStore, SupabaseClient_authed, SupabaseClient_readJson } from "./supabaseClient";

export const PlusAccessStore = JsonStore_create("bebear_plus_access", PlusAccess_parse, PlusAccess_empty);

async function loadPlus(): Promise<boolean | undefined> {
  try {
    const result = await SupabaseClient_authed("/rest/v1/account_plans?select=plan", { method: "GET" });
    return result.ok
      ? CloudBackupForm_parsePlan(await SupabaseClient_readJson(result.value.response)) === "plus"
      : undefined;
  } catch {
    return undefined;
  }
}

export async function PlusAccessClient_refresh(): Promise<void> {
  const userId = (await CloudStore.load()).session?.userId;
  const loaded = userId == null ? undefined : await loadPlus();
  const sessionUserId = (await CloudStore.load()).session?.userId;
  await PlusAccessStore.update((current) =>
    sessionUserId === userId ? PlusAccess_afterLoad(current, sessionUserId, loaded) : current
  );
}

export async function PlusAccessClient_markRedeemed(): Promise<void> {
  const userId = (await CloudStore.load()).session?.userId;
  await PlusAccessStore.update((current) => PlusAccess_afterLoad(current, userId, true));
}

export async function PlusAccessClient_allows(feature: IPlusFeature): Promise<boolean> {
  if (!PlusAccess_needsPlus(feature)) {
    return true;
  }
  const [access, cloud] = await Promise.all([PlusAccessStore.load(), CloudStore.load()]);
  return PlusAccess_allows(feature, access, cloud.session?.userId);
}

export function PlusAccessClient_start(): () => void {
  let lastUserId: string | undefined | null = null;
  const onSession = (userId: string | undefined): void => {
    if (userId !== lastUserId) {
      lastUserId = userId;
      PlusAccessClient_refresh().catch(() => undefined);
    }
  };
  CloudStore.load()
    .then((cloud) => onSession(cloud.session?.userId))
    .catch(() => undefined);
  return CloudStore.subscribe((cloud) => onSession(cloud.session?.userId));
}
