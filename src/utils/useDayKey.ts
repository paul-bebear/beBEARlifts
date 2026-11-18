import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { DayKey_at, DayKey_next } from "../models/dayKey";

export function useDayKey(): string {
  const [dayKey, setDayKey] = useState(() => DayKey_at(Date.now()));
  const isFocused = useIsFocused();
  useEffect(() => {
    setDayKey((current) => DayKey_next(current, Date.now()));
  }, [isFocused]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        setDayKey((current) => DayKey_next(current, Date.now()));
      }
    });
    return () => subscription.remove();
  }, []);
  return dayKey;
}
