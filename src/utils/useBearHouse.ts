import { useMemo } from "react";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import {
  BearHouse_objects,
  BearHouse_room,
  BearHouse_sources,
  BearHouse_wallColor,
  IBearHouseObject,
  IBearHouseTier,
} from "../models/bearHouse";
import { Friends_forUser, Friends_lists } from "../models/friends";
import { useFoodLog } from "./foodLogStore";
import { FriendsStore } from "./friendsClient";
import { CloudStore } from "./supabaseClient";

export interface IBearHouseView {
  room: string;
  wall: string;
  objects: IBearHouseObject[];
}

const houseTier: IBearHouseTier = "cabin";

export function useBearHouse(hasWorkout: boolean): IBearHouseView {
  const tracked = useTrackedState();
  const stats = untrack(tracked.storage.stats);
  const units = untrack(tracked.storage.settings).units;
  const foodLog = useFoodLog();
  const userId = CloudStore.use().session?.userId;
  const pendingRequests = Friends_lists(Friends_forUser(FriendsStore.use(), userId)).incoming.length;
  const objects = useMemo(() => {
    const sources = BearHouse_sources({
      foodLog,
      stats,
      units,
      pendingRequests,
      hasWorkout,
      now: Date.now(),
    });
    return BearHouse_objects(houseTier, sources, undefined);
  }, [foodLog, stats, units, pendingRequests, hasWorkout]);
  return { room: BearHouse_room(houseTier), wall: BearHouse_wallColor(houseTier), objects };
}
