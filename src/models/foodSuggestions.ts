import { FoodLog_recentKey, FoodLog_toRecent, IFoodEntry, IFoodLog, IFoodMeal, IFoodRecent } from "./foodLog";

const windowMs = 60 * 24 * 60 * 60 * 1000;

// Foods logged most often at this meal in the last 60 days, then the general recents list.
export function FoodSuggestions_forMeal(
  log: IFoodLog,
  meal: IFoodMeal,
  now: number,
  limit: number = 15
): IFoodRecent[] {
  const groups = new Map<string, { count: number; latest: IFoodEntry }>();
  for (const entry of log.entries) {
    if (entry.meal !== meal || entry.createdAt < now - windowMs) {
      continue;
    }
    const key = FoodLog_recentKey(entry);
    const group = groups.get(key);
    if (group == null) {
      groups.set(key, { count: 1, latest: entry });
    } else {
      group.count += 1;
      if (entry.createdAt >= group.latest.createdAt) {
        group.latest = entry;
      }
    }
  }
  const frequent = [...groups.values()]
    .sort((a, b) => b.count - a.count || b.latest.createdAt - a.latest.createdAt)
    .map((g) => FoodLog_toRecent(g.latest));
  const seen = new Set(frequent.map(FoodLog_recentKey));
  const rest = log.recents.filter((r) => !seen.has(FoodLog_recentKey(r)));
  return [...frequent, ...rest].slice(0, limit);
}
