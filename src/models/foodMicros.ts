export type IMicroUnit = "g" | "mg" | "µg";

export type IMicroKey =
  | "fiber"
  | "sugar"
  | "saturatedFat"
  | "sodium"
  | "potassium"
  | "calcium"
  | "iron"
  | "magnesium"
  | "zinc"
  | "phosphorus"
  | "cholesterol"
  | "vitaminA"
  | "vitaminC"
  | "vitaminD"
  | "vitaminE"
  | "vitaminK"
  | "thiamin"
  | "riboflavin"
  | "niacin"
  | "vitaminB6"
  | "folate"
  | "vitaminB12";

export type IMicros = Partial<Record<IMicroKey, number>>;

export interface IMicroRow {
  key: IMicroKey;
  label: string;
  unit: IMicroUnit;
  isCore: boolean;
  openFoodFacts: string;
  usda: string;
}

export const FoodMicros_table: readonly IMicroRow[] = [
  { key: "fiber", label: "Fiber", unit: "g", isCore: true, openFoodFacts: "fiber", usda: "291" },
  { key: "sugar", label: "Sugar", unit: "g", isCore: true, openFoodFacts: "sugars", usda: "269" },
  { key: "saturatedFat", label: "Saturated fat", unit: "g", isCore: true, openFoodFacts: "saturated-fat", usda: "606" },
  { key: "sodium", label: "Sodium", unit: "mg", isCore: true, openFoodFacts: "sodium", usda: "307" },
  { key: "potassium", label: "Potassium", unit: "mg", isCore: false, openFoodFacts: "potassium", usda: "306" },
  { key: "calcium", label: "Calcium", unit: "mg", isCore: false, openFoodFacts: "calcium", usda: "301" },
  { key: "iron", label: "Iron", unit: "mg", isCore: false, openFoodFacts: "iron", usda: "303" },
  { key: "magnesium", label: "Magnesium", unit: "mg", isCore: false, openFoodFacts: "magnesium", usda: "304" },
  { key: "zinc", label: "Zinc", unit: "mg", isCore: false, openFoodFacts: "zinc", usda: "309" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg", isCore: false, openFoodFacts: "phosphorus", usda: "305" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", isCore: false, openFoodFacts: "cholesterol", usda: "601" },
  { key: "vitaminA", label: "Vitamin A", unit: "µg", isCore: false, openFoodFacts: "vitamin-a", usda: "320" },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", isCore: false, openFoodFacts: "vitamin-c", usda: "401" },
  { key: "vitaminD", label: "Vitamin D", unit: "µg", isCore: false, openFoodFacts: "vitamin-d", usda: "328" },
  { key: "vitaminE", label: "Vitamin E", unit: "mg", isCore: false, openFoodFacts: "vitamin-e", usda: "323" },
  { key: "vitaminK", label: "Vitamin K", unit: "µg", isCore: false, openFoodFacts: "vitamin-k", usda: "430" },
  { key: "thiamin", label: "Thiamin", unit: "mg", isCore: false, openFoodFacts: "vitamin-b1", usda: "404" },
  { key: "riboflavin", label: "Riboflavin", unit: "mg", isCore: false, openFoodFacts: "vitamin-b2", usda: "405" },
  { key: "niacin", label: "Niacin", unit: "mg", isCore: false, openFoodFacts: "vitamin-pp", usda: "406" },
  { key: "vitaminB6", label: "Vitamin B6", unit: "mg", isCore: false, openFoodFacts: "vitamin-b6", usda: "415" },
  { key: "folate", label: "Folate", unit: "µg", isCore: false, openFoodFacts: "vitamin-b9", usda: "417" },
  { key: "vitaminB12", label: "Vitamin B12", unit: "µg", isCore: false, openFoodFacts: "vitamin-b12", usda: "418" },
];

export const FoodMicros_keys: readonly IMicroKey[] = FoodMicros_table.map((row) => row.key);

export const FoodMicros_coreKeys: readonly IMicroKey[] = FoodMicros_table.filter((row) => row.isCore).map(
  (row) => row.key
);

export function FoodMicros_row(key: IMicroKey): IMicroRow {
  return FoodMicros_table.find((row) => row.key === key)!;
}

export function FoodMicros_isKey(key: string): key is IMicroKey {
  return FoodMicros_keys.includes(key as IMicroKey);
}

export const FoodMicros_saltPerSodium = 2.5;

const unitPerGram: Record<IMicroUnit, number> = { g: 1, mg: 1000, µg: 1000000 };

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function FoodMicros_fromGrams(unit: IMicroUnit, grams: number): number {
  return round3(grams * unitPerGram[unit]);
}

export function FoodMicros_sodiumFromSalt(saltInUnit: number): number {
  return saltInUnit / FoodMicros_saltPerSodium;
}

function nonNegative(value: unknown): number | undefined {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && isFinite(n) && n >= 0 ? n : undefined;
}

export function FoodMicros_fromCoreFields(raw: Record<string, unknown>): IMicros | undefined {
  const fields: [IMicroKey, unknown][] = [
    ["fiber", raw.fiber],
    ["sugar", raw.sugar],
    ["saturatedFat", raw.saturatedFat],
    ["sodium", raw.sodiumMg],
  ];
  const micros: IMicros = {};
  for (const [key, value] of fields) {
    const n = nonNegative(value);
    if (n != null) {
      micros[key] = round3(n);
    }
  }
  return Object.keys(micros).length > 0 ? micros : undefined;
}
