import {
  AccountPlan_accept,
  AccountPlan_empty,
  AccountPlan_parse,
  AccountPlan_parseSync,
  IAccountPlanState,
  IAccountPlanSync,
} from "../models/accountPlan";
import { ApiUrl_for } from "./apiUrl";
import { JsonStore_create } from "./jsonStore";
import { CloudStore, SupabaseClient_signedIn } from "./supabaseClient";

export const AccountPlanStore = JsonStore_create("bebear_account_plan", AccountPlan_parse, AccountPlan_empty);

let latestSync = 0;

async function save(next: IAccountPlanState): Promise<void> {
  const userId = (await CloudStore.load()).session?.userId;
  await AccountPlanStore.update((current) => AccountPlan_accept(current, userId, next));
}

export function AccountPlanClient_markActivating(userId: string): Promise<void> {
  latestSync += 1;
  return save({ status: "activating", userId });
}

export function AccountPlanClient_markCodeRedeemed(userId: string): Promise<void> {
  return save({ status: "known", userId, plan: "plus", grant: "code", canManage: false });
}

// Only the newest request may save, so a slow answer from app start cannot undo a purchase made after it.
// Marking a purchase as activating also outdates every request already sent.
export async function AccountPlanClient_sync(): Promise<IAccountPlanSync> {
  latestSync += 1;
  const request = latestSync;
  const auth = await SupabaseClient_signedIn();
  if (!auth.ok) {
    return "error";
  }
  try {
    const response = await fetch(ApiUrl_for("/api/billing/sync"), {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.value.accessToken}` },
    });
    const next = AccountPlan_parseSync(auth.value.userId, await response.json().catch(() => undefined));
    if (!response.ok || next == null || next.status !== "known") {
      return "error";
    }
    if (request !== latestSync) {
      return "stale";
    }
    await save(next);
    const saved = AccountPlanStore.get();
    return saved.status === "known" && saved.userId === auth.value.userId ? saved.plan : "stale";
  } catch {
    return "error";
  }
}

export function AccountPlanClient_clear(): Promise<void> {
  latestSync += 1;
  return AccountPlanStore.update(() => AccountPlan_empty());
}
