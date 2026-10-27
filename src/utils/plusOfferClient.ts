import { IAiCapsRefusal } from "../models/aiCaps";
import {
  IPlusOfferEffect,
  IPlusOfferEvent,
  IPlusOfferMemory,
  PlusOffer_afterFirstProgram,
  PlusOffer_capSheetOptions,
  PlusOffer_day,
  PlusOffer_idle,
  PlusOffer_parseMemory,
  PlusOffer_reduce,
  PlusOffer_rememberCapDay,
  PlusOffer_signInOptions,
  PlusOffer_signInTitle,
} from "../models/plusOffer";
import { AccountPlanClient_markActivating, AccountPlanClient_sync, AccountPlanStore } from "./accountPlanClient";
import { ActionSheet_show } from "./actionSheet";
import { Dialog_alert } from "./dialog";
import { JsonStore_create } from "./jsonStore";
import {
  Purchases_identify,
  Purchases_isAvailable,
  Purchases_presentPaywall,
  Purchases_restore,
  Purchases_whenReadyFor,
} from "./purchases";
import { CloudStore } from "./supabaseClient";
import { SupabaseOAuth_start } from "./supabaseOAuth";

export const PlusOfferStore = JsonStore_create<IPlusOfferMemory>(
  "bebear_plus_offer",
  PlusOffer_parseMemory,
  () => ({})
);

let flow = PlusOffer_idle();

function choose(title: string, options: string[]): Promise<number | undefined> {
  return new Promise((resolve) => {
    ActionSheet_show({ title, options, cancelButtonIndex: options.length - 1 }, resolve);
  });
}

async function sessionUserId(): Promise<string | undefined> {
  return (await CloudStore.load()).session?.userId;
}

async function perform(effect: IPlusOfferEffect): Promise<IPlusOfferEvent | undefined> {
  switch (effect.type) {
    case "wait": {
      await new Promise((resolve) => setTimeout(resolve, effect.ms));
      const userId = await sessionUserId();
      const memory = await PlusOfferStore.load();
      const eligible = PlusOffer_afterFirstProgram({
        hasProgram: true,
        available: Purchases_isAvailable(),
        userId,
        plan: AccountPlanStore.get(),
        shownBefore: memory.firstProgramShown === true,
      });
      return { type: "waited", eligible, userId };
    }
    case "askCap":
      return { type: "capChoice", see: (await choose(effect.title, PlusOffer_capSheetOptions)) === 0 };
    case "rememberCapDay":
      await PlusOfferStore.update((m) => PlusOffer_rememberCapDay(m, effect.userId, effect.day));
      return undefined;
    case "askSignIn": {
      const index = await choose(PlusOffer_signInTitle, PlusOffer_signInOptions);
      return { type: "signInChoice", provider: index === 0 ? "apple" : index === 1 ? "google" : undefined };
    }
    case "signIn": {
      const result = await SupabaseOAuth_start(effect.provider);
      return result.ok
        ? { type: "signedIn", userId: await sessionUserId() }
        : { type: "signedIn", error: result.error };
    }
    case "identify":
      Purchases_identify(effect.userId);
      return { type: "identified", ready: await Purchases_whenReadyFor(effect.userId) };
    case "presentPaywall":
      return { type: "paywallClosed", outcome: await Purchases_presentPaywall() };
    case "restore":
      return { type: "restoreDone", outcome: await Purchases_restore() };
    case "markFirstProgramShown":
      await PlusOfferStore.update((m) => ({ ...m, firstProgramShown: true }));
      return undefined;
    case "markActivating":
      await AccountPlanClient_markActivating(effect.userId);
      return undefined;
    case "sync":
      return { type: "synced", result: await AccountPlanClient_sync() };
    case "alert":
      Dialog_alert(effect.message);
      return undefined;
  }
}

async function runEffects(effects: IPlusOfferEffect[]): Promise<void> {
  for (const effect of effects) {
    const next = await perform(effect);
    if (next != null) {
      dispatch(next);
    }
  }
}

const idleListeners = new Set<() => void>();

export function PlusOfferClient_isBusy(): boolean {
  return flow.step !== "idle";
}

export function PlusOfferClient_onIdle(listener: () => void): () => void {
  idleListeners.add(listener);
  return () => {
    idleListeners.delete(listener);
  };
}

function dispatch(event: IPlusOfferEvent): void {
  const step = PlusOffer_reduce(flow, event);
  flow = step.state;
  if (flow.step === "idle") {
    idleListeners.forEach((listener) => listener());
  }
  if (step.effects.length > 0) {
    runEffects(step.effects).catch(() => dispatch({ type: "failed" }));
  }
}

function whenAvailable(task: () => Promise<void>): void {
  if (Purchases_isAvailable()) {
    task().catch(() => undefined);
  }
}

export function PlusOfferClient_open(): void {
  whenAvailable(async () => dispatch({ type: "open", trigger: "settings", userId: await sessionUserId() }));
}

export function PlusOfferClient_restore(): void {
  whenAvailable(async () => dispatch({ type: "open", trigger: "restore", userId: await sessionUserId() }));
}

export function PlusOfferClient_offerFirstProgram(): void {
  whenAvailable(async () => dispatch({ type: "firstProgram" }));
}

export function PlusOfferClient_onRefusal(refusal: IAiCapsRefusal): void {
  whenAvailable(async () => {
    const userId = await sessionUserId();
    if (userId != null) {
      const memory = await PlusOfferStore.load();
      dispatch({ type: "capRefused", refusal, userId, memory, today: PlusOffer_day(new Date()) });
    }
  });
}
