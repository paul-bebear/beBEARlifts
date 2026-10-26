import { JSX } from "react";
import { View, Platform, Pressable } from "react-native";
import { ITabBarLayout } from "../models/tabBarLayout";
import { IconPlus2 } from "./icons/iconPlus2";
import { Tailwind_semantic, Tailwind_isDark } from "../utils/tailwindConfig";
import { navigateToModal } from "../navigation/navigationService";

interface IFooterProps {
  layout: ITabBarLayout;
}

function getNativeShadowStyle(): Record<string, unknown> {
  const shadowColor = Tailwind_isDark() ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.22)";
  return {
    boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 16, spreadDistance: -4, color: shadowColor }],
  };
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const semantic = Tailwind_semantic();
  const { layout } = props;
  return (
    <View className="w-full" pointerEvents="box-none" style={{ paddingBottom: layout.bottomGap }}>
      <View className="flex-row items-center justify-end px-4" pointerEvents="box-none">
        <Pressable
          data-testid="footer-plus"
          testID="footer-plus"
          accessibilityRole="button"
          accessibilityLabel="Add"
          className="items-center justify-center rounded-full glass-plus"
          style={[
            Platform.OS === "web" ? undefined : getNativeShadowStyle(),
            {
              width: layout.pillHeight,
              height: layout.pillHeight,
              backgroundColor: semantic.button.primarybackground,
            },
          ]}
          onPress={() => navigateToModal("plusSheetModal")}
        >
          <IconPlus2 size={20} color={semantic.button.primarylabel} />
        </Pressable>
      </View>
    </View>
  );
}
