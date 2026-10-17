import { JSX, useContext, useEffect } from "react";
import { View } from "react-native";
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { NavigationState } from "@react-navigation/native";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
import { buildNavCommon } from "../utils";
import { Footer2View } from "../../components/footer2";
import type { IScreen, ITab } from "../../models/screen";
import { Progress_isCurrent } from "../../models/progress";
import type { IState } from "../../models/state";

const screensWithoutFooter: string[] = ["subscription", "onerms"];

interface ITopRoute {
  screen: IScreen | undefined;
  params: { id?: number } | undefined;
}

function getTopRouteOfActiveTab(tabState: BottomTabBarProps["state"]): ITopRoute {
  const activeTab = tabState.routes[tabState.index];
  const tabStackState = activeTab.state as NavigationState | undefined;
  if (!tabStackState) {
    return { screen: undefined, params: undefined };
  }
  const topRoute = tabStackState.routes[tabStackState.index ?? 0];
  return { screen: topRoute.name as IScreen, params: topRoute.params as { id?: number } | undefined };
}

// Mirrors NavScreenProgress: id 0 (or absent) is the live, ongoing workout, and that's the
// one moment the tab bar gets out of the way - every stat and nav target below it is a
// distraction from the set in front of you. Reviewing a past workout through the same
// "progress" screen keeps the footer, since that's browsing, not training.
function isLiveWorkoutScreen(state: IState, topRoute: ITopRoute): boolean {
  if (topRoute.screen !== "progress") {
    return false;
  }
  const progressId = topRoute.params?.id ?? 0;
  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  return progress != null && Progress_isCurrent(progress);
}

export function Footer2Wrapper(props: BottomTabBarProps): JSX.Element | null {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  // BottomTabView only learns the tab bar's height if the bar reports it; with a custom
  // tabBar that never does, BottomTabBarHeightContext keeps react-navigation's estimate for
  // the *default* bar, which is shorter than this footer. Anything positioning against the
  // tab bar — the editor dock — reads that value, so report the measured height instead.
  const setTabBarHeight = useContext(BottomTabBarHeightCallbackContext);
  const topRoute = getTopRouteOfActiveTab(props.state);
  const isHidden =
    (topRoute.screen != null && screensWithoutFooter.includes(topRoute.screen)) || isLiveWorkoutScreen(state, topRoute);
  useEffect(() => {
    if (isHidden) {
      setTabBarHeight?.(0);
    }
  }, [isHidden, setTabBarHeight]);
  if (isHidden) {
    return null;
  }
  const currentTab = props.state.routes[props.state.index].name as ITab;
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View onLayout={(e) => setTabBarHeight?.(e.nativeEvent.layout.height)}>
      <Footer2View dispatch={dispatch} navCommon={navCommon} currentTab={currentTab} />
    </View>
  );
}
