import "mocha";
import { expect } from "chai";
import { FeatureLayer_isFront, FeatureLayer_of, IFeature } from "../src/models/featureLayer";

describe("FeatureLayer", () => {
  it("puts only training, food, weight and the bear on the front", () => {
    const all: IFeature[] = [
      "workout",
      "food",
      "weight",
      "bear",
      "history",
      "program",
      "nutrition",
      "consistency",
      "graphs",
      "exerciseStats",
      "friends",
      "honey",
      "badges",
      "notes",
      "checkIn",
      "music",
      "runs",
      "reports",
      "measurements",
      "bodyScans",
      "steps",
      "photos",
      "seasons",
      "volume",
    ];
    expect(all.filter(FeatureLayer_isFront)).to.eql(["workout", "food", "weight", "bear"]);
  });

  it("keeps the details of the core one tap in", () => {
    expect(FeatureLayer_of("history")).to.equal(2);
    expect(FeatureLayer_of("nutrition")).to.equal(2);
  });

  it("puts friends, honey, badges and notes behind More", () => {
    expect(FeatureLayer_of("friends")).to.equal(3);
    expect(FeatureLayer_of("honey")).to.equal(3);
    expect(FeatureLayer_of("badges")).to.equal(3);
    expect(FeatureLayer_of("notes")).to.equal(3);
  });
});
