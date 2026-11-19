import { PlanSyncRetry_delayMs } from "../models/planSyncRetry";
import { ApiRequest_fetch } from "./apiRequest";

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function PlanSyncFetch_post(
  accessToken: string,
  isCurrent: () => boolean,
  isActivating: () => boolean
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await ApiRequest_fetch("/api/billing/sync", { method: "POST", token: accessToken });
    const delay = PlanSyncRetry_delayMs({
      status: response.status,
      retryAfter: response.headers.get("Retry-After"),
      attempt,
      activating: isActivating(),
    });
    if (delay == null || !isCurrent()) {
      return response;
    }
    await wait(delay);
    if (!isCurrent()) {
      return response;
    }
  }
}
