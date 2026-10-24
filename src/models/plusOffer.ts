import { AiCaps_plus, IAiCapsRefusal } from "./aiCaps";
import { IAccountPlanState, IAccountPlanSync } from "./accountPlan";

export type IPaywallOutcome = "purchased" | "restored" | "cancelled" | "notPresented" | "error" | "unavailable";
export type IRestoreOutcome = "restored" | "none" | "error";
export type IPlusOfferTrigger = "settings" | "restore" | "firstProgram" | "aiLimit";

export interface IPlusOfferFlow {
  step:
    | "idle"
    | "waiting"
    | "askingCap"
    | "askingSignIn"
    | "signingIn"
    | "identifying"
    | "presenting"
    | "restoring"
    | "activating";
  trigger?: IPlusOfferTrigger;
  userId?: string;
}

export type IPlusOfferEvent =
  | { type: "open"; trigger: "settings" | "restore"; userId: string | undefined }
  | { type: "firstProgram" }
  | { type: "waited"; eligible: boolean; userId: string | undefined }
  | { type: "capRefused"; refusal: IAiCapsRefusal; userId: string; memory: IPlusOfferMemory; today: string }
  | { type: "capChoice"; see: boolean }
  | { type: "signInChoice"; provider?: "apple" | "google" }
  | { type: "signedIn"; userId?: string; error?: string }
  | { type: "identified"; ready: boolean }
  | { type: "paywallClosed"; outcome: IPaywallOutcome }
  | { type: "restoreDone"; outcome: IRestoreOutcome }
  | { type: "synced"; result: IAccountPlanSync }
  | { type: "failed" };

export type IPlusOfferEffect =
  | { type: "wait"; ms: number }
  | { type: "askCap"; title: string }
  | { type: "rememberCapDay"; userId: string; day: string }
  | { type: "askSignIn" }
  | { type: "signIn"; provider: "apple" | "google" }
  | { type: "identify"; userId: string }
  | { type: "presentPaywall" }
  | { type: "restore" }
  | { type: "markFirstProgramShown" }
  | { type: "markActivating"; userId: string }
  | { type: "sync" }
  | { type: "alert"; message: string };

export interface IPlusOfferStep {
  state: IPlusOfferFlow;
  effects: IPlusOfferEffect[];
}

export const PlusOffer_afterNavigationMs = 800;

const outcomeByPaywallResult: Record<string, IPaywallOutcome> = {
  PURCHASED: "purchased",
  RESTORED: "restored",
  CANCELLED: "cancelled",
  NOT_PRESENTED: "notPresented",
  ERROR: "error",
};

export function PlusOffer_paywallOutcome(paywallResult: string): IPaywallOutcome {
  return outcomeByPaywallResult[paywallResult] ?? "error";
}

export interface IPlusOfferMemory {
  firstProgramShown?: boolean;
  capSheetDays?: Record<string, string>;
}

export const PlusOffer_signInTitle = "beBEAR+ is linked to your account, so your AI uses follow you to every device.";
export const PlusOffer_signInOptions = ["Sign in with Apple", "Sign in with Google", "Not now"];
export const PlusOffer_capSheetOptions = ["See beBEAR+", "Not now"];
export const PlusOffer_startFailed = "beBEAR+ could not start. Check your connection and try again.";
export const PlusOffer_activating = "Purchase done. beBEAR+ turns on in a moment. Reopen the app if it does not.";
export const PlusOffer_restoredMessage = "beBEAR+ is back on.";
export const PlusOffer_nothingToRestore = "No beBEAR+ purchase was found for this Apple ID.";
export const PlusOffer_restoreFailed = "Restore did not finish. Check your connection and try again.";

export function PlusOffer_parseMemory(raw: unknown): IPlusOfferMemory {
  const r = (raw ?? {}) as Record<string, unknown>;
  const days = (r.capSheetDays ?? {}) as Record<string, unknown>;
  const capSheetDays = Object.fromEntries(Object.entries(days).filter(([, day]) => typeof day === "string")) as Record<
    string,
    string
  >;
  return {
    ...(r.firstProgramShown === true ? { firstProgramShown: true } : {}),
    ...(Object.keys(capSheetDays).length > 0 ? { capSheetDays } : {}),
  };
}

export function PlusOffer_rememberCapDay(memory: IPlusOfferMemory, userId: string, day: string): IPlusOfferMemory {
  return { ...memory, capSheetDays: { ...memory.capSheetDays, [userId]: day } };
}

export function PlusOffer_afterFirstProgram(input: {
  hasProgram: boolean;
  available: boolean;
  userId: string | undefined;
  plan: IAccountPlanState;
  shownBefore: boolean;
}): boolean {
  const { plan } = input;
  const freeForThisUser = plan.status === "known" && plan.userId === input.userId && plan.plan === "free";
  return input.hasProgram && input.available && !input.shownBefore && freeForThisUser;
}

export function PlusOffer_fromRefusal(refusal: IAiCapsRefusal | undefined): boolean {
  return refusal != null && (refusal.reason === "day" || refusal.reason === "week") && refusal.plan === "free";
}

