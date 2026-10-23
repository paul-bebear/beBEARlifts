export type IHomeTodayCard = "ongoing" | "next" | "welcome";

export function HomeToday_card(input: { hasProgress: boolean; historyCount: number }): IHomeTodayCard {
  if (input.hasProgress) {
    return "ongoing";
  }
  return input.historyCount === 0 ? "welcome" : "next";
}

export function HomeToday_historyLabel(historyCount: number): string | undefined {
  if (historyCount === 0) {
    return undefined;
  }
  return `History · ${historyCount} ${historyCount === 1 ? "workout" : "workouts"}`;
}
