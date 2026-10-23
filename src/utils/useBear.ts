import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import { Bear_state, IBearState } from "../models/bear";
import { BearCelebration_seed } from "../models/bearCelebration";
import { BearGrowth_history } from "../models/bearGrowth";
import { DailyChecklist_doneDays } from "../models/dailyChecklist";
import { FoodLog_dayKey } from "../models/foodLog";
import { HibernationPass_settle } from "../models/hibernationPass";
import { IBearStoreData } from "../models/bearStoreData";
import { BearTier_setFor } from "../models/bearTier";
import { Program_evaluate, Program_isEmpty } from "../models/program";
import { ProgressHub_plannedPerWeek } from "../models/progressHub";
import { BearStore } from "./bearStore";
import { FoodLogStore_get, FoodLogStore_load, FoodLogStore_update, useFoodLog } from "./foodLogStore";

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
    FoodLogStore_load()
      .then((log) =>
        BearStore.update((saved) =>
          BearCelebration_seed(saved, state.countedKg, BearTier_setFor(log.profile.sex, saved.line))
        )
      )
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!isFocused) {
      return;
    }
    const settle = (): void => {
      FoodLogStore_update((log) => log)
        .then(() =>
          BearStore.update(
            (saved) =>
              HibernationPass_settle(
                saved,
                DailyChecklist_doneDays({
                  foodLog: FoodLogStore_get(),
                  workouts: BearGrowth_history(history, settings, stats).workouts,
                }),
                FoodLog_dayKey(new Date())
              ).store
          )
        )
        .catch(() => undefined);
    };
    settle();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        settle();
      }
    });
    return () => subscription.remove();
  }, [history, settings, stats, isFocused]);
  return { state, store, plannedPerWeek };
}
