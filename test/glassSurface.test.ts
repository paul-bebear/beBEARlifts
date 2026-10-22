import "mocha";
import { expect } from "chai";
import { GlassSurface_lensColor, GlassSurface_pick } from "../src/models/glassSurface";

describe("GlassSurface", () => {
  it("uses the system Liquid Glass on iOS 26 in the app's theme", () => {
    expect(GlassSurface_pick("ios", false, true)).to.include({ kind: "liquidGlass", colorScheme: "light" });
    expect(GlassSurface_pick("ios", true, true)).to.include({ kind: "liquidGlass", colorScheme: "dark" });
  });

  it("blurs below iOS 26 with the material that matches the theme", () => {
    expect(GlassSurface_pick("ios", false)).to.include({ kind: "blur", blurType: "chromeMaterialLight" });
    expect(GlassSurface_pick("ios", true)).to.include({ kind: "blur", blurType: "chromeMaterialDark" });
  });

  it("gives the blur an opaque colour for Reduce Transparency", () => {
    expect(GlassSurface_pick("ios", false)).to.include({ fallbackColor: "#FFFFFF" });
    expect(GlassSurface_pick("ios", true)).to.include({ fallbackColor: "#1C1C1E" });
  });

  it("uses a solid bar on Android even when asked for Liquid Glass", () => {
    expect(GlassSurface_pick("android", false, true)).to.deep.equal({
      kind: "solid",
      backgroundColor: "#FFFFFF",
      borderColor: "rgba(0,0,0,0.08)",
    });
    expect(GlassSurface_pick("android", true)).to.include({ kind: "solid", backgroundColor: "#1C1C1E" });
  });

  it("keeps the active-tab lens visible on a solid bar", () => {
    const solid = GlassSurface_pick("android", false);
    const glass = GlassSurface_pick("ios", false, true);
    expect(GlassSurface_lensColor(solid, false)).to.not.equal(solid.kind === "solid" ? solid.backgroundColor : "");
    expect(GlassSurface_lensColor(glass, false)).to.equal("rgba(255,255,255,0.75)");
    expect(GlassSurface_lensColor(glass, true)).to.equal("rgba(255,255,255,0.14)");
  });
});
