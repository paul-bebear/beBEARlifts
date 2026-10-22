import "mocha";
import { expect } from "chai";
import { OnboardingHistory_build, OnboardingHistory_summary } from "../src/models/onboardingHistory";
import { IHistoryRecord } from "../src/types";

function record(id: number, startTime: number): IHistoryRecord {
  return { id, startTime } as IHistoryRecord;
}

const mar1 = Date.UTC(2026, 2, 1, 12);
const apr20 = Date.UTC(2026, 3, 20, 12);

describe("Onboarding history", () => {
  it("drops workouts that start within a minute of one already in history and sorts the rest", () => {
    const history = OnboardingHistory_build([record(3, apr20), record(1, mar1), record(2, mar1 + 86_400_000)], {}, [
      record(9, mar1 + 86_400_000 + 30_000),
    ]);
    expect(history.records.map((r) => r.id)).to.deep.equal([1, 3]);
    expect(history.duplicates).to.equal(1);
    expect(OnboardingHistory_summary(history)).to.equal(
      "The AI read 2 workouts from Mar 1, 2026 to Apr 20, 2026. 1 more is already in your history."
    );
  });
  it("names one day and the all-duplicates case", () => {
    expect(OnboardingHistory_summary(OnboardingHistory_build([record(1, mar1)], {}, []))).to.equal(
      "The AI read 1 workout on Mar 1, 2026."
    );
    expect(OnboardingHistory_summary(OnboardingHistory_build([record(1, mar1)], {}, [record(2, mar1)]))).to.equal(
      "The workout the AI read is already in your history."
    );
  });
});
