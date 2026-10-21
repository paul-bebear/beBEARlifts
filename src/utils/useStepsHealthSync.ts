import { useEffect } from "react";
import { AppState } from "react-native";
import { StepsStore_syncHealth } from "./stepsStore";

function sync(): void {
  StepsStore_syncHealth().catch(() => undefined);
}

export function useStepsHealthSync(isEnabled: boolean, isFocused: boolean): void {
  useEffect(() => {
    if (!isEnabled || !isFocused) {
      return undefined;
    }
    sync();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        sync();
      }
    });
    return () => subscription.remove();
  }, [isEnabled, isFocused]);
}
