import { useMemo } from "react";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import {
  BearHoney_balance,
  BearHoney_day,
  BearHoney_earned,
  BearHoney_sharedAt,
  IHoneyDay,
  IHoneySources,
} from "../models/bearHoney";
import { FoodLog_dayKey } from "../models/foodLog";
import { FeedStore } from "./feedClient";
import { useFoodLog } from "./foodLogStore";
import { useBear } from "./useBear";

export interface IBearHoneyView {
  balance: number;
  today?: IHoneyDay;
  sources: IHoneySources;
}

export function useBearHoney(): IBearHoneyView {
  const tracked = useTrackedState();
  const stats = untrack(tracked.storage.stats);
  const foodLog = useFoodLog();
  const feed = FeedStore.use();
  const { state, store } = useBear();
  const sources = useMemo<IHoneySources>(
    () => ({
      workouts: state.workouts,
      stats,
      foodLog,
      sharedAt: BearHoney_sharedAt(feed),
      coveredDays: store.coveredDays,
    }),
    [state.workouts, stats, foodLog, feed, store.coveredDays]
  );
  return useMemo(() => {
    const now = Date.now();
    const earned = BearHoney_earned(sources, now);
    return {
      balance: BearHoney_balance(earned.total, store.spent),
      today: BearHoney_day(earned, FoodLog_dayKey(new Date(now))),
      sources,
    };
  }, [sources, store.spent]);
}
