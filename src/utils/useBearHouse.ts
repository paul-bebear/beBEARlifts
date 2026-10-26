import { useMemo } from "react";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import {
  BearHouse_activeDays,
  BearHouse_objects,
  BearHouse_room,
  BearHouse_sources,
  IBearHouseObject,
  IBearHouseTier,
} from "../models/bearHouse";
import { Friends_forUser, Friends_lists } from "../models/friends";
import { useFoodLog } from "./foodLogStore";
import { FriendsStore } from "./friendsClient";
import { NotesStore } from "./notesStore";
import { OfflineOnly_isEnabled } from "./offlineOnly";
import { CloudStore } from "./supabaseClient";
import { useBear } from "./useBear";
import { useBearBadges } from "./useBearBadges";
import { IBearHoneyView, useBearHoney } from "./useBearHoney";

export interface IBearHouseView {
  room: string;
  objects: IBearHouseObject[];
  honey: IBearHoneyView;
}

// The house ladder lands in H2 with houseTier.ts. Until then every account lives in the trailer.
const houseTier: IBearHouseTier = "trailer";

export function useBearHouse(): IBearHouseView {
  const tracked = useTrackedState();
  const stats = untrack(tracked.storage.stats);
  const units = untrack(tracked.storage.settings).units;
  const foodLog = useFoodLog();
  const notes = NotesStore.use();
  const { state } = useBear();
  const honey = useBearHoney();
  const { badges } = useBearBadges();
  const userId = CloudStore.use().session?.userId;
  const friends = Friends_lists(Friends_forUser(FriendsStore.use(), userId));
  const friendCount = friends.friends.length;
  const pendingRequests = friends.incoming.length;
  const objects = useMemo(() => {
    const now = Date.now();
    const sources = BearHouse_sources({
      workouts: state.workouts,
      foodLog,
      stats,
      notes,
      units,
      friendCount,
      pendingRequests,
      honeyEarned: honey.earned,
      badgeCount: badges.length,
      isOffline: OfflineOnly_isEnabled(),
      now,
    });
    const activeDays = BearHouse_activeDays({ workouts: state.workouts, foodLog, stats });
    return BearHouse_objects(houseTier, activeDays, sources, undefined);
  }, [state.workouts, foodLog, stats, notes, units, friendCount, pendingRequests, honey.earned, badges.length]);
  return { room: BearHouse_room(houseTier), objects, honey };
}
