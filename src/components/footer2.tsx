import { JSX } from "react";
import { View, Platform, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { ITab } from "../models/screen";
import { ITabBarLayout } from "../models/tabBarLayout";
import { IconHome } from "./icons/iconHome";
import { IconNotebook } from "./icons/iconNotebook";
import { IconPlus2 } from "./icons/iconPlus2";
import { BearMark } from "./shareCards/bearMark";
import { GlassBar, GlassTabLens } from "./primitives/glassBar";
import { Tailwind_semantic, Tailwind_isDark } from "../utils/tailwindConfig";
import { navigateToModal } from "../navigation/navigationService";

interface IFooterProps {
  dispatch: IDispatch;
  currentTab: ITab;
  layout: ITabBarLayout;
}

function getNativeShadowStyle(): Record<string, unknown> {
  const shadowColor = Tailwind_isDark() ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.22)";
  return {
    boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 16, spreadDistance: -4, color: shadowColor }],
  };
}

interface ITabButtonProps {
  name: string;
  text: string;
  isActive: boolean;
  icon: (color: string) => JSX.Element;
  onPress?: () => void;
}

function TabButton(props: ITabButtonProps): JSX.Element {
  const semantic = Tailwind_semantic();
  const iconColor = props.isActive ? semantic.menu.iconactive : semantic.icon.neutral;
  const labelColor = props.isActive ? semantic.menu.labelactive : semantic.icon.neutral;
  return (
    <Pressable
      className="items-center justify-center flex-1"
      data-testid={`footer-${props.name}`}
      testID={`footer-${props.name}`}
      accessibilityRole="tab"
      accessibilityLabel={props.text}
      accessibilityState={{ selected: props.isActive }}
      onPress={props.onPress}
    >
      {props.isActive ? <GlassTabLens /> : null}
      <View className="items-center justify-center w-scaled-6 h-scaled-6">{props.icon(iconColor)}</View>
      <Text numberOfLines={1} className="pt-0.5 text-xs font-semibold" style={{ color: labelColor }}>
        {props.text}
      </Text>
    </Pressable>
  );
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const semantic = Tailwind_semantic();
  const { currentTab, layout } = props;
  const isMyBear = currentTab === "graphs" || currentTab === "me";
  return (
    <View className="w-full" pointerEvents="box-none" style={{ paddingBottom: layout.bottomGap }}>
      <View
        className="absolute bottom-0 left-0 right-0 tab-bar-fade"
        pointerEvents="none"
        style={{ height: layout.bottomGap + layout.pillHeight / 2 }}
      />
      <View className="flex-row items-center px-4" style={{ gap: 12 }} pointerEvents="box-none">
        <GlassBar className="flex-row flex-1" style={{ height: layout.pillHeight }} accessibilityRole="tablist">
          <TabButton
            name="home"
            text="Home"
            isActive={currentTab === "home"}
            icon={(color) => <IconHome size={22} color={color} isSelected={currentTab === "home"} />}
            onPress={
              currentTab === "home"
                ? undefined
                : () => props.dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }))
            }
          />
          <TabButton
            name="journal"
            text="Journal"
            isActive={currentTab === "food"}
            icon={(color) => <IconNotebook size={22} color={color} />}
            onPress={
              currentTab === "food"
                ? undefined
                : () => props.dispatch(Thunk_pushScreen("food", undefined, { tab: "food" }))
            }
          />
          <TabButton
            name="my-bear"
            text="My bear"
            isActive={isMyBear}
            icon={(color) => <BearMark size={24} color={color} faceColor={semantic.background.default} />}
            onPress={() => props.dispatch(Thunk_pushScreen("progressDashboard", undefined, { tab: "graphs" }))}
          />
        </GlassBar>
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
