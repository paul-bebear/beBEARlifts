import { IPaywallOutcome, IRestoreOutcome } from "../models/plusOffer";

export function Purchases_isAvailable(): boolean {
  return false;
}

export function Purchases_configure(_userId: string | undefined): void {
  return;
}

export function Purchases_identify(_userId: string | undefined): void {
  return;
}

export async function Purchases_whenReadyFor(_userId: string): Promise<boolean> {
  return false;
}

export async function Purchases_presentPaywall(): Promise<IPaywallOutcome> {
  return "unavailable";
}

export async function Purchases_restore(): Promise<IRestoreOutcome> {
  return "error";
}

export async function Purchases_manage(): Promise<void> {
  return;
}
