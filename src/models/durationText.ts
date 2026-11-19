export interface IDurationTextOptions {
  clampAtZero?: boolean;
}

export function DurationText_fromMs(durationMs: number, options: IDurationTextOptions = {}): string {
  const rounded = Math.round(durationMs / 60000);
  const minutes = options.clampAtZero === true ? Math.max(0, rounded) : rounded;
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
