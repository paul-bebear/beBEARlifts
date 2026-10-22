export type IBearThemeOverrides = Record<string, Record<string, string>>;

export const BearThemeColors_honey = "#F5A524";

// Honey on white is 2:1, too faint for text, so light-mode text accents use yellow.700 instead.
const light: IBearThemeOverrides = {
  button: { primarybackground: BearThemeColors_honey, primarylabel: "#2B1700" },
  menu: {
    buttonprimary: BearThemeColors_honey,
    iconactive: BearThemeColors_honey,
    labelactive: "#B76506",
  },
  icon: { purple: BearThemeColors_honey },
  text: { purple: "#B76506", link: "#B76506" },
  background: { subtle: "#FFF8EC" },
};

const dark: IBearThemeOverrides = {
  button: { primarybackground: BearThemeColors_honey, primarylabel: "#2B1700" },
  menu: {
    buttonprimary: BearThemeColors_honey,
    iconactive: BearThemeColors_honey,
    labelactive: BearThemeColors_honey,
  },
  icon: { purple: BearThemeColors_honey },
  text: { purple: BearThemeColors_honey, link: "#FFD820" },
  background: { subtle: "#0C0819" },
};

export function BearThemeColors_overrides(theme: "light" | "dark"): IBearThemeOverrides {
  return theme === "dark" ? dark : light;
}

export function BearThemeColors_apply<T extends object>(semantic: T, theme: "light" | "dark"): T {
  const source = semantic as unknown as IBearThemeOverrides;
  const result: IBearThemeOverrides = { ...source };
  const overrides = BearThemeColors_overrides(theme);
  for (const category of Object.keys(overrides)) {
    result[category] = { ...source[category], ...overrides[category] };
  }
  return result as unknown as T;
}

export function BearThemeColors_cssVars(theme: "light" | "dark"): Record<string, string> {
  const overrides = BearThemeColors_overrides(theme);
  const vars: Record<string, string> = {};
  for (const category of Object.keys(overrides)) {
    for (const name of Object.keys(overrides[category])) {
      vars[`--color-${category}-${name}`] = overrides[category][name];
    }
  }
  return vars;
}
