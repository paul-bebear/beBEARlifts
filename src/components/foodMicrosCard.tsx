import { JSX } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "./primitives/text";
import { FoodMicroTotals_visibleRows, IMicroTotals, IMicroTotalRow } from "../models/foodMicroTotals";

const rowHeight = 48;

function MicroRow(props: { row: IMicroTotalRow }): JSX.Element {
  const { row } = props;
  return (
    <View
      className="flex-row items-center justify-between border-b border-border-neutral"
      style={{ height: rowHeight }}
      testID={`food-micro-${row.key}`}
      data-testid={`food-micro-${row.key}`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-base">{row.label}</Text>
        <Text className="text-xs text-text-secondary">{row.coverageText}</Text>
      </View>
      <Text className="text-base font-semibold">{row.valueText}</Text>
    </View>
  );
}

export function FoodMicrosCard(props: { totals: IMicroTotals }): JSX.Element {
  const { totals } = props;
  const scrolls = totals.rows.length > FoodMicroTotals_visibleRows;
  return (
    <View className="p-4 rounded-2xl bg-background-subtle" testID="food-micros" data-testid="food-micros">
      <Text className="mb-1 text-lg font-semibold">Micros</Text>
      {!totals.hasData && totals.emptyText != null ? (
        <Text className="py-3 text-base text-text-secondary" testID="food-micros-empty" data-testid="food-micros-empty">
          {totals.emptyText}
        </Text>
      ) : (
        <ScrollView
          nestedScrollEnabled={true}
          scrollEnabled={scrolls}
          style={scrolls ? { maxHeight: rowHeight * FoodMicroTotals_visibleRows } : undefined}
        >
          {totals.rows.map((row) => (
            <MicroRow key={row.key} row={row} />
          ))}
        </ScrollView>
      )}
      {totals.warning != null && (
        <Text
          className="mt-3 text-xs text-text-secondary"
          testID="food-micros-warning"
          data-testid="food-micros-warning"
        >
          {totals.warning}
        </Text>
      )}
    </View>
  );
}
