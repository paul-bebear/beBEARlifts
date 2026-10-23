import { useEffect } from "react";
import { IDispatch } from "../ducks/types";
import { EditProgram_setNextDay } from "../models/editProgram";
import { FoodLog_dayKey } from "../models/foodLog";
import { IEvaluatedProgram } from "../models/program";
import { WeekSchedule_follow, WeekSchedule_workedOutToday } from "../models/weekSchedule";
import { WeekScheduleStore } from "./weekScheduleStore";

export function useFollowWeekSchedule(
  program: IEvaluatedProgram,
  history: { startTime: number }[],
  hasProgress: boolean,
  dispatch: IDispatch
): void {
  const today = FoodLog_dayKey(new Date());
  const workedOutToday = WeekSchedule_workedOutToday(history, Date.now());
  useEffect(() => {
    let nextDay: number | undefined;
    const opts = { now: Date.now(), workedOutToday, hasProgress };
    // The decision reads the saved log inside update, because the in-memory copy may not be loaded yet.
    WeekScheduleStore.update((log) => {
      const step = WeekSchedule_follow(log, program, opts);
      nextDay = step?.nextDay;
      return step?.log ?? log;
    })
      .then(() => {
        if (nextDay != null && nextDay !== program.nextDay) {
          EditProgram_setNextDay(dispatch, program.id, nextDay);
        }
      })
      .catch(() => undefined);
  }, [today, program.id, workedOutToday, hasProgress]);
}
