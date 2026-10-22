import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  BearThemeColors_apply,
  BearThemeColors_cssVars,
  BearThemeColors_honey,
  BearThemeColors_monoOverrides,
  BearThemeColors_overrides,
} from "../src/models/bearThemeColors";

type ISemantic = Record<string, Record<string, string>>;
const root = path.join(__dirname, "..");
const semanticColors: { light: ISemantic; dark: ISemantic } = JSON.parse(
  fs.readFileSync(path.join(root, "tailwind.semantic.generated.json"), "utf8")
);

function cssBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block in src/index.html`).to.be.greaterThan(-1);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

describe("BearThemeColors", () => {
  const html = fs.readFileSync(path.join(root, "src", "index.html"), "utf8");

  it("turns the primary button honey in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const result = BearThemeColors_apply(semanticColors[theme], theme);
      expect(result.button.primarybackground).to.equal(BearThemeColors_honey);
      expect(result.icon.purple).to.equal(BearThemeColors_honey);
    }
  });

  it("keeps every colour it does not override", () => {
    const result = BearThemeColors_apply(semanticColors.light, "light");
    expect(result.text.primary).to.equal(semanticColors.light.text.primary);
    expect(result.button.orangebackground).to.equal(semanticColors.light.button.orangebackground);
    expect(result.syntax).to.deep.equal(semanticColors.light.syntax);
  });

  it("does not change the generated colours it reads", () => {
    const before = semanticColors.light.button.primarybackground;
    BearThemeColors_apply(semanticColors.light, "light");
    expect(semanticColors.light.button.primarybackground).to.equal(before);
  });

  it("keeps the dark subtle background dark", () => {
    expect(BearThemeColors_overrides("dark").background.subtle).to.equal(semanticColors.dark.background.subtle);
    expect(BearThemeColors_overrides("light").background.subtle).to.equal("#FFF8EC");
  });

  it("overrides only colours that exist in the generated theme", () => {
    for (const theme of ["light", "dark"] as const) {
      const shape = semanticColors[theme];
      const overrides = BearThemeColors_overrides(theme);
      for (const category of Object.keys(overrides)) {
        for (const name of Object.keys(overrides[category])) {
          expect(shape[category][name], `${category}.${name}`).to.be.a("string");
        }
      }
    }
  });

  it("matches the html.bear variables in src/index.html", () => {
    const lightCss = cssBlock(html, "html.bear");
    const darkCss = cssBlock(html, "html.bear.dark");
    for (const [name, value] of Object.entries(BearThemeColors_cssVars("light"))) {
      expect(lightCss[name]?.toUpperCase(), name).to.equal(value.toUpperCase());
    }
    for (const [name, value] of Object.entries(BearThemeColors_cssVars("dark"))) {
      expect(darkCss[name]?.toUpperCase(), name).to.equal(value.toUpperCase());
    }
  });

  it("matches the html.mono variables in src/index.html", () => {
    const blocks = { light: cssBlock(html, "html.mono"), dark: cssBlock(html, "html.mono.dark") };
    for (const theme of ["light", "dark"] as const) {
      const vars = BearThemeColors_cssVars(theme, true);
      const monoNames = Object.keys(blocks[theme]).filter((name) => name.startsWith("--color-"));
      expect(monoNames.length, theme).to.be.greaterThan(0);
      for (const name of monoNames) {
        expect(vars[name]?.toUpperCase(), `${theme} ${name}`).to.equal(blocks[theme][name].toUpperCase());
      }
    }
  });

  it("lets Monochrome override only colours the bear theme sets", () => {
    for (const theme of ["light", "dark"] as const) {
      const bear = BearThemeColors_overrides(theme);
      const mono = BearThemeColors_monoOverrides(theme);
      for (const category of Object.keys(mono)) {
        for (const name of Object.keys(mono[category])) {
          expect(bear[category]?.[name], `${theme} ${category}.${name}`).to.be.a("string");
        }
      }
    }
  });

  it("turns honey back on when Monochrome is switched off", () => {
    expect(BearThemeColors_cssVars("light", true)["--color-button-primarybackground"]).to.equal("#000000");
    expect(BearThemeColors_cssVars("light", false)["--color-button-primarybackground"]).to.equal(BearThemeColors_honey);
    expect(BearThemeColors_apply(semanticColors.dark, "dark", true).text.link).to.equal("#FFFFFF");
    expect(BearThemeColors_apply(semanticColors.dark, "dark", true).background.subtle).to.equal("#0C0819");
  });

  it("sets the theme class on the html tag", () => {
    expect(html).to.match(/<html[^>]*class="[^"]*\bbear\b/);
  });
});
