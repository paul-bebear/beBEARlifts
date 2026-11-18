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
