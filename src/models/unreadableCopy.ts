// The prefix must not start with "liftosaur_": Persistence.getAccountSummaries reads every such key as an account.
const PREFIX = "bebear_unreadable_";

export const UnreadableCopy_maxCopies = 3;

export function UnreadableCopy_key(now: number): string {
  return `${PREFIX}${now}`;
}

export function UnreadableCopy_keep(existingKeys: string[], now: number): { key: string; remove: string[] } {
  const oldCopies = existingKeys
    .filter((key) => key.startsWith(PREFIX))
    .sort((a, b) => Number(b.slice(PREFIX.length)) - Number(a.slice(PREFIX.length)));
  return { key: UnreadableCopy_key(now), remove: oldCopies.slice(UnreadableCopy_maxCopies - 1) };
}

export interface IUnreadableCopyScreen {
  canSave: boolean;
  filename: string;
  resetText: string;
}

export function UnreadableCopy_screen(corrupted: { local: boolean; copyKey?: string }): IUnreadableCopyScreen {
  if (!corrupted.local) {
    return {
      canSave: false,
      filename: "",
      resetText: "We will log out for now, and won't sync the changes to the cloud, to avoid even bigger mess.",
    };
  }
  if (corrupted.copyKey == null) {
    return {
      canSave: false,
      filename: "",
      resetText:
        "You can either wait until this is fixed (and close the app for now), or start with the empty state (but your history and programs will be gone).",
    };
  }
  return {
    canSave: true,
    filename: `${corrupted.copyKey}.json`,
    resetText:
      'Tap "Save the damaged data" and keep the file in Files or iCloud Drive. Then you can start with the empty state. The copy also stays on this phone, so your history can still be repaired.',
  };
}
