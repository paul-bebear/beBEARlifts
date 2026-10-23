export interface IExerciseDemoCacheFile {
  name: string;
  bytes: number;
  usedAt: number;
}

export interface IExerciseDemoCacheLimits {
  maxFiles: number;
  maxBytes: number;
}

// The 26 demos of the 5-day plan take 1.9 MB, so a full week of training stays cached with room to spare.
export const ExerciseDemoCache_limits: IExerciseDemoCacheLimits = { maxFiles: 40, maxBytes: 4_000_000 };

// Least recently used files go first. The demo on screen is never deleted, even when it alone breaks a limit.
export function ExerciseDemoCache_evictions(
  files: IExerciseDemoCacheFile[],
  inUse: string,
  limits: IExerciseDemoCacheLimits = ExerciseDemoCache_limits
): string[] {
  const byNewest = [...files].sort((a, b) => b.usedAt - a.usedAt || a.name.localeCompare(b.name));
  let count = 0;
  let bytes = 0;
  for (const file of byNewest) {
    if (file.name === inUse) {
      count += 1;
      bytes += file.bytes;
    }
  }
  const evicted: string[] = [];
  for (const file of byNewest) {
    if (file.name === inUse) {
      continue;
    }
    const fits = evicted.length === 0 && count + 1 <= limits.maxFiles && bytes + file.bytes <= limits.maxBytes;
    if (fits) {
      count += 1;
      bytes += file.bytes;
    } else {
      evicted.push(file.name);
    }
  }
  return evicted;
}

// The byte count changes when a demo is re-imported, so a phone never keeps showing the old file.
export function ExerciseDemoCache_fileName(key: string, bytes: number): string {
  return `${key}-${bytes}.webp`;
}
