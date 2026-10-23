import { useCallback, useEffect, useMemo, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import {
  BearBadges_compute,
  BearBadges_grid,
  BearBadges_info,
  IBearBadge,
  IBearBadgeGrid,
  IBearBadgeInfo,
} from "../models/bearBadges";
import { BadgeCelebration_step } from "../models/badgeCelebration";
import { IBearTierSet } from "../models/bearTier";
import { DailyChecklist_doneDays, DailyChecklist_streak } from "../models/dailyChecklist";
import { FoodLog_dayKey } from "../models/foodLog";
import { History_getPersonalRecords } from "../models/history";
import { BearStore } from "./bearStore";
import { FoodLogStore_load, useFoodLog } from "./foodLogStore";
import { useBear } from "./useBear";

export interface IBearBadgesView {
  badges: IBearBadge[];
  grid: IBearBadgeGrid;
  doneDays: Set<string>;
  coveredDays: Set<string>;
  streak: number;
  today: string;
  countedKg: number;
  tierSet: IBearTierSet;
}

export function useBearBadges(): IBearBadgesView {
  const tracked = useTrackedState();
  const history = untrack(tracked.storage.history);
  const foodLog = useFoodLog();
  const { state, store } = useBear();
  const today = FoodLog_dayKey(new Date());
  const prs = useMemo(() => History_getPersonalRecords(history), [history]);
  const doneDays = useMemo(
    () => DailyChecklist_doneDays({ foodLog, workouts: state.workouts, coveredDays: store.coveredDays }),
    [foodLog, state.workouts, store.coveredDays]
  );
  const coveredDays = useMemo(() => new Set(store.coveredDays), [store.coveredDays]);
  const badges = useMemo(
    () => BearBadges_compute({ history, prs, doneDays, foodLog, workouts: state.workouts, tierSet: state.tierSet }),
    [history, prs, doneDays, foodLog, state.workouts, state.tierSet]
  );
  const grid = useMemo(() => BearBadges_grid(badges), [badges]);
  const streak = useMemo(() => DailyChecklist_streak(doneDays, today), [doneDays, today]);
  return { badges, grid, doneDays, coveredDays, streak, today, countedKg: state.countedKg, tierSet: state.tierSet };
}

export interface IBadgeCelebration {
  badge?: IBearBadgeInfo;
  dismiss: (showNext: boolean) => void;
}

export function useBadgeCelebration(): IBadgeCelebration {
  const { badges, countedKg, tierSet } = useBearBadges();
  const isFocused = useIsFocused();
  const [isLoaded, setIsLoaded] = useState(false);
  const [shown, setShown] = useState<IBearBadgeInfo | undefined>(undefined);
  const [round, setRound] = useState(0);
  const badgeKey = badges.map((b) => b.id).join(",");

  useEffect(() => {
    Promise.all([FoodLogStore_load(), BearStore.load()])
      .then(() => setIsLoaded(true))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isFocused || shown != null) {
      return;
    }
    let next: IBearBadge | undefined;
    BearStore.update((saved) => {
      const step = BadgeCelebration_step(badges, saved, countedKg, tierSet);
      next = step.badge;
      return step.store;
    })
      .then(() => setShown(next == null ? undefined : BearBadges_info(next.id)))
      .catch(() => undefined);
  }, [isLoaded, isFocused, badgeKey, countedKg, tierSet, round, shown == null]);

  const dismiss = useCallback((showNext: boolean) => {
    setShown(undefined);
    if (showNext) {
      setRound((r) => r + 1);
    }
  }, []);
  return { badge: shown, dismiss };
}
