import { JSX, useContext, useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { NavigationState } from "@react-navigation/native";
import { useTrackedState } from "../TrackedStateContext";
import { Footer2View } from "../../components/footer2";
import { TabBarLayout_compute, TabBarLayout_showsPlus } from "../../models/tabBarLayout";
import type { IScreen } from "../../models/screen";

function getTopScreenOfActiveTab(tabState: BottomTabBarProps["state"]): IScreen | undefined {
  const activeTab = tabState.routes[tabState.index];
  const tabStackState = activeTab.state as NavigationState | undefined;
  if (!tabStackState) {
    return undefined;
  }
  return tabStackState.routes[tabStackState.index ?? 0].name as IScreen;
}

function getActiveTab(tabState: BottomTabBarProps["state"]): string {
  return tabState.routes[tabState.index].name;
}

export function Footer2Wrapper(props: BottomTabBarProps): JSX.Element | null {
  // The bar reads its colours from Tailwind_semantic, so it repaints only when it subscribes to both switches.
  const settings = useTrackedState().storage.settings;
  // eslint-disable-next-line no-void
  void settings.theme;
  // eslint-disable-next-line no-void
  void settings.monochrome;
  // BottomTabView only learns the tab bar's height if the bar reports it; with a custom tabBar that
  // never does, BottomTabBarHeightContext keeps react-navigation's estimate for the default bar.
  // Screens pad their content and lift their footers by this value, so report the floating bar's.
  const setTabBarHeight = useContext(BottomTabBarHeightCallbackContext);
  const layout = TabBarLayout_compute(useSafeAreaInsets().bottom);
  const isHidden = !TabBarLayout_showsPlus(getActiveTab(props.state), getTopScreenOfActiveTab(props.state));
  const reportedHeight = isHidden ? 0 : layout.height;
  useEffect(() => {
    setTabBarHeight?.(reportedHeight);
  }, [reportedHeight, setTabBarHeight]);
  if (isHidden) {
    return null;
  }
  return (
    <View className="absolute bottom-0 left-0 right-0" pointerEvents="box-none">
      <Footer2View layout={layout} />
    </View>
  );
}
