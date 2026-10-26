import { Screen_tab } from "./screen";
import type { IScreen, ITab } from "./screen";

export interface ITabRoute {
  name: IScreen;
  params?: object;
}

const programScreens: IScreen[] = ["programs", "editProgram", "programPreview", "onerms", "programselect"];

export function TabRouting_isProgramScreen(screen: IScreen): boolean {
  return programScreens.includes(screen);
}

export function TabRouting_programTab(offline: boolean): ITab {
  return offline ? "graphs" : "program";
}

export function TabRouting_shouldReset(
  screen: IScreen,
  preferredTab: ITab | undefined,
  isOnboarding: boolean,
  offline: boolean
): boolean {
  return preferredTab != null || (offline && isOnboarding && TabRouting_isProgramScreen(screen));
}

export function TabRouting_tabForScreen(screen: IScreen, preferredTab: ITab | undefined, offline: boolean): ITab {
  if (offline && TabRouting_isProgramScreen(screen)) {
    return "graphs";
  }
  return preferredTab ?? Screen_tab(screen);
}

// With no tab bar, the chevron at the root of any tab but home is the way home. The tab navigator's
// firstRoute back behaviour sends that goBack to the home tab.
export function TabRouting_showsBack(args: {
  hasStackBack: boolean;
  isTabRoot: boolean;
  routeName: string;
  hasLeftButtons: boolean;
}): boolean {
  return args.hasStackBack || (args.isTabRoot && args.routeName !== "main" && !args.hasLeftButtons);
}

export function TabRouting_resetRoutes(
  tab: ITab,
  screen: IScreen,
  params: object | undefined,
  offline: boolean
): ITabRoute[] {
  if (offline && tab === "graphs" && TabRouting_isProgramScreen(screen)) {
    return [{ name: "progressDashboard" }, { name: screen, params }];
  }
  if (tab === "food" && screen === "history") {
    return [{ name: "food" }, { name: screen, params }];
  }
  return [{ name: screen, params }];
}
