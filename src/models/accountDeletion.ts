export const AccountDeletion_confirmWord = "DELETE";
export const AccountDeletion_signInMessage = "Sign in again, then delete the account.";
export const AccountDeletion_doneMessage = "Account deleted. Your workouts and settings are still on this phone.";

export type IAccountDeletionResult = { ok: true } | { ok: false; error: string };

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
  const error = (body as { error?: unknown } | undefined)?.error;
  return { ok: false, error: typeof error === "string" ? error : `The server returned ${status}.` };
}
