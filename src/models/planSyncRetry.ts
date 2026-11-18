export const PlanSyncRetry_maxAttempts = 3;

const minWaitSeconds = 1;
const maxWaitSeconds = 30;
const missingHeaderWaitSeconds = 5;

export interface IPlanSyncAnswer {
  status: number;
  retryAfter: string | null;
  attempt: number;
  activating: boolean;
}

// api/billing/sync.mjs answers 429 for 30 seconds after a sync that found no purchase. A purchase made in that time would otherwise stay "activating" until the app is reopened.
export function PlanSyncRetry_delayMs(answer: IPlanSyncAnswer): number | undefined {
  if (answer.status !== 429 || !answer.activating || answer.attempt >= PlanSyncRetry_maxAttempts) {
    return undefined;
  }
  const seconds = Number(answer.retryAfter);
  const wait =
    answer.retryAfter == null || answer.retryAfter.trim() === "" || !Number.isFinite(seconds)
      ? missingHeaderWaitSeconds
      : Math.min(maxWaitSeconds, Math.max(minWaitSeconds, Math.ceil(seconds)));
  return wait * 1000;
}
