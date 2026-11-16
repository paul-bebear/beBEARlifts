import { useMemo } from "react";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import { BearHouse_objects, BearHouse_sources } from "../models/bearHouse";
import { BearHouseView_pick, IBearHouseView } from "../models/bearHouseView";
import { Friends_forUser, Friends_lists } from "../models/friends";
import { useFoodLog } from "./foodLogStore";
import { FriendsStore } from "./friendsClient";
import { CloudStore } from "./supabaseClient";

export function useBearHouse(hasWorkout: boolean, level: number): IBearHouseView {
  const tracked = useTrackedState();
  const stats = untrack(tracked.storage.stats);
  const units = untrack(tracked.storage.settings).units;
  const foodLog = useFoodLog();
  const userId = CloudStore.use().session?.userId;
  const pendingRequests = Friends_lists(Friends_forUser(FriendsStore.use(), userId)).incoming.length;
  return useMemo(() => {
    const sources = BearHouse_sources({
      foodLog,
      stats,
      units,
      pendingRequests,
      hasWorkout,
      now: Date.now(),
    });
    return BearHouseView_pick({ hasWorkout, level, objects: BearHouse_objects(sources, undefined) });
  }, [foodLog, stats, units, pendingRequests, hasWorkout, level]);
}