export function PlusOffer_day(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function PlusOffer_capSheetDue(lastDay: string | undefined, today: string): boolean {
  return lastDay !== today;
}

export function PlusOffer_capSheetTitle(refusal: IAiCapsRefusal): string {
  if (refusal.reason === "week") {
    return `You used this week's ${refusal.caps.week} AI uses. beBEAR+ gives ${AiCaps_plus.week} a week.`;
  }
  if (refusal.reason === "day") {
    return `You used today's ${refusal.caps.day} AI uses. beBEAR+ gives ${AiCaps_plus.day} a day.`;
  }
  return `beBEAR+ gives ${AiCaps_plus.day} AI uses a day.`;
}

const idle: IPlusOfferFlow = { step: "idle" };

export function PlusOffer_idle(): IPlusOfferFlow {
  return idle;
}

function to(state: IPlusOfferFlow, ...effects: IPlusOfferEffect[]): IPlusOfferStep {
  return { state, effects };
}

function stay(state: IPlusOfferFlow): IPlusOfferStep {
  return { state, effects: [] };
}

function identify(flow: IPlusOfferFlow, userId: string): IPlusOfferStep {
  return to({ step: "identifying", trigger: flow.trigger, userId }, { type: "identify", userId });
}

// The first-program offer was not asked for, so it fails without a message and stays unshown for next time.
function fail(flow: IPlusOfferFlow, message: string): IPlusOfferStep {
  return flow.trigger === "firstProgram" ? to(idle) : to(idle, { type: "alert", message });
}

function activate(flow: IPlusOfferFlow): IPlusOfferStep {
  const userId = flow.userId ?? "";
  return to({ ...flow, step: "activating" }, { type: "markActivating", userId }, { type: "sync" });
}

function start(flow: IPlusOfferFlow, event: IPlusOfferEvent): IPlusOfferStep {
  switch (event.type) {
    case "open": {
      const next: IPlusOfferFlow = { step: "askingSignIn", trigger: event.trigger };
      return event.userId == null ? to(next, { type: "askSignIn" }) : identify(next, event.userId);
    }
    case "firstProgram":
      return to({ step: "waiting", trigger: "firstProgram" }, { type: "wait", ms: PlusOffer_afterNavigationMs });
    case "capRefused": {
      const due = PlusOffer_capSheetDue(event.memory.capSheetDays?.[event.userId], event.today);
      if (!PlusOffer_fromRefusal(event.refusal) || !due) {
        return stay(flow);
      }
      return to(
        { step: "askingCap", trigger: "aiLimit", userId: event.userId },
        { type: "rememberCapDay", userId: event.userId, day: event.today },
        { type: "askCap", title: PlusOffer_capSheetTitle(event.refusal) }
      );
    }
    default:
      return stay(flow);
  }
}

function afterPaywall(flow: IPlusOfferFlow, outcome: IPaywallOutcome): IPlusOfferStep {
  const shown = outcome === "purchased" || outcome === "restored" || outcome === "cancelled";
  const marks: IPlusOfferEffect[] = flow.trigger === "firstProgram" && shown ? [{ type: "markFirstProgramShown" }] : [];
  if (outcome === "purchased" || outcome === "restored") {
    const next = activate(flow);
    return to(next.state, ...marks, ...next.effects);
  }
  if (outcome === "cancelled" || outcome === "notPresented") {
    return to(idle, ...marks);
  }
  return fail(flow, PlusOffer_startFailed);
}

function afterSync(flow: IPlusOfferFlow, result: IAccountPlanSync): IPlusOfferStep {
  const restoring = flow.trigger === "restore";
  if (result === "plus") {
    return restoring ? to(idle, { type: "alert", message: PlusOffer_restoredMessage }) : to(idle);
  }
  if (result === "stale") {
    return to(idle);
  }
  return to(idle, {
    type: "alert",
    message: result === "free" && restoring ? PlusOffer_nothingToRestore : PlusOffer_activating,
  });
}

export function PlusOffer_reduce(flow: IPlusOfferFlow, event: IPlusOfferEvent): IPlusOfferStep {
  if (event.type === "failed") {
    return to(idle);
  }
  if (flow.step === "idle") {
    return start(flow, event);
  }
  switch (event.type) {
    case "waited":
      if (flow.step !== "waiting") {
        return stay(flow);
      }
      return event.eligible && event.userId != null ? identify(flow, event.userId) : to(idle);
    case "capChoice":
      if (flow.step !== "askingCap") {
        return stay(flow);
      }
      return event.see && flow.userId != null ? identify(flow, flow.userId) : to(idle);
    case "signInChoice":
      if (flow.step !== "askingSignIn") {
        return stay(flow);
      }
      return event.provider == null
        ? to(idle)
        : to({ ...flow, step: "signingIn" }, { type: "signIn", provider: event.provider });
    case "signedIn":
      if (flow.step !== "signingIn") {
        return stay(flow);
      }
      if (event.error != null) {
        return to(idle, { type: "alert", message: event.error });
      }
      return event.userId == null ? to(idle) : identify(flow, event.userId);
    case "identified":
      if (flow.step !== "identifying") {
        return stay(flow);
      }
      if (!event.ready) {
        return fail(flow, PlusOffer_startFailed);
      }
      return flow.trigger === "restore"
        ? to({ ...flow, step: "restoring" }, { type: "restore" })
        : to({ ...flow, step: "presenting" }, { type: "presentPaywall" });
    case "paywallClosed":
      return flow.step === "presenting" ? afterPaywall(flow, event.outcome) : stay(flow);
    case "restoreDone":
      if (flow.step !== "restoring") {
        return stay(flow);
      }
      if (event.outcome === "restored") {
        return activate(flow);
      }
      return to(idle, {
        type: "alert",
        message: event.outcome === "none" ? PlusOffer_nothingToRestore : PlusOffer_restoreFailed,
      });
    case "synced":
      return flow.step === "activating" ? afterSync(flow, event.result) : stay(flow);
    default:
      return stay(flow);
  }
}
