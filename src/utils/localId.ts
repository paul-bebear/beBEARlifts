export function LocalId_new(now: number = Date.now(), random: () => number = Math.random): string {
  return `${now.toString(36)}${random().toString(36).slice(2, 8)}`;
}
