import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { DayClock_msToMidnight, DayClock_refresh, DayClock_start, IDayClock } from "../models/dayKey";

export function useDayKey(): IDayClock {
  const [clock, setClock] = useState(() => DayClock_start(Date.now()));
  const isFocused = useIsFocused();
  useEffect(() => {
    setClock((current) => DayClock_refresh(current, Date.now()));
  }, [isFocused]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        setClock((current) => DayClock_refresh(current, Date.now()));
      }
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () => setClock((current) => DayClock_refresh(current, Date.now())),
      DayClock_msToMidnight(Date.now()) + 1000
    );
    return () => clearTimeout(timer);
  }, [clock.dayKey]);
  return clock;
}
