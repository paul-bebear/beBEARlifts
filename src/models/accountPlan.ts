export type IAccountGrant = "code" | "subscription" | "lifetime";

export type IAccountPlanState =
  | { status: "unknown" }
  | { status: "known"; userId: string; plan: "free" }
  | { status: "known"; userId: string; plan: "plus"; grant: IAccountGrant; canManage: boolean }
  | { status: "activating"; userId: string };

export type IAccountPlanSync = "plus" | "free" | "stale" | "error";

export interface IAccountPlanRow {
  title: string;
  subtitle?: string;
  action: "open" | "manage" | "none";
}

const grants: IAccountGrant[] = ["code", "subscription", "lifetime"];

const offerRow: IAccountPlanRow = {
  title: "beBEAR+",
  subtitle: "30 AI uses a day. Tracking stays free.",
  action: "open",
};

export function AccountPlan_empty(): IAccountPlanState {
  return { status: "unknown" };
}

function known(userId: string, raw: Record<string, unknown>, canManage: unknown): IAccountPlanState | undefined {
  if (raw.plan === "free") {
    return { status: "known", userId, plan: "free" };
  }
  const grant = grants.find((g) => g === raw.grant);
  return raw.plan === "plus" && grant != null
    ? { status: "known", userId, plan: "plus", grant, canManage: canManage === true }
    : undefined;
}

export function AccountPlan_parse(raw: unknown): IAccountPlanState {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.userId !== "string") {
    return AccountPlan_empty();
  }
  if (r.status === "activating") {
    return { status: "activating", userId: r.userId };
  }
  return (r.status === "known" ? known(r.userId, r, r.canManage) : undefined) ?? AccountPlan_empty();
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
  return next;
}

export function AccountPlan_isPlus(state: IAccountPlanState, userId: string | undefined): boolean {
  return state.status === "known" && state.userId === userId && state.plan === "plus";
}

export function AccountPlan_settingsRow(state: IAccountPlanState, userId: string | undefined): IAccountPlanRow {
  if (userId == null || state.status === "unknown" || state.userId !== userId) {
    return offerRow;
  }
  if (state.status === "activating") {
    return { title: "beBEAR+", subtitle: "Purchase done. Activating…", action: "none" };
  }
  if (state.plan === "free") {
    return offerRow;
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
