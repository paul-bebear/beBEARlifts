export const FoodSummaryPages_labels: readonly string[] = ["Macros", "Micros"];

export function FoodSummaryPages_indexAt(
  offset: number,
  width: number,
  count: number = FoodSummaryPages_labels.length
): number {
  if (!(width > 0) || !Number.isFinite(offset)) {
    return 0;
  }
  return Math.max(0, Math.min(count - 1, Math.round(offset / width)));
}

export function FoodSummaryPages_offsetOf(index: number, width: number): number {
  return Math.max(0, index) * width;
}
