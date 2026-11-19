import "mocha";
import { expect } from "chai";
import { PlanSyncRetry_delayMs, PlanSyncRetry_maxAttempts } from "../src/models/planSyncRetry";

describe("planSyncRetry", () => {
  const busy = { status: 429, retryAfter: "12", attempt: 0, activating: true };

  it("waits the Retry-After seconds when a purchase is activating", () => {
    expect(PlanSyncRetry_delayMs(busy)).to.equal(12000);
  });

  it("does not retry when no purchase is activating or the answer is not 429", () => {
    expect(PlanSyncRetry_delayMs({ ...busy, activating: false })).to.equal(undefined);
    expect(PlanSyncRetry_delayMs({ ...busy, status: 200 })).to.equal(undefined);
    expect(PlanSyncRetry_delayMs({ ...busy, status: 502 })).to.equal(undefined);
  });

  it("stops after the last attempt", () => {
    expect(PlanSyncRetry_delayMs({ ...busy, attempt: PlanSyncRetry_maxAttempts - 1 })).to.equal(12000);
    expect(PlanSyncRetry_delayMs({ ...busy, attempt: PlanSyncRetry_maxAttempts })).to.equal(undefined);
  });

  it("keeps the wait between 1 and 30 seconds, with 5 seconds for a missing or bad header", () => {
    expect(PlanSyncRetry_delayMs({ ...busy, retryAfter: "0" })).to.equal(1000);
    expect(PlanSyncRetry_delayMs({ ...busy, retryAfter: "600" })).to.equal(30000);
    expect(PlanSyncRetry_delayMs({ ...busy, retryAfter: null })).to.equal(5000);
    expect(PlanSyncRetry_delayMs({ ...busy, retryAfter: "soon" })).to.equal(5000);
  });
});
