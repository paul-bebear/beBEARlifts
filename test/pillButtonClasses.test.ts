import "mocha";
import { expect } from "chai";
import { PillButtonClasses_for, PillButtonClasses_isPill } from "../src/models/pillButtonClasses";

describe("PillButtonClasses", () => {
  it("knows the pill kinds and nothing else", () => {
    expect(PillButtonClasses_isPill("pill")).to.equal(true);
    expect(PillButtonClasses_isPill("pill-outline")).to.equal(true);
    expect(PillButtonClasses_isPill("pill-danger")).to.equal(true);
    expect(PillButtonClasses_isPill("purple")).to.equal(false);
    expect(PillButtonClasses_isPill("orange")).to.equal(false);
  });

  it("fills the primary pill with the theme colour and its label colour", () => {
    const classes = PillButtonClasses_for("pill", false);
    expect(classes.container).to.contain("rounded-full");
    expect(classes.container).to.contain("bg-button-primarybackground");
    expect(classes.text).to.contain("text-button-primarylabel");
    expect(classes.container).not.to.contain("opacity-40");
  });

  it("draws the outline and danger pills as borders", () => {
    expect(PillButtonClasses_for("pill-outline", false).container).to.contain("border-button-primarybackground");
    expect(PillButtonClasses_for("pill-outline", false).text).to.contain("text-text-link");
    expect(PillButtonClasses_for("pill-danger", false).container).to.contain("border-text-error");
    expect(PillButtonClasses_for("pill-danger", false).text).to.contain("text-text-error");
  });

  it("keeps the kind's colours and fades it when disabled", () => {
    const classes = PillButtonClasses_for("pill", true);
    expect(classes.container).to.contain("bg-button-primarybackground");
    expect(classes.container).to.contain("opacity-40");
  });

  it("uses 16 pt semibold text for every kind", () => {
    for (const kind of ["pill", "pill-outline", "pill-danger"] as const) {
      expect(PillButtonClasses_for(kind, false).text).to.contain("text-base font-semibold");
    }
  });
});
