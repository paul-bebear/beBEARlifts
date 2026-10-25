import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { IPaywallOutcome, IRestoreOutcome, PlusOffer_paywallOutcome } from "../models/plusOffer";
import {
  IPurchasesIdentity,
  IPurchasesIdentityEffect,
  PurchasesIdentity_finished,
  PurchasesIdentity_configuredWith,
  PurchasesIdentity_waitFor,
  PurchasesIdentity_want,
} from "../models/purchasesIdentity";
import { ForkServices_plan } from "./forkServices";
import { OfflineOnly_isEnabled } from "./offlineOnly";
import { Subscriptions_isUnlockedByFork } from "./subscriptions";
import { RevenueCat_iosApiKey } from "./revenueCatKey";

const entitlementId = "plus";
const identityWaitMs = 15_000;

let identity: IPurchasesIdentity | undefined;
const listeners = new Set<() => void>();

export function Purchases_isAvailable(): boolean {
  return (
    RevenueCat_iosApiKey !== "" &&
    ForkServices_plan(OfflineOnly_isEnabled(), Subscriptions_isUnlockedByFork(), Platform.OS === "ios").revenueCat
  );
}

function apply(step: { state: IPurchasesIdentity; effect?: IPurchasesIdentityEffect }): void {
  identity = step.state;
  listeners.forEach((listener) => listener());
  if (step.effect != null) {
    run(step.effect);
  }
}

function run(effect: IPurchasesIdentityEffect): void {
  const call = effect.type === "logIn" ? Purchases.logIn(effect.userId) : Purchases.logOut();
  call.then(
    () => identity != null && apply(PurchasesIdentity_finished(identity, true)),
    () => identity != null && apply(PurchasesIdentity_finished(identity, false))
  );
}

export function Purchases_configure(userId: string | undefined): void {
  if (identity != null || !Purchases_isAvailable()) {
    return;
  }
  Purchases.configure({ apiKey: RevenueCat_iosApiKey, appUserID: userId ?? null });
  identity = PurchasesIdentity_configuredWith(userId);
}

export function Purchases_identify(userId: string | undefined): void {
  if (identity != null) {
    apply(PurchasesIdentity_want(identity, userId));
  }
}

export function Purchases_whenReadyFor(userId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const check = (): boolean | undefined => {
      const answer = identity == null ? "rejected" : PurchasesIdentity_waitFor(identity, userId);
      return answer === "wait" ? undefined : answer === "ready";
    };
    const first = check();
    if (first != null) {
      resolve(first);
      return;
    }
    const timer = setTimeout(() => finish(false), identityWaitMs);
    const listener = (): void => {
      const answer = check();
      if (answer != null) {
        finish(answer);
      }
    };
    function finish(answer: boolean): void {
      clearTimeout(timer);
      listeners.delete(listener);
      resolve(answer);
    }
    listeners.add(listener);
  });
}

export async function Purchases_presentPaywall(): Promise<IPaywallOutcome> {
  if (identity == null) {
    return "unavailable";
  }
  try {
    return PlusOffer_paywallOutcome(await RevenueCatUI.presentPaywall({ displayCloseButton: true }));
  } catch {
    return "error";
  }
}

export async function Purchases_restore(): Promise<IRestoreOutcome> {
  if (identity == null) {
    return "error";
  }
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[entitlementId] != null ? "restored" : "none";
  } catch {
    return "error";
  }
}

export async function Purchases_manage(): Promise<void> {
  if (identity != null) {
    await Purchases.showManageSubscriptions().catch(() => undefined);
  }
}
