import { FoodLog_dayTotals, FoodLog_entriesFor, IFoodLog } from "./foodLog";
import { FoodMicros_coreKeys, FoodMicros_saltPerSodium, FoodMicros_table, IMicroKey, IMicroUnit } from "./foodMicros";

export const FoodMicroTotals_warning =
  "Estimate only. Many foods have no micro data, so your real totals are likely higher.";
export const FoodMicroTotals_emptyToday = "No micro data for today's food yet. Barcodes and the AI fill it in.";
export const FoodMicroTotals_emptyOtherDay = "No micro data for this day's food yet. Barcodes and the AI fill it in.";
export const FoodMicroTotals_visibleRows = 8;
export const FoodMicroTotals_noValueText = "–";

export interface IMicroTotalRow {
  key: IMicroKey;
  label: string;
  amount?: number;
  unit: IMicroUnit;
  foodsWithValue: number;
  foods: number;
  valueText: string;
  coverageText: string;
}

export interface IMicroTotals {
  rows: IMicroTotalRow[];
  foods: number;
  hasData: boolean;
  emptyText?: string;
  warning?: string;
}

function trimmed(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  return `${Math.round(value * factor) / factor}`;
}

function amountText(value: number, unit: IMicroUnit): string {
  if (unit === "g") {
    return `${trimmed(value, 1)} g`;
  }
  return `${trimmed(value, value >= 10 ? 0 : 1)} ${unit}`;
}

function valueText(key: IMicroKey, amount: number | undefined, unit: IMicroUnit): string {
  if (amount == null) {
    return FoodMicroTotals_noValueText;
  }
  return key === "sodium" ? amountText((amount * FoodMicros_saltPerSodium) / 1000, "g") : amountText(amount, unit);
}

function coverageText(withValue: number, foods: number): string {
  return `${withValue} of ${foods} ${foods === 1 ? "food" : "foods"}`;
}

export function FoodMicroTotals_forDay(log: IFoodLog, day: string, today: string = day): IMicroTotals {
  const entries = FoodLog_entriesFor(log, day);
  const totals = FoodLog_dayTotals(log, day).micros;
  const rows: IMicroTotalRow[] = [];
  for (const row of FoodMicros_table) {
    const withValue = entries.filter((entry) => entry.nutrients.micros?.[row.key] != null).length;
    if (withValue === 0 && !FoodMicros_coreKeys.includes(row.key)) {
      continue;
    }
    const amount = withValue > 0 ? totals?.[row.key] : undefined;
    rows.push({
      key: row.key,
      label: row.key === "sodium" ? "Salt" : row.label,
      amount,
      unit: row.unit,
      foodsWithValue: withValue,
      foods: entries.length,
      valueText: valueText(row.key, amount, row.unit),
      coverageText: coverageText(withValue, entries.length),
    });
  }
  const hasData = rows.some((row) => row.foodsWithValue > 0);
  return {
    rows,
    foods: entries.length,
    hasData,
    emptyText: hasData ? undefined : day === today ? FoodMicroTotals_emptyToday : FoodMicroTotals_emptyOtherDay,
    warning: entries.length > 0 ? FoodMicroTotals_warning : undefined,
  };
}
