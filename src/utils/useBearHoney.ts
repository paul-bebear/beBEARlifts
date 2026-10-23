import { useEffect, useMemo } from "react";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import {
  BearHoney_balance,
  BearHoney_day,
  BearHoney_earned,
  BearHoney_sharedAt,
  BearHoney_sharedPosts,
  BearHoney_recordShares,
  IHoneyDay,
  IHoneySources,
} from "../models/bearHoney";
import { FoodLog_dayKey } from "../models/foodLog";
import { FeedStore } from "./feedClient";
import { useFoodLog } from "./foodLogStore";
import { useBear } from "./useBear";
import { BearStore } from "./bearStore";
import { IBearState } from "../models/bear";
import { IBearStoreData } from "../models/bearStoreData";

export interface IBearHoneyView {
  balance: number;
  earned: number;
  state: IBearState;
  store: IBearStoreData;
  today?: IHoneyDay;
  sources: IHoneySources;
}

export function useBearHoney(): IBearHoneyView {
  const tracked = useTrackedState();
  const stats = untrack(tracked.storage.stats);
  const foodLog = useFoodLog();
  const feed = FeedStore.use();
  const { state, store } = useBear();
  useEffect(() => {
    BearStore.update((saved) => BearHoney_recordShares(saved, BearHoney_sharedPosts(feed))).catch(() => undefined);
  }, [feed]);
  const sources = useMemo<IHoneySources>(
    () => ({ workouts: state.workouts, stats, foodLog, sharedAt: BearHoney_sharedAt(feed, store.sharedPosts) }),
    [state.workouts, stats, foodLog, feed, store.sharedPosts]
  );
  return useMemo(() => {
    const now = Date.now();
    const earned = BearHoney_earned(sources, now);
    return {
      earned: earned.total,
      state,
      store,
      balance: BearHoney_balance(earned.total, store.spent),
      today: BearHoney_day(earned, FoodLog_dayKey(new Date(now))),
      sources,
    };
  }, [sources, state, store]);
}
