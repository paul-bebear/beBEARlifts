import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { ITab } from "../models/screen";
import { IconHome } from "./icons/iconHome";
import { IconNotebook } from "./icons/iconNotebook";
import { IconPlus2 } from "./icons/iconPlus2";
import { BearMark } from "./shareCards/bearMark";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { GlassBar } from "./primitives/glassBar";
import { BearThemeColors_honey } from "../models/bearThemeColors";
import { Tailwind_semantic, Tailwind_colors } from "../utils/tailwindConfig";
import { navigateToModal } from "../navigation/navigationService";

interface IFooterProps {
  dispatch: IDispatch;
  currentTab: ITab;
}

const pillHeight = 60;

function getNativeShadowStyle(semantic: ReturnType<typeof Tailwind_semantic>): Record<string, unknown> {
  const colors = Tailwind_colors();
  const isDark = semantic.background.default === colors.black;
  const shadowColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.2)";
  return {
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 10, spreadDistance: 0, color: shadowColor }],
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
  const color = props.isActive ? BearThemeColors_honey : Tailwind_semantic().icon.neutral;
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
      <View className="items-center justify-center w-scaled-6 h-scaled-6">{props.icon(color)}</View>
      <Text numberOfLines={1} className="pt-0.5 text-xs font-semibold" style={{ color }}>
        {props.text}
      </Text>
    </Pressable>
  );
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const semantic = Tailwind_semantic();
  const currentTab = props.currentTab;
  const insets = useSafeAreaInsets();
  const shadow = getNativeShadowStyle(semantic);
  const isMyBear = currentTab === "graphs" || currentTab === "me";
  return (
    <View className="w-full bg-background-default" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      <View className="flex-row items-center px-4 pt-2" style={{ gap: 12 }}>
        <GlassBar className="flex-row flex-1" style={{ height: pillHeight }} accessibilityRole="tablist">
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
          className="items-center justify-center rounded-full"
          style={[shadow, { width: pillHeight, height: pillHeight, backgroundColor: BearThemeColors_honey }]}
          onPress={() => navigateToModal("plusSheetModal")}
        >
          <IconPlus2 size={20} color={T.greenDark} />
        </Pressable>
      </View>
    </View>
  );
}
