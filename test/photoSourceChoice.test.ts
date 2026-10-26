import "mocha";
import { expect } from "chai";
import { PhotoSourceChoice_for } from "../src/models/photoSourceChoice";

describe("PhotoSourceChoice_for", () => {
  it("opens the browser picker straight away on web", () => {
    expect(PhotoSourceChoice_for("web")).to.eql({ kind: "direct", source: "photo-library" });
  });

  it("offers Camera and Library on iOS and Android", () => {
    for (const platform of ["ios", "android"]) {
      expect(PhotoSourceChoice_for(platform)).to.eql({
        kind: "menu",
        options: [
          { source: "camera", label: "Take photo" },
          { source: "photo-library", label: "Choose from library" },
        ],
      });
    }
  });
});
