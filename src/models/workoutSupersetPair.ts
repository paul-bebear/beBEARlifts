import { IHistoryEntry } from "../types";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function WorkoutSupersetPair_newName(entries: IHistoryEntry[]): string {
  const used = new Set(entries.map((e) => e.superset).filter((name): name is string => name != null));
  const free = letters.split("").find((letter) => !used.has(letter));
  if (free != null) {
    return free;
  }
  let n = 1;
  while (used.has(`Superset ${n}`)) {
    n += 1;
  }
  return `Superset ${n}`;
}

// The two exercises share one group: the partner's group if it has one, then the entry's own,
// else a new one named by the first free letter.
export function WorkoutSupersetPair_join(
  entries: IHistoryEntry[],
  entryId: string,
  partnerId: string
): IHistoryEntry[] {
  const entry = entries.find((e) => e.id === entryId);
  const partner = entries.find((e) => e.id === partnerId);
  if (entry == null || partner == null || entryId === partnerId) {
    return entries;
  }
  const group = partner.superset ?? entry.superset ?? WorkoutSupersetPair_newName(entries);
  if (entry.superset === group && partner.superset === group) {
    return entries;
  }
  return entries.map((e) => (e.id === entryId || e.id === partnerId ? { ...e, superset: group } : e));
}

export function WorkoutSupersetPair_isPaired(entry: IHistoryEntry, other: IHistoryEntry): boolean {
  return entry.superset != null && entry.superset === other.superset;
}
