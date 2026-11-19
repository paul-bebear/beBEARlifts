import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import {
  DayClock_refresh,
  DayClock_refreshesOnFocus,
  DayClock_start,
  DayClock_timerDelay,
  IDayClock,
} from "../models/dayClock";

export function useDayClock(): IDayClock {
  const [clock, setClock] = useState(() => DayClock_start(Date.now()));
  const isFocused = useIsFocused();
  const wasFocused = useRef(isFocused);
  useEffect(() => {
    if (DayClock_refreshesOnFocus(wasFocused.current, isFocused)) {
      setClock((current) => DayClock_refresh(current, Date.now()));
    }
    wasFocused.current = isFocused;
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
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delayMs: number): void => {
      timer = setTimeout(() => {
        const now = Date.now();
        setClock((current) => DayClock_refresh(current, now));
        schedule(DayClock_timerDelay(now));
      }, delayMs);
    };
    schedule(DayClock_timerDelay(Date.now()));
    return () => clearTimeout(timer);
  }, []);
  return clock;
}
