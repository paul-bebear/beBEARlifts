import "mocha";
import { expect } from "chai";
import { AppBrand_text } from "../src/models/appBrand";
import { LiftoscriptDocs_getMainDoc } from "../src/models/liftoscriptDocs";
import { WhatsNewParser_parseAll } from "../src/models/whatsnewParser";

describe("Visible app branding", () => {
  it("renames prose while preserving URLs and code identifiers", () => {
    const source =
      "Liftosaur and beBEARlifts use Liftoscript. https://example.com/@Liftosaur `Liftosaur` LiftosaurWatch";
    expect(AppBrand_text(source)).to.equal(
      "beBEAR and beBEAR use BearScript. https://example.com/@Liftosaur `Liftosaur` LiftosaurWatch"
    );
    expect(AppBrand_text("```js\nglobalThis.Liftosaur = LiftosaurWatch;\n```\nLiftosaur")).to.equal(
      "```js\nglobalThis.Liftosaur = LiftosaurWatch;\n```\nbeBEAR"
    );
  });

  it("renames the language in prose but not in code or inside longer names", () => {
    expect(AppBrand_text("Write Liftoscript. `Liftoscript` LiftoscriptSyntaxError")).to.equal(
      "Write BearScript. `Liftoscript` LiftoscriptSyntaxError"
    );
  });

  it("uses beBEAR when showing generated documentation and release notes", () => {
    expect(LiftoscriptDocs_getMainDoc()).to.include("in beBEAR app");
    const notes = WhatsNewParser_parseAll();
    expect(notes.length).to.be.greaterThan(0);
    expect(notes.some((n) => n.body.includes("use beBEAR effectively"))).to.equal(true);
  });
});
