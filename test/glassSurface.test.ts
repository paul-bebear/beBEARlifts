import "mocha";
import { expect } from "chai";
import { GlassSurface_pick } from "../src/models/glassSurface";

describe("GlassSurface", () => {
  it("blurs on iOS with the material that matches the theme", () => {
    expect(GlassSurface_pick("ios", false)).to.include({ kind: "blur", blurType: "chromeMaterialLight" });
    expect(GlassSurface_pick("ios", true)).to.include({ kind: "blur", blurType: "chromeMaterialDark" });
  });

  it("gives iOS an opaque colour for Reduce Transparency", () => {
    expect(GlassSurface_pick("ios", false)).to.include({ fallbackColor: "#FFFFFF" });
    expect(GlassSurface_pick("ios", true)).to.include({ fallbackColor: "#1C1C1E" });
  });

  it("uses a solid bar on Android", () => {
    expect(GlassSurface_pick("android", false)).to.deep.equal({
      kind: "solid",
      backgroundColor: "#FFFFFF",
      borderColor: "rgba(0,0,0,0.08)",
    });
    expect(GlassSurface_pick("android", true)).to.include({ kind: "solid", backgroundColor: "#1C1C1E" });
  });
});
