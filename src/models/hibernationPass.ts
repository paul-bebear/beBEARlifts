import { IBearStoreData, IPendingWake } from "./bearStoreData";
import { BearHoney_balance, BearHoney_earned, IHoneySources } from "./bearHoney";
import { DailyChecklist_streak } from "./dailyChecklist";
import { FoodLog_shiftDay } from "./foodLog";

export const HibernationPass_price = 25;
export const HibernationPass_holdLimit = 2;
export const HibernationPass_minimumStreak = 3;

export type IHibernationRefusal = "full" | "honey";

export function HibernationPass_settle(
  store: IBearStoreData,
  doneDays: ReadonlySet<string>,
  today: string
): { store: IBearStoreData; covered: string[] } {
  const days = new Set([...doneDays, ...store.coveredDays]);
  const last = [...days]
    .filter((day) => day < today)
    .sort()
    .at(-1);
  if (last == null || store.passes === 0) {
    return { store, covered: [] };
  }
  const covered: string[] = [];
  for (let day = FoodLog_shiftDay(last, 1); day < today; day = FoodLog_shiftDay(day, 1)) {
    covered.push(day);
    if (covered.length > store.passes) {
      return { store, covered: [] };
    }
  }
  if (covered.length === 0 || DailyChecklist_streak(days, last) < HibernationPass_minimumStreak) {
    return { store, covered: [] };
  }
  const coveredDays = [...new Set([...store.coveredDays, ...covered])].sort().slice(-400);
  const streak = DailyChecklist_streak(new Set([...days, ...covered]), today);
  return {
    store: { ...store, passes: store.passes - covered.length, coveredDays, pendingWake: { days: covered, streak } },
    covered,
  };
}

export function HibernationPass_buy(
  store: IBearStoreData,
  balance: number
): { store: IBearStoreData; refusal?: IHibernationRefusal } {
  if (store.passes >= HibernationPass_holdLimit) {
    return { store, refusal: "full" };
  }
  if (balance < HibernationPass_price) {
    return { store, refusal: "honey" };
  }
  return { store: { ...store, passes: store.passes + 1, spent: store.spent + HibernationPass_price } };
}

export function HibernationPass_purchase(store: IBearStoreData, sources: IHoneySources, now: number): IBearStoreData {
  const earned = BearHoney_earned({ ...sources, coveredDays: store.coveredDays }, now);
  return HibernationPass_buy(store, BearHoney_balance(earned.total, store.spent)).store;
}

export function HibernationPass_offer(store: IBearStoreData, balance: number): { disabled: boolean; label: string } {
  const { refusal } = HibernationPass_buy(store, balance);
  const label =
    refusal === "full"
      ? "You hold 2, the most."
      : refusal === "honey"
        ? `You need 25 honey. You have ${balance}.`
        : "Buy a pass · 25 honey";
  return { disabled: refusal != null, label };
}

export function HibernationPass_wakeText(
  pendingWake: IPendingWake,
  passesLeft: number
): { title: string; body: string; button: string } {
  const slept = pendingWake.days.length === 1 ? "yesterday" : `${pendingWake.days.length} days`;
  const passes = `${passesLeft} ${passesLeft === 1 ? "pass" : "passes"} left.`;
  return {
    title: "Your bear hibernated",
    body: `It slept through ${slept}, so your ${pendingWake.streak}-day streak is safe. ${passes}`,
    button: "Good morning",
  };
}

export function HibernationPass_dismiss(store: IBearStoreData, wake: IPendingWake): IBearStoreData {
  if (JSON.stringify(store.pendingWake) !== JSON.stringify(wake)) {
    return store;
  }
  const { pendingWake, ...rest } = store;
  return rest;
}
