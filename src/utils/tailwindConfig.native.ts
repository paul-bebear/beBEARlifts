import { Uniwind } from "uniwind";
import baseColors from "../../tailwind.colors.json";
import semanticColors from "../../tailwind.semantic.generated.json";
import { BearThemeColors_apply, BearThemeColors_cssVars } from "../models/bearThemeColors";

type IBaseColors = typeof baseColors;
type ISemanticColors = typeof semanticColors;

const themes = ["light", "dark"] as const;

let isMonochrome = false;

function buildSemantic(mono: boolean): Record<"light" | "dark", ISemanticColors["light"]> {
  return {
    light: BearThemeColors_apply(semanticColors.light, "light", mono),
    dark: BearThemeColors_apply(semanticColors.dark, "dark", mono),
  };
}

const bearSemantic = buildSemantic(false);
const monoSemantic = buildSemantic(true);

// theme.generated.css carries upstream's purple; the bear values go on top at runtime, so both
// className colours and Tailwind_semantic() read src/models/bearThemeColors.ts.
export function Tailwind_applyBearTheme(monochrome: boolean): void {
  isMonochrome = monochrome;
  for (const theme of themes) {
    Uniwind.updateCSSVariables(theme, BearThemeColors_cssVars(theme, monochrome));
  }
}

Tailwind_applyBearTheme(false);

export function Tailwind_colors(): IBaseColors {
  return baseColors;
}

export function Tailwind_semantic(): ISemanticColors["light"] {
  const theme = Uniwind.currentTheme === "dark" ? "dark" : "light";
  return (isMonochrome ? monoSemantic : bearSemantic)[theme];
}

export function Tailwind_isDark(): boolean {
  return Uniwind.currentTheme === "dark";
}
