import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { WarmupSkip_isAlreadyWarm } from "../src/models/warmupSkip";
import { IExerciseType } from "../src/types";

const hammerCurl: IExerciseType = { id: "hammerCurl", equipment: "dumbbell" };
const tBarRow: IExerciseType = { id: "tBarRow", equipment: "barbell" };
const squat: IExerciseType = { id: "squat", equipment: "barbell" };
const deadlift: IExerciseType = { id: "deadlift", equipment: "barbell" };

describe("WarmupSkip", () => {
  const settings = Settings_build();

  it("skips the ramp on a curl after rows already worked the forearm flexors", () => {
    expect(WarmupSkip_isAlreadyWarm(hammerCurl, [tBarRow], settings)).to.equal(true);
  });

  it("keeps the ramp when the curl comes first or after unrelated work", () => {
    expect(WarmupSkip_isAlreadyWarm(hammerCurl, [], settings)).to.equal(false);
    expect(WarmupSkip_isAlreadyWarm(hammerCurl, [squat], settings)).to.equal(false);
  });

  it("keeps the ramp on a heavy barbell lift even after same-muscle work", () => {
    expect(WarmupSkip_isAlreadyWarm(deadlift, [squat], settings)).to.equal(false);
  });
});
