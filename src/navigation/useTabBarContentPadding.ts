import { useContext } from "react";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { TabBarLayout_contentPadding } from "../models/tabBarLayout";

export function useTabBarContentPadding(): number {
  return TabBarLayout_contentPadding(useContext(BottomTabBarHeightContext) ?? 0);
}
