import { JSX, ReactNode } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { GlassSurface_pick } from "../../models/glassSurface";
import { Tailwind_isDark } from "../../utils/tailwindConfig";

interface IGlassBarProps {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: "tablist";
}

export function GlassBar(props: IGlassBarProps): JSX.Element {
  const surface = GlassSurface_pick(Platform.OS, Tailwind_isDark());
  const background = surface.kind === "solid" ? surface.backgroundColor : "transparent";
  return (
    <View
      className={`overflow-hidden rounded-full ${props.className ?? ""}`}
      style={[{ backgroundColor: background, borderWidth: 0.5, borderColor: surface.borderColor }, props.style]}
      accessibilityRole={props.accessibilityRole}
    >
      {surface.kind === "blur" ? (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={surface.blurType}
          reducedTransparencyFallbackColor={surface.fallbackColor}
        />
      ) : null}
      {props.children}
    </View>
  );
}
