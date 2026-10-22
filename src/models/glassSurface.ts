export type IGlassBlurType = "chromeMaterialLight" | "chromeMaterialDark";

export type IGlassSurface =
  | { kind: "liquidGlass"; colorScheme: "light" | "dark"; borderColor: string }
  | { kind: "blur"; blurType: IGlassBlurType; fallbackColor: string; borderColor: string }
  | { kind: "solid"; backgroundColor: string; borderColor: string };

const solidColor = { light: "#FFFFFF", dark: "#1C1C1E" };
const borderColor = { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.14)" };
const lensColor = { light: "rgba(255,255,255,0.75)", dark: "rgba(255,255,255,0.14)" };
const solidLensColor = { light: "rgba(0,0,0,0.05)", dark: "rgba(255,255,255,0.1)" };

// On Android @react-native-community/blur 4.4 draws the whole view hierarchy into a bitmap on every
// frame, so the bar stays solid there.
export function GlassSurface_pick(platform: string, isDark: boolean, hasLiquidGlass: boolean = false): IGlassSurface {
  const mode = isDark ? "dark" : "light";
  if (platform === "ios" && hasLiquidGlass) {
    return { kind: "liquidGlass", colorScheme: mode, borderColor: "transparent" };
  }
  if (platform === "ios") {
    return {
      kind: "blur",
      blurType: isDark ? "chromeMaterialDark" : "chromeMaterialLight",
      fallbackColor: solidColor[mode],
      borderColor: borderColor[mode],
    };
  }
  return { kind: "solid", backgroundColor: solidColor[mode], borderColor: borderColor[mode] };
}

// A white lens vanishes on a solid white bar, so the solid bar gets a grey one.
export function GlassSurface_lensColor(surface: IGlassSurface, isDark: boolean): string {
  const mode = isDark ? "dark" : "light";
  return surface.kind === "solid" ? solidLensColor[mode] : lensColor[mode];
}
