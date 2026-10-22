import { JSX, ReactNode } from "react";
import { Platform, StyleProp, StyleSheet, TurboModuleRegistry, View, ViewStyle } from "react-native";
import { BlurView } from "@react-native-community/blur";
import type * as LiquidGlass from "@callstack/liquid-glass";
import { GlassSurface_lensColor, GlassSurface_pick } from "../../models/glassSurface";
import { Tailwind_isDark } from "../../utils/tailwindConfig";

interface IGlassBarProps {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: "tablist";
}

// The library's index throws on import when the binary has no NativeLiquidGlassModule, which is any
// build made before `pod install`. Those builds keep the BlurView.
const liquidGlass: typeof LiquidGlass | undefined =
  Platform.OS === "ios" && TurboModuleRegistry.get("NativeLiquidGlassModule") != null
    ? // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require("@callstack/liquid-glass") as typeof LiquidGlass)
    : undefined;
// The package types this as the `false` its non-iOS file exports; the iOS file reads the device.
const hasLiquidGlass: boolean = liquidGlass?.isLiquidGlassSupported ?? false;

function pickSurface(): ReturnType<typeof GlassSurface_pick> {
  return GlassSurface_pick(Platform.OS, Tailwind_isDark(), hasLiquidGlass);
}

export function GlassBar(props: IGlassBarProps): JSX.Element {
  const surface = pickSurface();
  if (surface.kind === "liquidGlass" && liquidGlass != null) {
    const { LiquidGlassView } = liquidGlass;
    return (
      <View
        className={`rounded-full ${props.className ?? ""}`}
        style={props.style}
        accessibilityRole={props.accessibilityRole}
      >
        <LiquidGlassView
          style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
          effect="regular"
          colorScheme={surface.colorScheme}
        />
        {props.children}
      </View>
    );
  }
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

export function GlassTabLens(): JSX.Element {
  const isDark = Tailwind_isDark();
  return (
    <View
      pointerEvents="none"
      className="absolute rounded-full"
      style={{
        top: 5,
        bottom: 5,
        left: 3,
        right: 3,
        backgroundColor: GlassSurface_lensColor(pickSurface(), isDark),
      }}
    />
  );
}
