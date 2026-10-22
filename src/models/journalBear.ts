import { Bear_state, IBearSources, IBearState } from "./bear";

export interface IJournalBearInput {
  day: string;
  today: string;
  now: number;
  sources: IBearSources;
}

function endOfDay(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date + 1).getTime() - 1;
}

export function JournalBear_asOf(day: string, today: string, now: number): number {
  return day >= today ? now : endOfDay(day);
}

// celebratedLevel only grows, so today's value would lift an old day's bear to a level it had not reached.
export function JournalBear_sources(input: IJournalBearInput): IBearSources {
  if (input.day >= input.today || input.sources.bear == null) {
    return input.sources;
  }
  return { ...input.sources, bear: { ...input.sources.bear, celebratedLevel: 1 } };
}

export function JournalBear_state(input: IJournalBearInput): IBearState {
  return Bear_state(JournalBear_sources(input), JournalBear_asOf(input.day, input.today, input.now));
}
