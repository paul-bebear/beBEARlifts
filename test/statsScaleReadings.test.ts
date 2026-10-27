import "mocha";
import { expect } from "chai";
import { Stats_isPercentageKey, Stats_turnOnScaleReadings } from "../src/models/stats";
import { Settings_build } from "../src/models/settings";
import { migrations } from "../src/migrations/migrations";
import { IStorage } from "../src/types";

describe("Stats_turnOnScaleReadings", () => {
  it("turns on weight, body fat, water, bone and muscle for a new user", () => {
    expect(Settings_build().statsEnabled).to.deep.equal({
      weight: { weight: true },
      length: {},
      percentage: { bodyfat: true, water: true, bone: true, muscle: true },
    });
  });

  it("keeps a reading the user turned off and leaves lengths alone", () => {
    const enabled = Stats_turnOnScaleReadings({
      weight: { weight: true },
      length: { waist: true, neck: false },
      percentage: { bodyfat: false },
    });
    expect(enabled).to.deep.equal({
      weight: { weight: true },
      length: { waist: true, neck: false },
      percentage: { bodyfat: false, water: true, bone: true, muscle: true },
    });
  });

  it("migrates saved settings that only knew about body fat", () => {
    const storage = {
      settings: { statsEnabled: { weight: { weight: false }, length: {}, percentage: {} } },
    } as unknown as IStorage;
    const migrated = migrations["20261027120000_turn_on_scale_readings"](storage);
    expect(migrated.settings.statsEnabled).to.deep.equal({
      weight: { weight: false },
      length: {},
      percentage: { bodyfat: true, water: true, bone: true, muscle: true },
    });
    expect(storage.settings.statsEnabled.percentage).to.deep.equal({});
  });

  it("knows which stat keys are percentages", () => {
    expect(["bodyfat", "water", "bone", "muscle", "weight", "waist"].filter(Stats_isPercentageKey)).to.deep.equal([
      "bodyfat",
      "water",
      "bone",
      "muscle",
    ]);
  });
});
