export interface IPurchasesIdentity {
  wanted: string | null;
  inFlightFor?: string | null;
  done: string | null;
}

export type IPurchasesIdentityEffect = { type: "logIn"; userId: string } | { type: "logOut" };

type IStep = { state: IPurchasesIdentity; effect?: IPurchasesIdentityEffect };

export function PurchasesIdentity_configuredWith(userId: string | undefined): IPurchasesIdentity {
  return { wanted: userId ?? null, done: userId ?? null };
}

function start(state: IPurchasesIdentity): IStep {
  if (state.inFlightFor !== undefined || state.wanted === state.done) {
    return { state };
  }
  const effect: IPurchasesIdentityEffect =
    state.wanted == null ? { type: "logOut" } : { type: "logIn", userId: state.wanted };
  return { state: { ...state, inFlightFor: state.wanted }, effect };
}

export function PurchasesIdentity_want(state: IPurchasesIdentity, userId: string | undefined): IStep {
  return start({ ...state, wanted: userId ?? null });
}

export function PurchasesIdentity_finished(state: IPurchasesIdentity, ok: boolean): IStep {
  const ranFor = state.inFlightFor;
  if (ranFor === undefined) {
    return { state };
  }
  const next: IPurchasesIdentity = { wanted: state.wanted, done: ok ? ranFor : state.done };
  return ok || state.wanted !== ranFor ? start(next) : { state: next };
}

export function PurchasesIdentity_waitFor(state: IPurchasesIdentity, userId: string): "ready" | "wait" | "rejected" {
  if (state.wanted !== userId) {
    return "rejected";
  }
  if (state.inFlightFor !== undefined) {
    return "wait";
  }
  return state.done === userId ? "ready" : "rejected";
}
