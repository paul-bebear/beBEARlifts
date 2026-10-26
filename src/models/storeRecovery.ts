export type IStoreRecoveryChoice = "restore" | "reset" | "later";

export interface IStoreRecoveryPrompt {
  title: string;
  message: string;
  options: string[];
  choices: IStoreRecoveryChoice[];
}

export const StoreRecovery_readError = "Could not read saved data";

export function StoreRecovery_prompt(key: string, signedIn: boolean): IStoreRecoveryPrompt {
  const message =
    `The saved data in ${key} is damaged, so nothing new can be saved there. ` +
    `A copy of it is kept as ${key}_unreadable.`;
  const restore = { option: "Restore from cloud", choice: "restore" as const };
  const reset = { option: "Start this log again", choice: "reset" as const };
  const later = { option: "Not now", choice: "later" as const };
  // Dialog_choice on the web has only OK and Cancel, so two rows is the most both platforms can show.
  const rows = signedIn ? [restore, reset] : [reset, later];
  return {
    title: StoreRecovery_readError,
    message,
    options: rows.map((r) => r.option),
    choices: rows.map((r) => r.choice),
  };
}

export function StoreRecovery_choice(prompt: IStoreRecoveryPrompt, index: number | undefined): IStoreRecoveryChoice {
  return (index != null ? prompt.choices[index] : undefined) ?? "later";
}
