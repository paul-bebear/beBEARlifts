import { IAccountPlanState } from "./accountPlan";
import { ApiRequest_errorText } from "../utils/apiRequest";

export const AccountDeletion_confirmWord = "DELETE";
export const AccountDeletion_signInMessage = "Sign in again, then delete the account.";
export const AccountDeletion_doneMessage = "Account deleted. Your workouts and settings are still on this phone.";

type IAccountDeletionResult = { ok: true } | { ok: false; error: string };

export function AccountDeletion_isConfirmed(text: string): boolean {
  return text.trim() === AccountDeletion_confirmWord;
}

export function AccountDeletion_result(status: number, body: unknown): IAccountDeletionResult {
  if (status === 200 && (body as { deleted?: unknown } | undefined)?.deleted === true) {
    return { ok: true };
  }
  if (status === 401) {
    return { ok: false, error: AccountDeletion_signInMessage };
  }
  return { ok: false, error: ApiRequest_errorText(status, body) };
}

export const AccountDeletion_subscriptionLine =
  "Your beBEAR+ subscription keeps renewing. Cancel it first in Settings → Apple ID → Subscriptions.";

export function AccountDeletion_subscriptionNote(
  plan: IAccountPlanState,
  userId: string | undefined
): string | undefined {
  return plan.status === "known" && plan.userId === userId && plan.plan === "plus" && plan.canManage
    ? AccountDeletion_subscriptionLine
    : undefined;
}
