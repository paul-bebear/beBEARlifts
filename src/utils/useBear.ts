import { useEffect, useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import { Bear_state, IBearState } from "../models/bear";
import { BearCelebration_seed } from "../models/bearCelebration";
import { IBearStoreData } from "../models/bearStoreData";
import { Program_evaluate, Program_isEmpty } from "../models/program";
import { ProgressHub_plannedPerWeek } from "../models/progressHub";
import { BearStore } from "./bearStore";
import { useFoodLog } from "./foodLogStore";

export interface IBearView {
  state: IBearState;
  store: IBearStoreData;
  plannedPerWeek: number;
}

export function useBear(): IBearView {
  const tracked = useTrackedState();
  const history = untrack(tracked.storage.history);
  const stats = untrack(tracked.storage.stats);
  const settings = untrack(tracked.storage.settings);
  const currentProgramId = tracked.storage.currentProgramId;
  const program = untrack(
    currentProgramId != null ? tracked.storage.programs.find((p) => p.id === currentProgramId) : undefined
  );
  const foodLog = useFoodLog();
  const store = BearStore.use();
  const isFocused = useIsFocused();
  const plannedPerWeek = useMemo(
    () =>
      ProgressHub_plannedPerWeek(
        program != null && !Program_isEmpty(program) ? Program_evaluate(program, settings).weeks : undefined
      ),
    [program, settings]
  );
  const state = useMemo(
    () =>
      Bear_state(
        {
          history,
          foodLog,
          stats,
          settings,
          plannedDaysPerWeek: plannedPerWeek,
          bear: store,
          defaultLine: foodLog.profile.sex,
        },
        Date.now()
      ),
    [history, foodLog, stats, settings, plannedPerWeek, store, isFocused]
  );
  useEffect(() => {
    BearStore.update((saved) => BearCelebration_seed(saved, state.countedKg)).catch(() => undefined);
  }, []);
  return { state, store, plannedPerWeek };
}
