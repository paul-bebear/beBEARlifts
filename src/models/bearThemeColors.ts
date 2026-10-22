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

const monoLight: IBearThemeOverrides = {
  button: { primarybackground: "#000000", primarylabel: "#FFFFFF" },
  menu: { buttonprimary: "#000000", iconactive: "#000000", labelactive: "#000000" },
  icon: { purple: "#000000" },
  text: { purple: "#000000", link: "#000000" },
};

const monoDark: IBearThemeOverrides = {
  button: { primarybackground: "#3A3A3C", primarylabel: "#FFFFFF" },
  menu: { buttonprimary: "#3A3A3C", iconactive: "#FFFFFF", labelactive: "#FFFFFF" },
  icon: { purple: "#FFFFFF" },
  text: { purple: "#FFFFFF", link: "#FFFFFF" },
};

function merge(base: IBearThemeOverrides, top: IBearThemeOverrides): IBearThemeOverrides {
  const result: IBearThemeOverrides = { ...base };
  for (const category of Object.keys(top)) {
    result[category] = { ...base[category], ...top[category] };
  }
  return result;
}

export function BearThemeColors_overrides(theme: "light" | "dark", isMonochrome: boolean = false): IBearThemeOverrides {
  const bear = theme === "dark" ? dark : light;
  if (!isMonochrome) {
    return bear;
  }
  return merge(bear, theme === "dark" ? monoDark : monoLight);
}

export function BearThemeColors_monoOverrides(theme: "light" | "dark"): IBearThemeOverrides {
  return theme === "dark" ? monoDark : monoLight;
}

export function BearThemeColors_apply<T extends object>(
  semantic: T,
  theme: "light" | "dark",
  isMonochrome: boolean = false
): T {
  return merge(
    semantic as unknown as IBearThemeOverrides,
    BearThemeColors_overrides(theme, isMonochrome)
  ) as unknown as T;
}

export function BearThemeColors_cssVars(
  theme: "light" | "dark",
  isMonochrome: boolean = false
): Record<string, string> {
  const overrides = BearThemeColors_overrides(theme, isMonochrome);
  const vars: Record<string, string> = {};
  for (const category of Object.keys(overrides)) {
    for (const name of Object.keys(overrides[category])) {
      vars[`--color-${category}-${name}`] = overrides[category][name];
    }
  }
  return vars;
}
