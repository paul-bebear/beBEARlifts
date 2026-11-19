import { AiCaps_defaults, AiCaps_fromServer, AiCaps_offerSubtitle, IAiCapsPlan } from "./aiCaps";

export type IAccountGrant = "code" | "subscription" | "lifetime";

export type IAccountPlanState =
  | { status: "unknown" }
  | { status: "known"; userId: string; plan: "free"; aiCaps?: IAiCapsPlan }
  | { status: "known"; userId: string; plan: "plus"; grant: IAccountGrant; canManage: boolean; aiCaps?: IAiCapsPlan }
  | { status: "activating"; userId: string; tries?: number };

// RevenueCat can answer free for a few seconds after the store reports a purchase. Each return to the app asks again.
export const AccountPlan_activatingTries = 5;

export type IAccountPlanSync = "plus" | "free" | "stale" | "error";

export interface IAccountPlanRow {
  title: string;
  subtitle?: string;
  action: "open" | "manage" | "none";
}

const grants: IAccountGrant[] = ["code", "subscription", "lifetime"];

function offerRow(state: IAccountPlanState): IAccountPlanRow {
  return { title: "beBEAR+", subtitle: AiCaps_offerSubtitle(AccountPlan_aiCaps(state)), action: "open" };
}

export function AccountPlan_empty(): IAccountPlanState {
  return { status: "unknown" };
}

export function AccountPlan_aiCaps(state: IAccountPlanState): IAiCapsPlan {
  return (state.status === "known" ? state.aiCaps : undefined) ?? AiCaps_defaults;
}

function withCaps(aiCaps: IAiCapsPlan | undefined): { aiCaps?: IAiCapsPlan } {
  return aiCaps == null ? {} : { aiCaps };
}

function known(userId: string, raw: Record<string, unknown>, canManage: unknown): IAccountPlanState | undefined {
  const caps = withCaps(AiCaps_fromServer(raw.aiCaps));
  if (raw.plan === "free") {
    return { status: "known", userId, plan: "free", ...caps };
  }
  const grant = grants.find((g) => g === raw.grant);
  return raw.plan === "plus" && grant != null
    ? { status: "known", userId, plan: "plus", grant, canManage: canManage === true, ...caps }
    : undefined;
}

export function AccountPlan_parse(raw: unknown): IAccountPlanState {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.userId !== "string") {
    return AccountPlan_empty();
  }
  if (r.status === "activating") {
    return typeof r.tries === "number"
      ? { status: "activating", userId: r.userId, tries: r.tries }
      : { status: "activating", userId: r.userId };
  }
  return (r.status === "known" ? known(r.userId, r, r.canManage) : undefined) ?? AccountPlan_empty();
}

// The server ranks a code ahead of a subscription, and the subscription still renews, so canManage stays.
export function AccountPlan_codeRedeemed(current: IAccountPlanState, userId: string): IAccountPlanState {
  const subscribed =
    current.status === "known" && current.userId === userId && current.plan === "plus" && current.canManage;
  const caps = withCaps(current.status === "known" ? current.aiCaps : undefined);
  return { status: "known", userId, plan: "plus", grant: "code", canManage: subscribed, ...caps };
}

export function AccountPlan_parseSync(userId: string, body: unknown): IAccountPlanState | undefined {
  const r = (body ?? {}) as Record<string, unknown>;
  return known(userId, r, r.canManageSubscription);
}

export function AccountPlan_accept(
  current: IAccountPlanState,
  sessionUserId: string | undefined,
  next: IAccountPlanState
): IAccountPlanState {
  if (sessionUserId == null) {
    return AccountPlan_empty();
  }
  if (next.status === "unknown" || next.userId !== sessionUserId) {
    return current.status !== "unknown" && current.userId !== sessionUserId ? AccountPlan_empty() : current;
  }
  if (current.status === "activating" && current.userId === next.userId && next.status === "known") {
    const tries = (current.tries ?? 0) + 1;
    if (next.plan === "free" && tries < AccountPlan_activatingTries) {
      return { status: "activating", userId: next.userId, tries };
    }
  }
  return next;
}

export function AccountPlan_isPlus(state: IAccountPlanState, userId: string | undefined): boolean {
  return state.status === "known" && state.userId === userId && state.plan === "plus";
}

export function AccountPlan_settingsRow(state: IAccountPlanState, userId: string | undefined): IAccountPlanRow {
  if (userId == null || state.status === "unknown" || state.userId !== userId) {
    return offerRow(state);
  }
  if (state.status === "activating") {
    return { title: "beBEAR+", subtitle: "Purchase done. Activating…", action: "none" };
  }
  if (state.plan === "free") {
    return offerRow(state);
  }
  if (state.canManage) {
    return { title: "beBEAR+ is on", subtitle: "Manage subscription", action: "manage" };
  }
  const titles: Record<IAccountGrant, string> = {
    code: "beBEAR+ from a code",
    lifetime: "beBEAR+ for life",
    subscription: "beBEAR+ is on",
  };
  return { title: titles[state.grant], action: "none" };
}
