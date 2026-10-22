export type IGlassBlurType = "chromeMaterialLight" | "chromeMaterialDark";

export type IGlassSurface =
  | { kind: "blur"; blurType: IGlassBlurType; fallbackColor: string; borderColor: string }
  | { kind: "solid"; backgroundColor: string; borderColor: string };

const solidColor = { light: "#FFFFFF", dark: "#1C1C1E" };
const borderColor = { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.12)" };

// On Android @react-native-community/blur 4.4 draws the whole view hierarchy into a bitmap on every
// frame, so the bar stays solid there.
export function GlassSurface_pick(platform: string, isDark: boolean): IGlassSurface {
  const mode = isDark ? "dark" : "light";
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
