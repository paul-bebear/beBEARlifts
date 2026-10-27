import { useEffect, useState } from "react";
import { useRoute } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import type { IRootStack } from "./navigationService";
import { ScreenUnderSheets_isShown } from "../models/screenUnderSheets";

const fullScreenRoots: readonly IRootStack[] = ["onboarding", "mainTabs", "subscription"];

// useIsFocused turns false under a form sheet, though the screen still shows around the sheet.
export function useIsShownUnderSheets(): boolean {
  const routeKey = useRoute().key;
  const read = (): boolean =>
    navigationRef.isReady() && ScreenUnderSheets_isShown(navigationRef.getRootState(), routeKey, fullScreenRoots);
  const [isShown, setIsShown] = useState(read);
  useEffect(() => {
    setIsShown(read());
    return navigationRef.addListener("state", () => setIsShown(read()));
  }, [routeKey]);
  return isShown;
}
